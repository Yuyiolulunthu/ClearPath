/**
 * EyeStateDetector
 * --------------------------------------------------------------------------
 * Determines which eye is being tested by detecting which eye is covered.
 *
 * Inputs (per frame, from ML Kit face detection):
 *   - leftEyeOpenProbability   (0..1)
 *   - rightEyeOpenProbability  (0..1)
 *   - yawAngle, rollAngle      (degrees)
 *
 * Output: { leftCovered, rightCovered, activeEye, confidence, ... }
 *
 * Design choices:
 *   1. Hysteresis (separate enter/exit thresholds) prevents the state from
 *      flickering when probabilities hover near the boundary.
 *   2. Median of recent frames absorbs single-frame ML jitter.
 *   3. When face is tilted > 15°, we freeze the state — eye-open probability
 *      becomes unreliable at sharp angles.
 *   4. The "active eye" is the OPEN one — that's the eye looking at the
 *      screen and being tested.
 *
 * Mirror handling:
 *   ML Kit's `LEFT_EYE` is on the image's left half. For an UNMIRRORED
 *   front-camera frame, that corresponds to the user's RIGHT eye. Most
 *   front cameras display mirrored to the user but pass UNMIRRORED frames
 *   to the detector. Set `mirroredCamera: true` (default) so the API speaks
 *   in user-perspective terms. If your detection feels reversed, flip it.
 * --------------------------------------------------------------------------
 */

class EyeStateDetector {
  constructor(opts = {}) {
    // Hysteresis thresholds
    this.OPEN_THRESHOLD    = opts.openThreshold    ?? 0.65;
    this.COVERED_THRESHOLD = opts.coveredThreshold ?? 0.30;

    // Stability
    this.HISTORY_SIZE      = opts.historySize      ?? 5;
    this.MAX_HEAD_ANGLE    = opts.maxHeadAngle     ?? 15;  // degrees

    // Mirror correction (see header comment)
    this.mirroredCamera    = opts.mirroredCamera   ?? true;

    this._reset();
  }

  _reset() {
    this.leftCovered  = false;
    this.rightCovered = false;
    this.leftHistory  = [];
    this.rightHistory = [];
    this.lastValidUpdateAt = 0;
  }

  reset() {
    this._reset();
  }

  /**
   * Feed one frame.
   * @param {object} input
   *   - leftEyeOpenProb  : ML Kit value for image-left eye  (0..1 or undefined)
   *   - rightEyeOpenProb : ML Kit value for image-right eye (0..1 or undefined)
   *   - yaw, roll        : Euler angles in degrees
   * @returns {object} state — see header comment
   */
  analyze({ leftEyeOpenProb, rightEyeOpenProb, yaw = 0, roll = 0 } = {}) {
    // --- Map detector L/R to user L/R if camera is mirrored relative to detector ---
    let userLeftProb, userRightProb;
    if (this.mirroredCamera) {
      // Detector's LEFT (image-left) == user's RIGHT
      userRightProb = leftEyeOpenProb;
      userLeftProb  = rightEyeOpenProb;
    } else {
      userLeftProb  = leftEyeOpenProb;
      userRightProb = rightEyeOpenProb;
    }

    // --- Reliability gate ---
    const headAngleOk =
      Math.abs(yaw)  < this.MAX_HEAD_ANGLE &&
      Math.abs(roll) < this.MAX_HEAD_ANGLE;
    const probsValid =
      Number.isFinite(userLeftProb) && Number.isFinite(userRightProb);

    if (!headAngleOk || !probsValid) {
      return this._snapshot({
        confidence: 0,
        reason: !headAngleOk ? 'head_tilted' : 'probs_missing',
        leftProb: null,
        rightProb: null,
      });
    }

    // --- Update history ---
    this.leftHistory.push(userLeftProb);
    this.rightHistory.push(userRightProb);
    if (this.leftHistory.length  > this.HISTORY_SIZE) this.leftHistory.shift();
    if (this.rightHistory.length > this.HISTORY_SIZE) this.rightHistory.shift();

    const leftMedian  = this._median(this.leftHistory);
    const rightMedian = this._median(this.rightHistory);

    // --- Hysteresis state update ---
    if (this.leftCovered) {
      if (leftMedian > this.OPEN_THRESHOLD) this.leftCovered = false;
    } else {
      if (leftMedian < this.COVERED_THRESHOLD) this.leftCovered = true;
    }
    if (this.rightCovered) {
      if (rightMedian > this.OPEN_THRESHOLD) this.rightCovered = false;
    } else {
      if (rightMedian < this.COVERED_THRESHOLD) this.rightCovered = true;
    }

    // Confidence: how cleanly separated the two eyes are.
    // |Δ| ~ 0.7+ → very clean, |Δ| < 0.2 → ambiguous.
    const diff = Math.abs(leftMedian - rightMedian);
    const confidence = Math.min(1, diff / 0.5);

    this.lastValidUpdateAt = Date.now();

    return this._snapshot({
      confidence,
      leftProb: leftMedian,
      rightProb: rightMedian,
      reason: 'ok',
    });
  }

  /**
   * Which eye is currently being tested?
   *   'left'  : user's left eye open, right covered
   *   'right' : user's right eye open, left covered
   *   'both'  : neither covered (resting state)
   *   'none'  : both covered (error state)
   */
  getActiveEye() {
    if (this.leftCovered && this.rightCovered)  return 'none';
    if (this.leftCovered)                       return 'right';
    if (this.rightCovered)                      return 'left';
    return 'both';
  }

  /** True if exactly one eye is covered (valid testing state) */
  isValidTestState() {
    return this.leftCovered !== this.rightCovered;
  }

  _snapshot(extra) {
    return {
      leftCovered:  this.leftCovered,
      rightCovered: this.rightCovered,
      activeEye:    this.getActiveEye(),
      validState:   this.isValidTestState(),
      ...extra,
    };
  }

  _median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
}

export default EyeStateDetector;