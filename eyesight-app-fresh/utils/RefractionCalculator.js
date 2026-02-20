// 遠點測光與屈光轉換模組

export class RefractionCalculator {
  constructor(config = {}) {
    // LCA (縱向色差) 校正值
    this.LCA = config.LCA || 0.70; // D
    
    // DoF 線性校正參數 (需要透過校正資料估計)
    this.alpha = config.alpha || 0.0; // 截距
    this.beta = config.beta || 1.0; // 斜率
    
    // 測量記錄
    this.measurements = [];
  }

  /**
   * 記錄遠點距離測量
   * @param {number} farPointDistance - 遠點距離 (cm)
   * @param {Object} metadata - 額外資訊
   */
  recordMeasurement(farPointDistance, metadata = {}) {
    // 轉換為 vergence (D)
    const vergence = -100 / farPointDistance; // cm 轉 m 並計算 vergence
    
    this.measurements.push({
      timestamp: Date.now(),
      farPointDistance: farPointDistance,
      vergence: vergence,
      ...metadata
    });
  }

  /**
   * 計算平均 vergence 及標準差
   * @returns {Object} {mean, std, count, measurements}
   */
  calculateVergenceStats() {
    if (this.measurements.length === 0) {
      return { mean: null, std: null, count: 0, measurements: [] };
    }

    const vergences = this.measurements.map(m => m.vergence);
    const mean = vergences.reduce((a, b) => a + b, 0) / vergences.length;
    
    if (vergences.length < 2) {
      return { 
        mean: mean, 
        std: 0, 
        count: vergences.length,
        measurements: [...this.measurements]
      };
    }

    const variance = vergences.reduce(
      (sum, v) => sum + Math.pow(v - mean, 2), 
      0
    ) / (vergences.length - 1);
    
    const std = Math.sqrt(variance);

    return { 
      mean: mean, 
      std: std, 
      count: vergences.length,
      measurements: [...this.measurements]
    };
  }

  /**
   * 應用 LCA 校正 (藍光刺激)
   * @param {number} vergence - 原始 vergence (D)
   * @param {boolean} useBlueLight - 是否使用藍光刺激
   * @returns {number} 校正後 vergence (D)
   */
  applyLCACorrection(vergence, useBlueLight = true) {
    if (!useBlueLight) return vergence;
    
    // v_white = v_blue - LCA
    return vergence - this.LCA;
  }

  /**
   * 應用 DoF 線性校正
   * @param {number} vergenceMean - 平均 vergence (D)
   * @returns {number} 校正後屈光度 (D)
   */
  applyDoFCorrection(vergenceMean) {
    // AppRx = α + β · v_FPMean
    return this.alpha + this.beta * vergenceMean;
  }

  /**
   * 計算最終屈光度
   * @param {boolean} useBlueLight - 是否使用藍光
   * @returns {Object} {spherical, quality}
   */
  calculateRefraction(useBlueLight = true) {
    const stats = this.calculateVergenceStats();
    
    if (stats.mean === null) {
      return { spherical: null, quality: null, stats: stats };
    }

    // 1. LCA 校正
    const correctedVergence = this.applyLCACorrection(stats.mean, useBlueLight);
    
    // 2. DoF 校正
    const finalRefraction = this.applyDoFCorrection(correctedVergence);

    // 3. 品質評估
    const quality = this.assessQuality(stats);

    return {
      spherical: finalRefraction,
      vergenceMean: stats.mean,
      vergenceStd: stats.std,
      measurementCount: stats.count,
      quality: quality,
      stats: stats
    };
  }

  /**
   * 評估測量品質
   * @param {Object} stats - vergence 統計資料
   * @returns {Object} {score, flags}
   */
  assessQuality(stats) {
    const flags = [];
    let score = 100;

    // 檢查測量次數
    if (stats.count < 3) {
      flags.push('INSUFFICIENT_MEASUREMENTS');
      score -= 30;
    }

    // 檢查重測一致性
    const stdThreshold = 0.50; // D
    if (stats.std > stdThreshold) {
      flags.push('HIGH_VARIABILITY');
      score -= 20;
    }

    // 檢查合理性範圍
    const minVergence = -10; // -10D (高度近視)
    const maxVergence = 5;   // +5D (高度遠視)
    if (stats.mean < minVergence || stats.mean > maxVergence) {
      flags.push('OUT_OF_RANGE');
      score -= 30;
    }

    return {
      score: Math.max(0, score),
      flags: flags,
      repeatability: stats.std * 1.96 // 95% CI
    };
  }

  /**
   * 設定校正參數
   * @param {number} alpha - 截距
   * @param {number} beta - 斜率
   */
  setCalibrationParams(alpha, beta) {
    this.alpha = alpha;
    this.beta = beta;
  }

  /**
   * 從校正資料估計參數
   * @param {Array} calibrationData - [{vergenceMean, clinicalRx}]
   */
  estimateCalibrationParams(calibrationData) {
    if (calibrationData.length < 2) {
      console.warn('[RefractionCalculator] Insufficient calibration data');
      return;
    }

    // 最小平方法估計
    const n = calibrationData.length;
    const x = calibrationData.map(d => d.vergenceMean);
    const y = calibrationData.map(d => d.clinicalRx);

    const xMean = x.reduce((a, b) => a + b) / n;
    const yMean = y.reduce((a, b) => a + b) / n;

    // β = Cov(x,y) / Var(x)
    const covariance = x.reduce((sum, xi, i) => {
      return sum + (xi - xMean) * (y[i] - yMean);
    }, 0) / (n - 1);

    const variance = x.reduce((sum, xi) => {
      return sum + Math.pow(xi - xMean, 2);
    }, 0) / (n - 1);

    this.beta = covariance / variance;
    this.alpha = yMean - this.beta * xMean;

    console.log(`[RefractionCalculator] Calibration: α=${this.alpha.toFixed(3)}, β=${this.beta.toFixed(3)}`);
  }

  /**
   * 重置測量記錄
   */
  reset() {
    this.measurements = [];
  }

  /**
   * 獲取所有測量記錄
   */
  getAllMeasurements() {
    return [...this.measurements];
  }
}