// 距離估測模組
// 基於單鏡頭幾何比例模型

export class DistanceEstimator {
  constructor() {
    this.calibrationConstant = null; // k = d0 * s0
    this.calibrationDistance = null; // d0 (cm)
    this.distanceHistory = [];
    this.maxHistoryLength = 100; // 5秒 @ 20Hz
  }

  /**
   * 校正系統
   * @param {number} calibrationDistance - 校正距離 (cm)
   * @param {number} pixelWidth - 臉部特徵像素寬度
   */
  calibrate(calibrationDistance, pixelWidth) {
    this.calibrationDistance = calibrationDistance;
    this.calibrationConstant = calibrationDistance * pixelWidth;
    console.log(`[DistanceEstimator] Calibrated: k=${this.calibrationConstant.toFixed(2)}`);
  }

  /**
   * 姿態修正
   * @param {number} pixelWidth - 觀測到的像素寬度
   * @param {number} yawAngle - 偏航角 (度)
   * @returns {number} 修正後的像素寬度
   */
  applyPoseCorrection(pixelWidth, yawAngle) {
    const yawRad = (yawAngle * Math.PI) / 180;
    return pixelWidth / Math.cos(yawRad);
  }

  /**
   * 計算距離
   * @param {number} pixelWidth - 臉部特徵像素寬度
   * @param {number} yawAngle - 偏航角 (度，可選)
   * @returns {number|null} 距離 (cm)
   */
  estimateDistance(pixelWidth, yawAngle = 0) {
    if (!this.calibrationConstant) {
      console.warn('[DistanceEstimator] Not calibrated');
      return null;
    }

    // 姿態修正
    const correctedWidth = this.applyPoseCorrection(pixelWidth, yawAngle);
    
    // 計算距離: d = k / s_corr
    const distance = this.calibrationConstant / correctedWidth;

    // 記錄歷史
    this.distanceHistory.push({
      timestamp: Date.now(),
      distance: distance,
      rawWidth: pixelWidth,
      correctedWidth: correctedWidth,
      yawAngle: yawAngle
    });

    // 限制歷史長度
    if (this.distanceHistory.length > this.maxHistoryLength) {
      this.distanceHistory.shift();
    }

    return distance;
  }

  /**
   * 獲取時間窗平均距離
   * @param {number} windowMs - 時間窗 (毫秒)
   * @returns {Object} {mean, std, count}
   */
  getAverageDistance(windowMs = 1000) {
    const now = Date.now();
    const recentData = this.distanceHistory.filter(
      d => (now - d.timestamp) <= windowMs
    );

    if (recentData.length === 0) {
      return { mean: null, std: null, count: 0 };
    }

    const distances = recentData.map(d => d.distance);
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    
    // 計算標準差
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / (distances.length - 1);
    const std = Math.sqrt(variance);

    return { mean, std, count: distances.length };
  }

  /**
   * 檢查距離穩定性
   * @param {number} threshold - 標準差門檻 (cm)
   * @returns {boolean}
   */
  isStable(threshold = 2.0) {
    const { std, count } = this.getAverageDistance(1000);
    return count >= 10 && std !== null && std < threshold;
  }

  /**
   * 重置歷史記錄
   */
  reset() {
    this.distanceHistory = [];
  }

  /**
   * 獲取完整歷史數據
   */
  getHistory() {
    return [...this.distanceHistory];
  }
}