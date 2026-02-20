// 視力測試模組 - Staircase 方法

export class StaircaseProtocol {
  constructor(config = {}) {
    this.startLogMAR = config.startLogMAR || 0.3; // 20/40
    this.minLogMAR = config.minLogMAR || -0.3; // 20/10
    this.maxLogMAR = config.maxLogMAR || 1.0; // 20/200
    this.stepSize = config.stepSize || 0.1;
    this.reversalsNeeded = config.reversalsNeeded || 4;
    this.maxTrials = config.maxTrials || 30;
    
    this.currentLogMAR = this.startLogMAR;
    this.responses = [];
    this.reversals = [];
    this.trialCount = 0;
    this.lastDirection = null;
  }

  /**
   * 記錄回應
   * @param {boolean} correct - 是否正確
   * @returns {Object} {continue, currentLogMAR, threshold}
   */
  recordResponse(correct) {
    this.responses.push({
      logMAR: this.currentLogMAR,
      correct: correct,
      trial: this.trialCount
    });

    this.trialCount++;

    // 決定下一步方向
    let newDirection;
    if (correct) {
      // 正確 → 更難 (減小 logMAR)
      newDirection = 'harder';
      this.currentLogMAR = Math.max(
        this.minLogMAR,
        this.currentLogMAR - this.stepSize
      );
    } else {
      // 錯誤 → 更簡單 (增大 logMAR)
      newDirection = 'easier';
      this.currentLogMAR = Math.min(
        this.maxLogMAR,
        this.currentLogMAR + this.stepSize
      );
    }

    // 檢查反轉
    if (this.lastDirection && this.lastDirection !== newDirection) {
      this.reversals.push({
        trial: this.trialCount - 1,
        logMAR: this.responses[this.responses.length - 1].logMAR
      });
    }

    this.lastDirection = newDirection;

    // 決定是否繼續
    const shouldContinue = 
      this.reversals.length < this.reversalsNeeded &&
      this.trialCount < this.maxTrials;

    // 計算閾值 (使用最後幾次反轉的平均)
    let threshold = null;
    if (this.reversals.length >= 2) {
      const recentReversals = this.reversals.slice(-4);
      const sum = recentReversals.reduce((acc, r) => acc + r.logMAR, 0);
      threshold = sum / recentReversals.length;
    }

    return {
      continue: shouldContinue,
      currentLogMAR: this.currentLogMAR,
      threshold: threshold,
      reversalCount: this.reversals.length,
      trialCount: this.trialCount
    };
  }

  /**
   * 獲取當前狀態
   */
  getState() {
    return {
      currentLogMAR: this.currentLogMAR,
      reversals: this.reversals.length,
      trials: this.trialCount,
      responses: [...this.responses]
    };
  }

  /**
   * 重置測試
   */
  reset() {
    this.currentLogMAR = this.startLogMAR;
    this.responses = [];
    this.reversals = [];
    this.trialCount = 0;
    this.lastDirection = null;
  }
}

/**
 * 生成 Landolt C 方向 (隨機)
 */
export function generateDirection() {
  const directions = ['up', 'down', 'left', 'right'];
  return directions[Math.floor(Math.random() * directions.length)];
}

/**
 * 獲取方向的旋轉角度
 */
export function getRotationAngle(direction) {
  const rotations = {
    'right': 0,
    'down': 90,
    'left': 180,
    'up': 270
  };
  return rotations[direction] || 0;
}