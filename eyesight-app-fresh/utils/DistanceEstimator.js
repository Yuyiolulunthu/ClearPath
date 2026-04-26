/**
 * DistanceEstimator
 * --------------------------------------------------------------------------
 * Computes camera-to-face distance from a face feature (IPD or face width)
 * provided in *normalized 0-1 coordinates* (fraction of frame).
 *
 * Geometric model with off-axis pose correction (Feasibility doc §3.2):
 *
 *   s_observed = s_true × cos(yaw) × cos(pitch)
 *
 *   To recover s_true from observed pixels:
 *     s_corrected = s_observed / (cos(yaw) × cos(pitch))
 *
 *   And then:
 *     d = k / s_corrected
 *       = k × cos(yaw) × cos(pitch) / s_observed
 *
 *   When yaw = pitch = 0, both cosines = 1, and the equation collapses back
 *   to the simple d = k/s form.
 *
 *   Roll is intentionally NOT corrected — roll rotates around the optical
 *   axis, which doesn't change the on-image distance between the two eyes.
 *
 * Calibration:
 *   - Performed at near-zero pose (yaw, roll < 10° gate enforced upstream)
 *   - We persist k = d_calibrated × s_observed_calibrated
 *   - At calibration, cos(yaw)·cos(pitch) ≈ 1, so the calibration captures
 *     focal-length × true-feature-size cleanly.
 *
 * Reject regimes (cos correction breaks down):
 *   - |yaw| > 25° → cos < 0.91, geometry degrades and frame should be skipped
 *     by the upstream face-detector quality gate (we reject inside this class
 *     too as defense-in-depth).
 *   - |pitch| > 20° → similar.
 *
 * v1.3: cos(yaw)·cos(pitch) correction added. Backward-compatible API.
 * --------------------------------------------------------------------------
 */

const DEFAULT_USER_IPD_MM   = 63;
const MIN_FEATURE_VALUE     = 0.02;
const VALID_DISTANCE_MIN_CM = 15;
const VALID_DISTANCE_MAX_CM = 120;

// Pose-correction safety gates. If exceeded, the corrected reading is
// considered unreliable and we return null instead.
const MAX_YAW_FOR_CORRECTION   = 25;  // degrees
const MAX_PITCH_FOR_CORRECTION = 20;  // degrees

const DEG2RAD = Math.PI / 180;

class DistanceEstimator {
  constructor() {
    this.k                 = null;
    this.userIPD_mm        = DEFAULT_USER_IPD_MM;
    this.history           = [];
    this.smoothingWindow   = 7;
  }

  // ----- Calibration -----

  /**
   * Calibrate at a known distance.
   *
   * NOTE: caller is responsible for ensuring the calibration frame has near-zero
   * pose (yaw, roll, pitch ~0). CameraView enforces yaw<10°/roll<10° before
   * triggering this. We additionally do a sanity check on the feature size.
   *
   * @param {number} distance_cm
   * @param {number} feature  - normalized 0-1 IPD or face width (must be the
   *                             feature you'll keep using for estimation)
   * @returns {{ok, k?, error?}}
   */
  calibrateFromIPD(distance_cm, feature) {
    if (!Number.isFinite(distance_cm) || distance_cm <= 0) {
      return { ok: false, error: 'Invalid calibration distance' };
    }
    if (!Number.isFinite(feature) || feature < MIN_FEATURE_VALUE) {
      const fStr = Number.isFinite(feature) ? feature.toFixed(3) : 'null';
      return {
        ok: false,
        error: `Feature too small (${fStr}). Move closer or wait for tracking to stabilize.`,
      };
    }
    this.k = distance_cm * feature;
    this.history = [];
    return { ok: true, k: this.k };
  }

  setUserIPD(ipd_mm) {
    if (!Number.isFinite(ipd_mm) || ipd_mm < 50 || ipd_mm > 75) {
      throw new Error('IPD outside physiological range (50–75 mm)');
    }
    this.userIPD_mm = ipd_mm;
  }

  isCalibrated() {
    return this.k !== null;
  }

  // ----- Estimation -----

  /**
   * Estimate distance from current feature with pose correction.
   *
   * @param {number} feature           - normalized 0-1 (same family as calibration)
   * @param {number} [yawDeg=0]        - face yaw in degrees
   * @param {number} [pitchDeg=0]      - face pitch in degrees
   * @returns {number|null} distance in cm
   */
  estimateFromIPD(feature, yawDeg = 0, pitchDeg = 0) {
    if (this.k === null) return null;
    if (!Number.isFinite(feature) || feature < MIN_FEATURE_VALUE) return null;

    // Reject if pose is too extreme — cos correction loses validity past
    // ~25° yaw (cos25° = 0.906; 9% magnification of measurement error).
    if (!Number.isFinite(yawDeg) || Math.abs(yawDeg) > MAX_YAW_FOR_CORRECTION) {
      return null;
    }
    if (!Number.isFinite(pitchDeg) || Math.abs(pitchDeg) > MAX_PITCH_FOR_CORRECTION) {
      return null;
    }

    // Apply pose correction:
    //   d = k × cos(yaw) × cos(pitch) / s_observed
    const cosYaw   = Math.cos(yawDeg   * DEG2RAD);
    const cosPitch = Math.cos(pitchDeg * DEG2RAD);
    const raw = (this.k * cosYaw * cosPitch) / feature;

    if (raw < VALID_DISTANCE_MIN_CM || raw > VALID_DISTANCE_MAX_CM) return null;

    this.history.push(raw);
    if (this.history.length > this.smoothingWindow) this.history.shift();

    return this._median(this.history);
  }

  /**
   * Estimate with confidence.
   * Confidence shrinks both with sample-to-sample variability AND with the
   * absolute pose magnitude (more pose ⇒ more correction ⇒ less trustworthy).
   */
  getDistanceWithConfidence(feature, yawDeg = 0, pitchDeg = 0) {
    const distance = this.estimateFromIPD(feature, yawDeg, pitchDeg);
    if (distance === null) return { distance: null, confidence: 0, std: null };

    if (this.history.length < 3) {
      return { distance, confidence: 0.4, std: null };
    }

    const mean = this.history.reduce((a, b) => a + b, 0) / this.history.length;
    const variance =
      this.history.reduce((a, b) => a + (b - mean) ** 2, 0) / this.history.length;
    const std = Math.sqrt(variance);
    const cv  = std / mean;

    // Stability component: CV ≤ 0.02 → 1.0, CV ≥ 0.10 → 0
    const stabilityConf = Math.max(0, Math.min(1, 1 - cv * 10));

    // Pose component: |yaw|+|pitch| = 0 → 1.0, sum = 30° → 0
    const poseSum = Math.abs(yawDeg) + Math.abs(pitchDeg);
    const poseConf = Math.max(0, Math.min(1, 1 - poseSum / 30));

    // Combined: take the worst of the two (a single bad axis kills the result)
    const confidence = Math.min(stabilityConf, poseConf);

    return { distance, confidence, std };
  }

  reset() {
    this.history = [];
  }

  resetCalibration() {
    this.k = null;
    this.history = [];
  }

  // ----- Legacy API (passes 0 for pose; caller should migrate) -----

  calibrate(distance_cm, feature) {
    return this.calibrateFromIPD(distance_cm, feature);
  }

  estimateDistance(feature) {
    return this.estimateFromIPD(feature, 0, 0);
  }

  // ----- Internals -----

  _median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

export default DistanceEstimator;