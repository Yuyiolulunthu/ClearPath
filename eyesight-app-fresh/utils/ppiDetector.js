/**
 * ppiDetector
 * --------------------------------------------------------------------------
 * Estimates the device's screen PPI (pixels per inch) without requiring
 * any extra native module.
 *
 * Why this matters for ClearPath:
 *   OptotypeController computes the on-screen pixel size of the Landolt C
 *   from PPI. Hardcoding 401 (an iPhone value) on a 440-PPI Xiaomi gives
 *   a stimulus 9% too small — which biases logMAR readings by ~0.04
 *   decimal. Not enough to be clinically catastrophic, but absolutely
 *   visible in cohort calibration. Detecting per-device cleans this up.
 *
 * Methods:
 *
 *   Android:
 *     PixelRatio.get() returns the actual device pixel ratio (e.g. 2.75
 *     for a 440-PPI phone). Android's baseline density is 160 dpi, so
 *     PPI ≈ dpr × 160 holds to ~5% on most devices.
 *
 *   iOS:
 *     DPR is bucketed at 2 (older / non-Pro / SE family) or 3 (Pro / Plus
 *     / Max from XS onward). We map to representative PPI per bucket.
 *
 * Limitations:
 *   - Android estimate can overshoot on some Samsung devices (e.g. S23
 *     reports DPR 3.0 but actual PPI is 425 — 13% over). For those, a
 *     model-based lookup table (P2) would be needed.
 *   - We don't differentiate iPad from iPhone. iPad PPI is 264 (always
 *     DPR 2) so our 326 estimate over-predicts. Acceptable for now — the
 *     primary deployment target is phone, not tablet.
 * --------------------------------------------------------------------------
 */

import { PixelRatio, Platform } from 'react-native';

const FALLBACK_PPI = 401;

// Bracket modern Android phones — anything outside is suspicious.
const ANDROID_PPI_MIN = 280;
const ANDROID_PPI_MAX = 520;

const IOS_PPI_BY_DPR_BUCKET = {
  2: 326,   // SE / 8 / non-Pro models from older lineups
  3: 460,   // X / XS / 11+ Pro / 12+ Pro / 13+ / 14+ / 15+
};

/**
 * Detect device PPI.
 * @returns {{ ppi: number, source: string, dpr: number }}
 */
export function detectPPI() {
  const dpr = PixelRatio.get();

  if (Platform.OS === 'android') {
    let estimate = Math.round(dpr * 160);
    // Clamp to plausible range — protects against weird emulators or
    // miscalibrated reports
    if (estimate < ANDROID_PPI_MIN || estimate > ANDROID_PPI_MAX) {
      return { ppi: FALLBACK_PPI, source: `android-dpr-out-of-range (got ${estimate})`, dpr };
    }
    return { ppi: estimate, source: 'android-dpr', dpr };
  }

  if (Platform.OS === 'ios') {
    const bucket = Math.round(dpr);
    const ppi = IOS_PPI_BY_DPR_BUCKET[bucket] ?? FALLBACK_PPI;
    return { ppi, source: `ios-dpr-bucket-${bucket}`, dpr };
  }

  return { ppi: FALLBACK_PPI, source: 'fallback', dpr };
}

export default detectPPI;