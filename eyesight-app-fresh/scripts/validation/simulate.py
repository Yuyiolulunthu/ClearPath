"""
Generate a synthetic cohort to test the validation pipeline before
real subject data is available.

Each synthetic record mimics the structure of an app exportJSON output,
so analyze.py can ingest them directly.

Usage:
  python simulate.py --n-subjects 50 --out synthetic_cohort/
  python analyze.py synthetic_cohort/json_exports synthetic_cohort/cohort_map.csv
"""

import argparse
import csv
import json
import os
import uuid

import numpy as np


def synth_record(record_id, eye, true_SE_D, dof_offset=1.0, ppi=440):
    """Generate one fake JSON export.

    The model: the app, before DOF calibration, reports a vergence biased
    by ~+dof_offset (i.e. more myopic) relative to true SE, plus measurement
    noise. With the default identity calibration model, AppRx == raw.

    Visual acuity is modeled simply: emmetropes near logMAR 0; ametropes
    progressively worse. Real data would depend on whether they wore
    correction during the test.
    """
    raw_vergence = true_SE_D - dof_offset + np.random.normal(0, 0.18)
    apprx        = raw_vergence
    base_logmar  = max(0, abs(true_SE_D) - 1.0) * 0.06
    va_threshold = max(-0.2, base_logmar + np.random.normal(0, 0.06))
    vergence_std = abs(np.random.normal(0, 0.06))

    return {
        'recordId': record_id,
        'eye': eye,
        'ppi': ppi,
        'finalResults': {
            'appRx':            float(apprx),
            'sphericalRaw':     float(raw_vergence),
            'spherical':        float(raw_vergence),
            'vergenceMean':     float(raw_vergence),
            'vergenceStd':      float(vergence_std),
            'measurementCount': 3,
            'eye':              eye,
            'qualityScore':     int(np.clip(85 + np.random.randint(-10, 11), 30, 100)),
            'qualityGrade':     'GOOD',
            'crossModalityFlag':'none',
            'vaLowConfidence':  False,
        },
        'visualAcuity': {
            'logMAR':       float(va_threshold),
            'lowConfidence': False,
        },
        'qualityScore': int(np.clip(85 + np.random.randint(-10, 11), 30, 100)),
        'qualityGrade': 'GOOD',
        'crossModalityFlag': 'none',
        'vaLowConfidence': False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--n-subjects', type=int, default=50,
                        help='Number of synthetic subjects (each with both eyes)')
    parser.add_argument('--out',        default='synthetic_cohort',
                        help='Output directory')
    parser.add_argument('--seed',       type=int, default=42)
    parser.add_argument('--include-retest', action='store_true',
                        help='Include a 2nd session for 30%% of subjects (for repeatability)')
    args = parser.parse_args()

    np.random.seed(args.seed)
    json_dir = os.path.join(args.out, 'json_exports')
    os.makedirs(json_dir, exist_ok=True)

    rows = []
    devices = ['Xiaomi-13', 'Pixel-7', 'iPhone-13', 'Galaxy-A54']

    for i in range(args.n_subjects):
        subject_id = f'S{i:04d}'
        true_SE_base = np.random.normal(-2.0, 2.0)
        age = int(np.clip(np.random.normal(35, 14), 12, 70))
        device = devices[i % len(devices)]

        sessions = [1]
        if args.include_retest and np.random.random() < 0.3:
            sessions.append(2)

        for session in sessions:
            for eye in ['right', 'left']:
                # left/right have small inter-eye variance
                true_SE = true_SE_base + np.random.normal(0, 0.35)
                clinical_SE = true_SE + np.random.normal(0, 0.10)

                record_id = f'rec-{uuid.uuid4().hex[:12]}'
                data = synth_record(record_id, eye, true_SE)
                with open(os.path.join(json_dir, f'{record_id}.json'), 'w') as f:
                    json.dump(data, f, indent=2)

                rows.append({
                    'recordId':    record_id,
                    'subjectId':   subject_id,
                    'session':     session,
                    'age':         age,
                    'deviceModel': device,
                    'eye':         eye,
                    'clinicalSE':  round(float(clinical_SE), 2),
                    'true_SE':     round(float(true_SE), 2),  # ground truth (sanity check column)
                })

    map_path = os.path.join(args.out, 'cohort_map.csv')
    with open(map_path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    print(f'Generated {len(rows)} synthetic records ({args.n_subjects} subjects)')
    print(f'  JSON exports: {json_dir}/')
    print(f'  Cohort map:   {map_path}')
    print(f'\nNext:')
    print(f'  python analyze.py {json_dir} {map_path} --out {args.out}/results')


if __name__ == '__main__':
    main()