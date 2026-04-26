// 視力測試模組 - 3-down-1-up Adaptive Staircase
//
// Threshold definition:
//   - Converges on the level where P(correct)^3 = 1 - P(correct)
//   - That gives P ≈ 0.794 (79.4% correct)
//   - Aligned with ISO 10342 / standard clinical optometry
//   - For 4-AFC tasks (Landolt C with 4 directions), 79.4% correct
//     corresponds to ~50% actually-seen after subtracting the 25% guess rate
//
// Why not 1-down-1-up (the previous version):
//   - 1d1u converges on 50% correct
//   - For 4-AFC that's only ~33% above the 25% guess floor — a chance-biased
//     estimate that systematically OVER-estimates acuity by ~0.15-0.20 decimal.
//   - Wrong direction for screening: false negatives are worse than false
//     positives (missing a vision problem is worse than flagging a healthy eye).

export class StaircaseProtocol {
  constructor(config = {}) {
    this.startLogMAR     = config.startLogMAR     ?? 0.3;   // 20/40
    this.minLogMAR       = config.minLogMAR       ?? -0.3;  // 20/10
    this.maxLogMAR       = config.maxLogMAR       ?? 1.0;   // 20/200
    this.stepSize        = config.stepSize        ?? 0.1;
    this.reversalsNeeded = config.reversalsNeeded ?? 6;     // 3d1u needs more reversals than 1d1u
    this.maxTrials       = config.maxTrials       ?? 40;    // bumped to accommodate longer convergence
    this.thresholdReversals = config.thresholdReversals ?? 4; // last N reversals averaged for threshold
    this.consecutiveCorrectNeeded = 3;                      // 3-down

    this._reset();
  }

  _reset() {
    this.currentLogMAR     = this.startLogMAR;
    this.responses         = [];
    this.reversals         = [];
    this.trialCount        = 0;
    this.lastDirection     = null;
    this.consecutiveCorrect = 0;   // counter for the 3-down rule
  }

  reset() {
    this._reset();
  }

  /**
   * Record a response. The 3-down-1-up rule:
   *   - 3 consecutive correct → step harder (smaller logMAR)
   *   - 1 incorrect → step easier (larger logMAR), reset the correct counter
   *
   * @param {boolean} correct
   * @returns {Object} { continue, currentLogMAR, threshold, reversalCount, trialCount }
   */
  recordResponse(correct) {
    // Log this trial against the level it was actually presented at.
    this.responses.push({
      logMAR: this.currentLogMAR,
      correct,
      trial:  this.trialCount,
    });
    this.trialCount++;

    let newDirection = null;          // 'harder' | 'easier' | null (no step this trial)

    if (correct) {
      this.consecutiveCorrect++;
      if (this.consecutiveCorrect >= this.consecutiveCorrectNeeded) {
        // Step harder
        newDirection = 'harder';
        this.currentLogMAR = Math.max(
          this.minLogMAR,
          this.currentLogMAR - this.stepSize
        );
        this.consecutiveCorrect = 0; // reset after a step
      }
      // else: stay at the same level, await next response
    } else {
      // 1-up: any error steps easier immediately
      newDirection = 'easier';
      this.currentLogMAR = Math.min(
        this.maxLogMAR,
        this.currentLogMAR + this.stepSize
      );
      this.consecutiveCorrect = 0;
    }

    // Reversal: only when we actually stepped this trial AND the direction
    // flipped from last step.
    if (newDirection && this.lastDirection && newDirection !== this.lastDirection) {
      this.reversals.push({
        trial:  this.trialCount - 1,
        // The reversal logMAR is the level the user was tested at when the
        // flip happened.
        logMAR: this.responses[this.responses.length - 1].logMAR,
        direction: newDirection,
      });
    }

    if (newDirection) {
      this.lastDirection = newDirection;
    }

    // Termination: enough reversals OR trial cap reached
    const shouldContinue =
      this.reversals.length < this.reversalsNeeded &&
      this.trialCount       < this.maxTrials;

    // Threshold estimate: mean of the last N reversals (default 4).
    // Convention in psychophysics: discard the first 1-2 reversals (often
    // noisy "warm-up" reversals before the staircase has settled). We keep
    // it simple: just average the most recent thresholdReversals.
    let threshold = null;
    if (this.reversals.length >= 2) {
      const recent = this.reversals.slice(-this.thresholdReversals);
      const sum = recent.reduce((a, r) => a + r.logMAR, 0);
      threshold = sum / recent.length;
    }

    return {
      continue:      shouldContinue,
      currentLogMAR: this.currentLogMAR,
      threshold,
      reversalCount: this.reversals.length,
      trialCount:    this.trialCount,
      consecutiveCorrect: this.consecutiveCorrect,
    };
  }

  getState() {
    return {
      currentLogMAR:      this.currentLogMAR,
      reversals:          this.reversals.length,
      trials:             this.trialCount,
      consecutiveCorrect: this.consecutiveCorrect,
      responses:          [...this.responses],
    };
  }
}

// ---------- Helpers (unchanged) ----------

/**
 * Generate a random Landolt C direction.
 */
export function generateDirection() {
  const directions = ['up', 'down', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
}

/**
 * CSS rotation (degrees) for a given gap direction.
 * Base C orientation: gap to the right (0°).
 */
export function getRotationAngle(direction) {
  const rotations = {
    right: 0,
    down:  90,
    left:  180,
    up:    270,
  };
  return rotations[direction] ?? 0;
}