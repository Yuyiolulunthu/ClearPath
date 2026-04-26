/**
 * CalibrationModel
 * --------------------------------------------------------------------------
 * One-dimensional linear depth-of-focus calibration per Feasibility doc §6.4:
 *
 *   AppRx = α + β · v_FPMean
 *
 * where:
 *   - v_FPMean is the LCA-corrected mean vergence from the far-point procedure
 *   - α (offset) and β (gain) are fit by OLS against clinical reference SE
 *     on a held-out cohort
 *   - AppRx is the released apparent prescription
 *
 * Why a separate class:
 *   - Keeps the calibration identity (α, β, training-cohort id, MAE, etc.)
 *     auditable and persistable independently of the measurement code.
 *   - Allows hot-swap of parameters without touching the pipeline.
 *
 * Default parameters: α=0, β=1 (identity transform).
 *   - This means the released AppRx == raw v_FPMean until a cohort fit
 *     replaces them. Safe (no fake claim of calibration), but produces
 *     systematically over-myopic readings on uncalibrated emmetropes.
 *   - Downstream gates (e.g. cross-modality, doc §7.4) should be loose
 *     until a real fit is loaded, then tightened to the doc-spec values.
 *
 * Fitting (run offline on cohort data, then loadParams the result):
 *   ordinary least squares with x = v_FPMean, y = R_clinical
 *   β = Cov(x, y) / Var(x)
 *   α = ȳ − β · x̄
 *   k-fold CV reports MAE; refit if held-out MAE > target.
 * --------------------------------------------------------------------------
 */

const DEFAULT_PARAMS = {
  alpha:                 0,
  beta:                  1,
  cohortId:              'identity-default',
  cohortSize:            0,
  fitMAE:                null,
  fitDate:               null,
  notes:                 'Identity transform — no cohort fit applied yet.',
};

export class CalibrationModel {
  constructor(params = {}) {
    this.params = { ...DEFAULT_PARAMS, ...params };
  }

  /**
   * Apply the linear calibration to a raw vergence value (LCA-corrected).
   * @param {number} v_FPMean - raw vergence in diopters
   * @returns {number} AppRx in diopters
   */
  apply(v_FPMean) {
    if (!Number.isFinite(v_FPMean)) return null;
    return this.params.alpha + this.params.beta * v_FPMean;
  }

  /**
   * Load a fitted parameter set (e.g. from a cohort regression).
   * @param {{alpha, beta, cohortId?, cohortSize?, fitMAE?, fitDate?, notes?}} p
   */
  loadParams(p) {
    if (!p || !Number.isFinite(p.alpha) || !Number.isFinite(p.beta)) {
      throw new Error('CalibrationModel: invalid params; need finite alpha and beta');
    }
    this.params = {
      ...DEFAULT_PARAMS,
      ...p,
      // Auto-stamp date if caller didn't
      fitDate: p.fitDate ?? new Date().toISOString(),
    };
  }

  /**
   * @returns true if the loaded params are non-identity (i.e. a real fit)
   */
  isFitted() {
    return !(this.params.alpha === 0 && this.params.beta === 1);
  }

  /**
   * @returns a copy of the params for logging / audit
   */
  describe() {
    return { ...this.params };
  }

  /**
   * Static helper: fit (α, β) to (x, y) pairs by OLS.
   * Returns the params object suitable for loadParams().
   *
   * @param {number[]} xs - raw vergence measurements (v_FPMean)
   * @param {number[]} ys - corresponding clinical reference SE
   * @param {object} meta - optional metadata (cohortId, etc.)
   */
  static fit(xs, ys, meta = {}) {
    if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length !== ys.length) {
      throw new Error('CalibrationModel.fit: xs and ys must be equal-length arrays');
    }
    const n = xs.length;
    if (n < 2) {
      throw new Error('CalibrationModel.fit: need at least 2 samples');
    }

    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;

    let cov = 0, varX = 0;
    for (let i = 0; i < n; i++) {
      cov  += (xs[i] - xMean) * (ys[i] - yMean);
      varX += (xs[i] - xMean) ** 2;
    }
    if (varX === 0) {
      throw new Error('CalibrationModel.fit: zero variance in xs — cannot fit');
    }
    const beta  = cov / varX;
    const alpha = yMean - beta * xMean;

    // Residual MAE
    let mae = 0;
    for (let i = 0; i < n; i++) {
      mae += Math.abs((alpha + beta * xs[i]) - ys[i]);
    }
    mae /= n;

    return {
      alpha,
      beta,
      cohortSize: n,
      fitMAE:     mae,
      fitDate:    new Date().toISOString(),
      ...meta,
    };
  }
}

export default CalibrationModel;