// 品質控制模組

export class QualityController {
  constructor(config = {}) {
    // 幾何穩定性門檻
    this.distanceStdThreshold = config.distanceStdThreshold || 2.0; // cm
    this.yawAngleThreshold = config.yawAngleThreshold || 15; // degrees
    this.pitchAngleThreshold = config.pitchAngleThreshold || 15; // degrees
    this.rollAngleThreshold = config.rollAngleThreshold || 10; // degrees
    this.faceConfidenceThreshold = config.faceConfidenceThreshold || 0.8;
    
    // 重測一致性門檻
    this.vergenceStdThreshold = config.vergenceStdThreshold || 0.50; // D
    
    // 合理性檢查門檻
    this.visualAcuityRefractionGapThreshold = 
      config.visualAcuityRefractionGapThreshold || 0.5; // logMAR
    
    this.qualityLog = [];
  }

  /**
   * 檢查幾何穩定性
   * @param {Object} geometryData - {distanceStd, yaw, pitch, roll, confidence}
   * @returns {Object} {pass, issues}
   */
  checkGeometricStability(geometryData) {
    const issues = [];
    
    // 距離穩定性
    if (geometryData.distanceStd > this.distanceStdThreshold) {
      issues.push({
        type: 'DISTANCE_UNSTABLE',
        severity: 'HIGH',
        value: geometryData.distanceStd,
        threshold: this.distanceStdThreshold,
        message: `距離不穩定 (σ=${geometryData.distanceStd.toFixed(2)}cm)`
      });
    }

    // 偏航角
    if (Math.abs(geometryData.yaw) > this.yawAngleThreshold) {
      issues.push({
        type: 'YAW_ANGLE_EXCEEDED',
        severity: 'MEDIUM',
        value: geometryData.yaw,
        threshold: this.yawAngleThreshold,
        message: `偏航角過大 (${geometryData.yaw.toFixed(1)}°)`
      });
    }

    // 俯仰角
    if (Math.abs(geometryData.pitch) > this.pitchAngleThreshold) {
      issues.push({
        type: 'PITCH_ANGLE_EXCEEDED',
        severity: 'MEDIUM',
        value: geometryData.pitch,
        threshold: this.pitchAngleThreshold,
        message: `俯仰角過大 (${geometryData.pitch.toFixed(1)}°)`
      });
    }

    // 翻滾角
    if (Math.abs(geometryData.roll) > this.rollAngleThreshold) {
      issues.push({
        type: 'ROLL_ANGLE_EXCEEDED',
        severity: 'LOW',
        value: geometryData.roll,
        threshold: this.rollAngleThreshold,
        message: `翻滾角過大 (${geometryData.roll.toFixed(1)}°)`
      });
    }

    // 臉部追蹤信心值
    if (geometryData.confidence < this.faceConfidenceThreshold) {
      issues.push({
        type: 'LOW_FACE_CONFIDENCE',
        severity: 'HIGH',
        value: geometryData.confidence,
        threshold: this.faceConfidenceThreshold,
        message: `臉部追蹤信心值過低 (${(geometryData.confidence * 100).toFixed(0)}%)`
      });
    }

    const pass = issues.filter(i => i.severity === 'HIGH').length === 0;

    return { pass, issues };
  }

  /**
   * 檢查重測一致性
   * @param {number} vergenceStd - vergence 標準差 (D)
   * @returns {Object} {pass, issue}
   */
  checkRetestConsistency(vergenceStd) {
    const pass = vergenceStd < this.vergenceStdThreshold;
    
    let issue = null;
    if (!pass) {
      issue = {
        type: 'RETEST_INCONSISTENT',
        severity: 'HIGH',
        value: vergenceStd,
        threshold: this.vergenceStdThreshold,
        message: `重測結果不一致 (σ=${vergenceStd.toFixed(2)}D)`
      };
    }

    return { pass, issue };
  }

  /**
   * 合理性檢查
   * @param {number} logMAR - 視力測試結果
   * @param {number} spherical - 屈光度 (D)
   * @returns {Object} {pass, issue}
   */
  checkReasonableness(logMAR, spherical) {
    // 根據屈光度預測視力範圍
    // 簡化模型：每 1D 近視約 0.3 logMAR
    const predictedLogMAR = Math.abs(spherical) * 0.3;
    const gap = Math.abs(logMAR - predictedLogMAR);
    
    const pass = gap < this.visualAcuityRefractionGapThreshold;
    
    let issue = null;
    if (!pass) {
      issue = {
        type: 'VA_REFRACTION_MISMATCH',
        severity: 'MEDIUM',
        gap: gap,
        threshold: this.visualAcuityRefractionGapThreshold,
        message: `視力與屈光度不匹配 (差距=${gap.toFixed(2)} logMAR)`
      };
    }

    return { pass, issue };
  }

  /**
   * 綜合品質評估
   * @param {Object} data - 所有測量數據
   * @returns {Object} {score, grade, issues, recommendation}
   */
  assessOverallQuality(data) {
    let score = 100;
    const allIssues = [];

    // 1. 幾何穩定性
    if (data.geometry) {
      const geometryCheck = this.checkGeometricStability(data.geometry);
      allIssues.push(...geometryCheck.issues);
      
      geometryCheck.issues.forEach(issue => {
        if (issue.severity === 'HIGH') score -= 20;
        else if (issue.severity === 'MEDIUM') score -= 10;
        else score -= 5;
      });
    }

    // 2. 重測一致性
    if (data.vergenceStd !== undefined) {
      const retestCheck = this.checkRetestConsistency(data.vergenceStd);
      if (retestCheck.issue) {
        allIssues.push(retestCheck.issue);
        score -= 20;
      }
    }

    // 3. 合理性
    if (data.logMAR !== undefined && data.spherical !== undefined) {
      const reasonCheck = this.checkReasonableness(data.logMAR, data.spherical);
      if (reasonCheck.issue) {
        allIssues.push(reasonCheck.issue);
        score -= 15;
      }
    }

    // 4. 測量次數
    if (data.measurementCount < 3) {
      allIssues.push({
        type: 'INSUFFICIENT_MEASUREMENTS',
        severity: 'HIGH',
        value: data.measurementCount,
        threshold: 3,
        message: `測量次數不足 (${data.measurementCount}/3)`
      });
      score -= 30;
    }

    score = Math.max(0, Math.min(100, score));

    // 評級
    let grade;
    if (score >= 90) grade = 'EXCELLENT';
    else if (score >= 75) grade = 'GOOD';
    else if (score >= 60) grade = 'FAIR';
    else if (score >= 40) grade = 'POOR';
    else grade = 'UNRELIABLE';

    // 建議
    let recommendation;
    if (grade === 'EXCELLENT' || grade === 'GOOD') {
      recommendation = '測量品質良好，結果可信';
    } else if (grade === 'FAIR') {
      recommendation = '測量品質尚可，建議重測以提高準確度';
    } else {
      recommendation = '測量品質不佳，強烈建議重測';
    }

    // 記錄
    this.qualityLog.push({
      timestamp: Date.now(),
      score: score,
      grade: grade,
      issues: allIssues,
      data: data
    });

    return {
      score: score,
      grade: grade,
      issues: allIssues,
      recommendation: recommendation
    };
  }

  /**
   * 獲取品質報告
   */
  getQualityReport() {
    return [...this.qualityLog];
  }

  /**
   * 重置
   */
  reset() {
    this.qualityLog = [];
  }
}