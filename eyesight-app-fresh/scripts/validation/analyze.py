"""
ClearPath cohort validation analysis (Feasibility doc §8).

Inputs:
  - A directory of JSON files exported from the app (one per test session)
  - A CSV mapping recordId → subjectId, age, eye, clinical SE reference, etc.

Outputs (in --out directory):
  - bland_altman_apprx.png  — primary Bland-Altman plot (released AppRx)
  - bland_altman_raw.png    — secondary BA plot (raw v_FPMean, no DOF cal)
  - scatter_apprx.png       — system vs clinical scatter + OLS regression
  - scatter_raw.png         — same for raw v_FPMean
  - summary.json            — all metrics, compliance check, DOF fit recipe

Console output:
  - Primary metrics (MAE, bias, LoA, r) with 95% bootstrap CIs
  - Test-retest repeatability (1.96 · SD_within)
  - §9 compliance checks (4 targets)
  - DOF calibration recipe — α/β to load into the app's CalibrationModel
  - Subgroup analysis by SE stratum

Usage:
  python analyze.py <json_dir> <cohort_map.csv> [--out OUT_DIR] [--no-quality-filter]
"""

import argparse
import json
import os
from glob import glob

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')   # headless safe
import matplotlib.pyplot as plt
from scipy import stats


# Performance targets from Feasibility doc §9
TARGETS = {
    'mae_max_D':            0.40,   # ISO 10342
    'bias_max_abs_D':       0.25,   # ISO 10342
    'loa_max_abs_D':        1.00,   # ANSI Z80.1 clinical ceiling
    'repeatability_sd_max_D': 0.20, # ISO 10342
}


# ---------- Loading -----------------------------------------------------------

def _get_field(data, *paths):
    """Return the first matching dotted-path value, else None.

    The schema of the app's exportJSON output may evolve; this loader is
    permissive and tries common shapes.
    """
    for path in paths:
        cur = data
        ok = True
        for key in path.split('.'):
            if isinstance(cur, dict) and key in cur:
                cur = cur[key]
            else:
                ok = False
                break
        if ok and cur is not None:
            return cur
    return None


def load_cohort(json_dir, map_csv):
    """Load all JSON exports and join with cohort map on recordId."""
    json_files = sorted(glob(os.path.join(json_dir, '*.json')))
    if not json_files:
        raise FileNotFoundError(f'No JSON files in {json_dir}')

    records = []
    for fp in json_files:
        try:
            with open(fp, 'r') as f:
                data = json.load(f)
            r = {
                'recordId':         _get_field(data, 'recordId', 'metadata.recordId'),
                'eye':              _get_field(data, 'eye', 'finalResults.eye', 'metadata.eye'),
                'appRx':            _get_field(data, 'appRx', 'finalResults.appRx'),
                'sphericalRaw':     _get_field(data, 'sphericalRaw',
                                               'finalResults.sphericalRaw',
                                               'finalResults.spherical'),
                'vergenceMean':     _get_field(data, 'finalResults.vergenceMean', 'vergenceMean'),
                'vergenceStd':     _get_field(data, 'finalResults.vergenceStd', 'vergenceStd'),
                'vaThreshold':      _get_field(data, 'visualAcuity.logMAR',
                                               'visualAcuity.threshold',
                                               'vaThreshold'),
                'qualityScore':     _get_field(data, 'qualityScore', 'quality.score',
                                               'finalResults.qualityScore'),
                'qualityGrade':     _get_field(data, 'qualityGrade', 'quality.grade',
                                               'finalResults.qualityGrade'),
                'crossModalityFlag':_get_field(data, 'crossModalityFlag',
                                               'finalResults.crossModalityFlag') or 'none',
                'vaLowConfidence':  bool(_get_field(data, 'vaLowConfidence',
                                                   'finalResults.vaLowConfidence',
                                                   'visualAcuity.lowConfidence') or False),
                'ppi':              _get_field(data, 'ppi', 'metadata.ppi'),
            }
            records.append(r)
        except Exception as e:
            print(f'[skip] {os.path.basename(fp)}: {e}')

    if not records:
        raise RuntimeError('No valid records loaded')

    df_app = pd.DataFrame(records)
    df_map = pd.read_csv(map_csv)

    # Columns we look for on the map side
    required = {'recordId', 'subjectId', 'eye', 'clinicalSE'}
    missing = required - set(df_map.columns)
    if missing:
        raise ValueError(f'cohort_map.csv missing columns: {missing}')

    # Eye field may exist on both; prefer map-side for joins
    df = df_app.merge(df_map, on='recordId', how='inner', suffixes=('_app', ''))
    if df.empty:
        raise RuntimeError('No records matched between JSON exports and cohort map')
    return df


# ---------- Quality filtering -------------------------------------------------

def quality_filter(df, exclude_low_confidence=True, exclude_poor_grade=True):
    """Apply §7 quality gates. Print summary of exclusions."""
    n_before = len(df)
    reasons = {}

    if exclude_low_confidence:
        mask = df['vaLowConfidence'] == True
        if mask.any():
            reasons['vaLowConfidence'] = int(mask.sum())
            df = df[~mask]

    if exclude_poor_grade:
        mask = df['qualityGrade'].isin(['POOR', 'UNRELIABLE'])
        if mask.any():
            reasons['poorQualityGrade'] = int(mask.sum())
            df = df[~mask]

    mask = df['vergenceStd'].fillna(0) > 0.20
    if mask.any():
        reasons['vergenceStd>0.20'] = int(mask.sum())
        df = df[~mask]

    mask = df['crossModalityFlag'] == 'A'
    if mask.any():
        reasons['crossModalityCaseA'] = int(mask.sum())
        df = df[~mask]

    print(f'\n=== Quality filter ===')
    print(f'  Before: {n_before}, After: {len(df)}, Excluded: {n_before - len(df)}')
    for k, v in reasons.items():
        print(f'    {k}: {v}')
    return df


# ---------- Statistics --------------------------------------------------------

def cluster_bootstrap_ci(values, statistic_fn, subject_ids, n_iter=10000, ci=0.95, seed=42):
    """Bootstrap CI resampling clusters (subjects) — appropriate when both eyes
    of one subject are correlated.

    Returns (lo, hi).
    """
    rng = np.random.default_rng(seed)
    values = np.asarray(values)
    sids = np.asarray(subject_ids)
    unique = np.unique(sids)

    # Pre-index rows per subject for speed
    rows_per = {s: np.where(sids == s)[0] for s in unique}

    samples = np.empty(n_iter)
    for k in range(n_iter):
        picked = rng.choice(unique, size=len(unique), replace=True)
        idx = np.concatenate([rows_per[s] for s in picked])
        samples[k] = statistic_fn(values[idx])

    lo = float(np.percentile(samples, (1 - ci) / 2 * 100))
    hi = float(np.percentile(samples, (1 + ci) / 2 * 100))
    return lo, hi


def compute_metrics(df, x_col='appRx', y_col='clinicalSE'):
    """Bland-Altman + MAE + bias + Pearson r on a (filtered) frame."""
    x = df[x_col].astype(float).values
    y = df[y_col].astype(float).values
    delta = x - y
    n = len(delta)

    mean_delta = float(delta.mean())
    sd_delta   = float(delta.std(ddof=1)) if n > 1 else float('nan')
    loa_lo     = mean_delta - 1.96 * sd_delta
    loa_hi     = mean_delta + 1.96 * sd_delta
    mae        = float(np.abs(delta).mean())
    abs_bias   = abs(mean_delta)
    r, _       = stats.pearsonr(x, y) if n >= 3 else (float('nan'), None)

    sids = df['subjectId'].values if 'subjectId' in df.columns else None
    if sids is not None and n >= 3:
        mae_ci  = cluster_bootstrap_ci(delta, lambda d: float(np.abs(d).mean()), sids)
        bias_ci = cluster_bootstrap_ci(delta, lambda d: float(d.mean()),         sids)
    else:
        mae_ci, bias_ci = (None, None), (None, None)

    return {
        'n':              n,
        'mean_delta_D':   mean_delta,
        'sd_delta_D':     sd_delta,
        'loa_lo_D':       loa_lo,
        'loa_hi_D':       loa_hi,
        'mae_D':          mae,
        'mae_ci':         mae_ci,
        'abs_bias_D':     abs_bias,
        'bias_ci':        bias_ci,
        'pearson_r':      float(r),
    }


def repeatability_metrics(df, x_col='appRx'):
    """Test-retest within-subject SD per §9.

    Looks for (subjectId, eye) groups with ≥2 measurements and computes
    pooled within-subject SD.
    """
    if 'subjectId' not in df.columns or 'eye' not in df.columns:
        return {'n_repeated': 0, 'sd_within_D': None, 'repeatability_D': None}
    pooled_var = []
    n_groups = 0
    for (_sid, _eye), g in df.groupby(['subjectId', 'eye']):
        if len(g) >= 2:
            pooled_var.append(g[x_col].astype(float).var(ddof=1))
            n_groups += 1
    if not pooled_var:
        return {'n_repeated': 0, 'sd_within_D': None, 'repeatability_D': None}
    sd = float(np.sqrt(np.mean(pooled_var)))
    return {
        'n_repeated':       n_groups,
        'sd_within_D':      sd,
        'repeatability_D':  1.96 * sd,
    }


# ---------- DOF refit (§6.4) --------------------------------------------------

def fit_dof_calibration(df, x_col='sphericalRaw', y_col='clinicalSE', n_folds=5, seed=42):
    """Re-fit α, β by OLS on (raw v_FPMean → clinical SE), with k-fold CV.

    Returns dict suitable for loading into the app's CalibrationModel.
    """
    df = df.dropna(subset=[x_col, y_col])
    x = df[x_col].astype(float).values
    y = df[y_col].astype(float).values
    n = len(x)
    if n < 2:
        return {'alpha': 0.0, 'beta': 1.0, 'full_mae': None, 'cv_mae': None, 'n_samples': n,
                'note': 'insufficient data — returning identity'}

    beta, alpha = np.polyfit(x, y, deg=1)  # numpy returns highest-degree first
    full_mae = float(np.abs(alpha + beta * x - y).mean())

    cv_mae = None
    if n_folds > 1 and n >= n_folds:
        rng = np.random.default_rng(seed)
        idx = np.arange(n); rng.shuffle(idx)
        folds = np.array_split(idx, n_folds)
        errs = []
        for k in range(n_folds):
            test = folds[k]
            train = np.concatenate([folds[j] for j in range(n_folds) if j != k])
            b, a = np.polyfit(x[train], y[train], deg=1)
            errs.append(float(np.abs(a + b * x[test] - y[test]).mean()))
        cv_mae = float(np.mean(errs))

    return {
        'alpha':    float(alpha),
        'beta':     float(beta),
        'full_mae': full_mae,
        'cv_mae':   cv_mae,
        'n_samples': n,
    }


# ---------- Compliance --------------------------------------------------------

def compliance_check(metrics, repeatability):
    checks = {
        f'MAE ≤ {TARGETS["mae_max_D"]} D':
            metrics['mae_D'] <= TARGETS['mae_max_D'],
        f'|bias| ≤ {TARGETS["bias_max_abs_D"]} D':
            metrics['abs_bias_D'] <= TARGETS['bias_max_abs_D'],
        f'95% LoA within ±{TARGETS["loa_max_abs_D"]} D':
            (abs(metrics['loa_lo_D']) <= TARGETS['loa_max_abs_D']
             and abs(metrics['loa_hi_D']) <= TARGETS['loa_max_abs_D']),
    }
    if repeatability and repeatability['sd_within_D'] is not None:
        checks[f'Repeatability SD ≤ {TARGETS["repeatability_sd_max_D"]} D'] = (
            repeatability['sd_within_D'] <= TARGETS['repeatability_sd_max_D']
        )
    return checks


# ---------- Plots -------------------------------------------------------------

def plot_bland_altman(df, x_col, y_col, out_path, title_extra=''):
    x = df[x_col].astype(float).values
    y = df[y_col].astype(float).values
    mean = (x + y) / 2
    diff = x - y
    md = diff.mean()
    sd = diff.std(ddof=1) if len(diff) > 1 else 0.0

    fig, ax = plt.subplots(figsize=(8, 5.5))
    ax.scatter(mean, diff, alpha=0.55, edgecolors='black', linewidths=0.5, s=30)
    ax.axhline(md,             color='#dc2626', linestyle='-',  linewidth=1.5, label=f'Mean diff = {md:+.2f} D')
    ax.axhline(md + 1.96 * sd, color='#dc2626', linestyle='--', linewidth=1.0, label=f'+1.96·SD = {md + 1.96*sd:+.2f} D')
    ax.axhline(md - 1.96 * sd, color='#dc2626', linestyle='--', linewidth=1.0, label=f'-1.96·SD = {md - 1.96*sd:+.2f} D')
    ax.axhline(0, color='gray', linestyle=':', linewidth=0.8, alpha=0.7)
    ax.set_xlabel('Mean of System and Clinical (D)', fontsize=11)
    ax.set_ylabel('System − Clinical (D)', fontsize=11)
    ax.set_title(f'Bland-Altman: {x_col} vs {y_col}{title_extra}\nN = {len(x)}', fontsize=12)
    ax.legend(loc='best', framealpha=0.9, fontsize=9)
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(out_path, dpi=120)
    plt.close(fig)


def plot_scatter(df, x_col, y_col, out_path):
    x = df[x_col].astype(float).values
    y = df[y_col].astype(float).values

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.scatter(x, y, alpha=0.55, edgecolors='black', linewidths=0.5, s=30)

    lo = min(x.min(), y.min()) - 0.5
    hi = max(x.max(), y.max()) + 0.5
    ax.plot([lo, hi], [lo, hi], 'k--', linewidth=1.0, alpha=0.5, label='Identity (y = x)')

    if len(x) >= 2:
        beta, alpha = np.polyfit(x, y, 1)
        xfit = np.linspace(lo, hi, 100)
        ax.plot(xfit, alpha + beta * xfit, color='#dc2626', linewidth=1.5,
                label=f'OLS: y = {alpha:+.2f} + {beta:.3f}·x')

    r, _ = stats.pearsonr(x, y) if len(x) >= 3 else (float('nan'), None)
    ax.set_xlabel(f'System ({x_col}) [D]', fontsize=11)
    ax.set_ylabel(f'Clinical ({y_col}) [D]', fontsize=11)
    ax.set_title(f'System vs Clinical\nN = {len(x)}, Pearson r = {r:.3f}', fontsize=12)
    ax.legend(loc='best', framealpha=0.9, fontsize=9)
    ax.grid(True, alpha=0.3)
    ax.set_xlim(lo, hi); ax.set_ylim(lo, hi); ax.set_aspect('equal')
    plt.tight_layout()
    plt.savefig(out_path, dpi=120)
    plt.close(fig)


# ---------- Main --------------------------------------------------------------

def _print_metrics(label, metrics):
    print(f'\n  {label}')
    print(f'    N:                  {metrics["n"]}')
    print(f'    Mean diff:          {metrics["mean_delta_D"]:+.3f} D')
    print(f'    SD diff:            {metrics["sd_delta_D"]:.3f} D')
    print(f'    95% LoA:            [{metrics["loa_lo_D"]:+.2f}, {metrics["loa_hi_D"]:+.2f}] D')
    if metrics['mae_ci'] != (None, None):
        print(f'    MAE:                {metrics["mae_D"]:.3f} D  '
              f'(95% CI {metrics["mae_ci"][0]:.3f}–{metrics["mae_ci"][1]:.3f})')
        print(f'    |Bias|:             {metrics["abs_bias_D"]:.3f} D  '
              f'(95% CI {abs(metrics["bias_ci"][0]):.3f}–{abs(metrics["bias_ci"][1]):.3f})')
    else:
        print(f'    MAE:                {metrics["mae_D"]:.3f} D')
        print(f'    |Bias|:             {metrics["abs_bias_D"]:.3f} D')
    print(f'    Pearson r:          {metrics["pearson_r"]:.3f}')


def main():
    parser = argparse.ArgumentParser(
        description='ClearPath cohort validation analysis (Feasibility doc §8)'
    )
    parser.add_argument('json_dir',  help='Directory containing exported JSON files')
    parser.add_argument('cohort_map',help='CSV mapping recordId → subjectId, eye, clinicalSE, ...')
    parser.add_argument('--out',     default='validation_output', help='Output directory')
    parser.add_argument('--no-quality-filter', action='store_true',
                        help='Skip §7 quality filtering (include all records)')
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    print('=' * 60)
    print('ClearPath validation analysis')
    print('=' * 60)

    df = load_cohort(args.json_dir, args.cohort_map)
    n_subj = df['subjectId'].nunique() if 'subjectId' in df.columns else None
    print(f'\nLoaded {len(df)} records from {n_subj} subjects')

    if not args.no_quality_filter:
        df = quality_filter(df)

    df = df.dropna(subset=['appRx', 'clinicalSE'])
    print(f'Analyzable records: {len(df)}')
    if len(df) < 10:
        print('WARNING: very small sample size — interpret all metrics with caution.')

    # ----- Primary metrics -----
    print('\n' + '=' * 60)
    print('PRIMARY METRICS')
    print('=' * 60)
    metrics_apprx = compute_metrics(df, 'appRx', 'clinicalSE')
    _print_metrics('AppRx vs Clinical (released)', metrics_apprx)

    metrics_raw = compute_metrics(df, 'sphericalRaw', 'clinicalSE')
    _print_metrics('Raw v_FPMean vs Clinical (no DOF cal)', metrics_raw)

    rep = repeatability_metrics(df, 'appRx')
    if rep['sd_within_D'] is not None:
        print(f'\n  Repeatability (within-subject):')
        print(f'    Subject-eye groups w/ ≥2 sessions: {rep["n_repeated"]}')
        print(f'    SD_within:           {rep["sd_within_D"]:.3f} D')
        print(f'    1.96·SD_within:      {rep["repeatability_D"]:.3f} D')
    else:
        print('\n  Repeatability: not computable (no within-subject repeats)')

    # ----- Compliance -----
    print('\n' + '=' * 60)
    print('§9 COMPLIANCE')
    print('=' * 60)
    compliance = compliance_check(metrics_apprx, rep)
    for name, passed in compliance.items():
        sym = '✓' if passed else '✗'
        print(f'  [{sym}] {name}')

    # ----- DOF recipe -----
    print('\n' + '=' * 60)
    print('DOF CALIBRATION RECIPE (§6.4 — re-fit on this cohort)')
    print('=' * 60)
    dof = fit_dof_calibration(df, 'sphericalRaw', 'clinicalSE')
    print(f'  Fit:                AppRx = {dof["alpha"]:+.4f} + {dof["beta"]:.4f} · v_FPMean')
    print(f'  N samples:          {dof["n_samples"]}')
    if dof['full_mae'] is not None:
        print(f'  Full-set MAE:       {dof["full_mae"]:.3f} D')
    if dof['cv_mae'] is not None:
        print(f'  5-fold CV MAE:      {dof["cv_mae"]:.3f} D')
    print('\n  → Load these into the app:')
    print(f'')
    print(f'  // utils/CalibrationModel — paste before component init:')
    print(f'  calibModelRef.current.loadParams({{')
    print(f'    alpha:      {dof["alpha"]:.4f},')
    print(f'    beta:       {dof["beta"]:.4f},')
    print(f'    cohortId:   "your-cohort-id",')
    print(f'    cohortSize: {dof["n_samples"]},')
    if dof.get('cv_mae') is not None:
        print(f'    fitMAE:     {dof["cv_mae"]:.4f},')
    elif dof.get('full_mae') is not None:
        print(f'    fitMAE:     {dof["full_mae"]:.4f},')
    print(f'  }});')

    # ----- Plots -----
    plot_bland_altman(df, 'appRx',        'clinicalSE',
                      os.path.join(args.out, 'bland_altman_apprx.png'),
                      title_extra=' (released)')
    plot_bland_altman(df, 'sphericalRaw', 'clinicalSE',
                      os.path.join(args.out, 'bland_altman_raw.png'),
                      title_extra=' (raw, no DOF)')
    plot_scatter(df,      'appRx',        'clinicalSE',
                 os.path.join(args.out, 'scatter_apprx.png'))
    plot_scatter(df,      'sphericalRaw', 'clinicalSE',
                 os.path.join(args.out, 'scatter_raw.png'))
    print(f'\n  Plots written to {args.out}/')

    # ----- Subgroup analysis -----
    print('\n' + '=' * 60)
    print('SUBGROUP ANALYSIS by SE stratum')
    print('=' * 60)
    df = df.copy()
    df['stratum'] = pd.cut(
        df['clinicalSE'].astype(float),
        bins=[-np.inf, -6, -3, np.inf],
        labels=['high (≤ −6D)', 'moderate (−6 to −3D)', 'mild (> −3D)'],
    )
    for stratum, sub in df.groupby('stratum', observed=True):
        if len(sub) >= 5:
            m = compute_metrics(sub, 'appRx', 'clinicalSE')
            print(f'\n  Stratum: {stratum}  (n={len(sub)})')
            print(f'    MAE = {m["mae_D"]:.3f} D | Bias = {m["mean_delta_D"]:+.3f} D | '
                  f'LoA = [{m["loa_lo_D"]:+.2f}, {m["loa_hi_D"]:+.2f}]')

    # ----- Summary JSON -----
    def _clean_metrics(m):
        out = {}
        for k, v in m.items():
            if isinstance(v, tuple):
                out[k] = list(v)
            elif isinstance(v, (np.floating, np.integer)):
                out[k] = float(v)
            else:
                out[k] = v
        return out

    summary = {
        'n_records':                len(df),
        'n_subjects':               int(n_subj or 0),
        'metrics_apprx':            _clean_metrics(metrics_apprx),
        'metrics_raw':              _clean_metrics(metrics_raw),
        'repeatability':            rep,
        'compliance':               compliance,
        'dof_calibration_fit':      dof,
        'targets':                  TARGETS,
    }
    with open(os.path.join(args.out, 'summary.json'), 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    print(f'\nSummary written to {os.path.join(args.out, "summary.json")}')
    print('\nDone.')


if __name__ == '__main__':
    main()