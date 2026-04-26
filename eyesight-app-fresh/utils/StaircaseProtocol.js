// 視力測試模組 - 3-down-1-up Adaptive Staircase
//
// v1.1: when termination occurs before enough reversals to compute a
// reversal-mean threshold, fall back to the staircase's last operating
// level (currentLogMAR) and flag the result as low-confidence. This
// prevents downstream code from receiving a null threshold and crashing
// on .toFixed() etc, while still surfacing the uncertainty.

export class StaircaseProtocol {
  constructor(config = {}) {
    this.startLogMAR     = config.startLogMAR     ?? 0.3;
    this.minLogMAR       = config.minLogMAR       ?? -0.3;
    this.maxLogMAR       = config.maxLogMAR       ?? 1.0;
    this.stepSize        = config.stepSize        ?? 0.1;
    this.reversalsNeeded = config.reversalsNeeded ?? 6;
    this.maxTrials       = config.maxTrials       ?? 40;
    this.thresholdReversals = config.thresholdReversals ?? 4;
    this.consecutiveCorrectNeeded = 3;

    this._reset();
  }

  _reset() {
    this.currentLogMAR     = this.startLogMAR;
    this.responses         = [];
    this.reversals         = [];
    this.trialCount        = 0;
    this.lastDirection     = null;
    this.consecutiveCorrect = 0;
  }

  reset() {
    this._reset();
  }

  recordResponse(correct) {
    this.responses.push({
      logMAR: this.currentLogMAR,
      correct,
      trial:  this.trialCount,
    });
    this.trialCount++;

    let newDirection = null;

    if (correct) {
      this.consecutiveCorrect++;
      if (this.consecutiveCorrect >= this.consecutiveCorrectNeeded) {
        newDirection = 'harder';
        this.currentLogMAR = Math.max(
          this.minLogMAR,
          this.currentLogMAR - this.stepSize
        );
        this.consecutiveCorrect = 0;
      }
    } else {
      newDirection = 'easier';
      this.currentLogMAR = Math.min(
        this.maxLogMAR,
        this.currentLogMAR + this.stepSize
      );
      this.consecutiveCorrect = 0;
    }

    if (newDirection && this.lastDirection && newDirection !== this.lastDirection) {
      this.reversals.push({
        trial:  this.trialCount - 1,
        logMAR: this.responses[this.responses.length - 1].logMAR,
        direction: newDirection,
      });
    }

    if (newDirection) {
      this.lastDirection = newDirection;
    }

    const shouldContinue =
      this.reversals.length < this.reversalsNeeded &&
      this.trialCount       < this.maxTrials;

    // Threshold estimation with fallbacks:
    //   - Preferred: mean of last N reversals (needs ≥ 2 reversals)
    //   - Fallback (when terminating): use currentLogMAR + low-confidence flag
    //   - Otherwise: null while staircase is mid-run (don't render yet)
    let threshold = null;
    let lowConfidence = false;

    if (this.reversals.length >= 2) {
      const recent = this.reversals.slice(-this.thresholdReversals);
      const sum = recent.reduce((a, r) => a + r.logMAR, 0);
      threshold = sum / recent.length;
      // If we have <4 reversals, that's still a valid mean but somewhat
      // shaky — caller can decide to flag it.
      lowConfidence = this.reversals.length < this.thresholdReversals;
    } else if (!shouldContinue) {
      // We're done but never got enough reversals — fall back to wherever
      // the staircase ended up. Better than null, with a clear quality flag.
      threshold = this.currentLogMAR;
      lowConfidence = true;
    }

    return {
      continue:      shouldContinue,
      currentLogMAR: this.currentLogMAR,
      threshold,
      lowConfidence,
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

export function generateDirection() {
  const directions = ['up', 'down', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
}

export function getRotationAngle(direction) {
  const rotations = {
    right: 0,
    down:  90,
    left:  180,
    up:    270,
  };
  return rotations[direction] ?? 0;
}