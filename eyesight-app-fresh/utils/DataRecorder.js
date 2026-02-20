// 資料記錄模組

import * as Device from 'expo-device';

export class DataRecorder {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.records = [];
    this.deviceInfo = null;
  }

  /**
   * 生成唯一 session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 初始化裝置資訊
   */
  async initializeDeviceInfo() {
    this.deviceInfo = {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      modelId: Device.modelId,
      deviceName: Device.deviceName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platformApiLevel: Device.platformApiLevel,
      deviceYearClass: Device.deviceYearClass,
    };
  }

  /**
   * 創建新的測試記錄
   * @param {string} eye - 'left' 或 'right'
   * @param {Object} config - 測試配置
   */
  createTestRecord(eye, config = {}) {
    const record = {
      sessionId: this.sessionId,
      recordId: `${this.sessionId}-${eye}`,
      timestamp: new Date().toISOString(),
      eye: eye,
      deviceInfo: this.deviceInfo,
      softwareVersion: '1.0.0',
      
      // 配置參數
      config: {
        ppi: config.ppi || 401,
        calibrationDistance: config.calibrationDistance || 40,
        useBlueLight: config.useBlueLight !== false,
        ...config
      },
      
      // 測量數據
      data: {
        // 距離時間序列
        distanceTimeSeries: [],
        
        // 姿態角時間序列
        poseTimeSeries: [],
        
        // 視力測試
        visualAcuity: null,
        
        // 遠點測量
        farPointMeasurements: [],
        
        // 品質控制
        qualityMetrics: null,
        
        // 最終結果
        results: null
      }
    };

    this.records.push(record);
    return record;
  }

  /**
   * 記錄距離數據點
   * @param {string} recordId
   * @param {Object} dataPoint - {timestamp, distance, pixelWidth, yaw, pitch, roll}
   */
  recordDistancePoint(recordId, dataPoint) {
    const record = this.records.find(r => r.recordId === recordId);
    if (!record) return;

    record.data.distanceTimeSeries.push({
      timestamp: dataPoint.timestamp || Date.now(),
      distance: dataPoint.distance,
      pixelWidth: dataPoint.pixelWidth,
      correctedWidth: dataPoint.correctedWidth,
      yaw: dataPoint.yaw || 0,
      pitch: dataPoint.pitch || 0,
      roll: dataPoint.roll || 0
    });
  }

  /**
   * 記錄姿態數據
   * @param {string} recordId
   * @param {Object} poseData - {timestamp, yaw, pitch, roll, confidence}
   */
  recordPose(recordId, poseData) {
    const record = this.records.find(r => r.recordId === recordId);
    if (!record) return;

    record.data.poseTimeSeries.push({
      timestamp: poseData.timestamp || Date.now(),
      yaw: poseData.yaw,
      pitch: poseData.pitch,
      roll: poseData.roll,
      confidence: poseData.confidence
    });
  }

  /**
   * 記錄視力測試結果
   * @param {string} recordId
   * @param {Object} vaResult - {logMAR, snellen, responses, reversals}
   */
  recordVisualAcuity(recordId, vaResult) {
    const record = this.records.find(r => r.recordId === recordId);
    if (!record) return;

    record.data.visualAcuity = {
      logMAR: vaResult.logMAR,
      snellen: vaResult.snellen,
      threshold: vaResult.threshold,
      responses: vaResult.responses,
      reversals: vaResult.reversals,
      trialCount: vaResult.trialCount,
      timestamp: Date.now()
    };
  }

  /**
   * 記錄遠點測量
   * @param {string} recordId
   * @param {Object} fpMeasurement - {farPointDistance, vergence, ...}
   */
  recordFarPointMeasurement(recordId, fpMeasurement) {
    const record = this.records.find(r => r.recordId === recordId);
    if (!record) return;

    record.data.farPointMeasurements.push({
      timestamp: Date.now(),
      farPointDistance: fpMeasurement.farPointDistance,
      vergence: fpMeasurement.vergence,
      distanceStd: fpMeasurement.distanceStd,
      distanceMean: fpMeasurement.distanceMean,
      ...fpMeasurement
    });
  }

  /**
   * 記錄品質指標
   * @param {string} recordId
   * @param {Object} qualityMetrics
   */
  recordQualityMetrics(recordId, qualityMetrics) {
    const record = this.records.find(r => r.recordId === recordId);
    if (!record) return;

    record.data.qualityMetrics = {
      timestamp: Date.now(),
      overallScore: qualityMetrics.score,
      grade: qualityMetrics.grade,
      issues: qualityMetrics.issues,
      recommendation: qualityMetrics.recommendation,
      geometricStability: qualityMetrics.geometricStability,
      retestConsistency: qualityMetrics.retestConsistency,
      reasonableness: qualityMetrics.reasonableness
    };
  }

  /**
   * 記錄最終結果
   * @param {string} recordId
   * @param {Object} results
   */
  recordFinalResults(recordId, results) {
    const record = this.records.find(r => r.recordId === recordId);
    if (!record) return;

    record.data.results = {
      timestamp: Date.now(),
      spherical: results.spherical,
      vergenceMean: results.vergenceMean,
      vergenceStd: results.vergenceStd,
      measurementCount: results.measurementCount,
      qualityScore: results.qualityScore,
      qualityGrade: results.qualityGrade,
      lcaCorrected: results.lcaCorrected,
      dofCorrected: results.dofCorrected,
      calibrationParams: results.calibrationParams
    };

    // 標記記錄完成
    record.completedAt = new Date().toISOString();
  }

  /**
   * 獲取記錄
   * @param {string} recordId
   */
  getRecord(recordId) {
    return this.records.find(r => r.recordId === recordId);
  }

  /**
   * 獲取所有記錄
   */
  getAllRecords() {
    return [...this.records];
  }

  /**
   * 導出 JSON
   * @param {string} recordId
   */
  exportJSON(recordId) {
    const record = this.getRecord(recordId);
    if (!record) return null;

    return JSON.stringify(record, null, 2);
  }

  /**
   * 導出所有記錄
   */
  exportAllJSON() {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      records: this.records
    }, null, 2);
  }

  /**
   * 生成摘要報告
   * @param {string} recordId
   */
  generateSummary(recordId) {
    const record = this.getRecord(recordId);
    if (!record) return null;

    return {
      recordId: record.recordId,
      eye: record.eye,
      timestamp: record.timestamp,
      deviceModel: record.deviceInfo?.modelName,
      
      visualAcuity: record.data.visualAcuity?.logMAR,
      visualAcuitySnellen: record.data.visualAcuity?.snellen,
      
      spherical: record.data.results?.spherical,
      measurementCount: record.data.results?.measurementCount,
      
      qualityScore: record.data.qualityMetrics?.overallScore,
      qualityGrade: record.data.qualityMetrics?.grade,
      
      issues: record.data.qualityMetrics?.issues?.length || 0,
      recommendation: record.data.qualityMetrics?.recommendation
    };
  }

  /**
   * 清除所有記錄
   */
  clearAll() {
    this.records = [];
    this.sessionId = this.generateSessionId();
  }
}