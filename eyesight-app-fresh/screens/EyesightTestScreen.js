import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';

import { DistanceEstimator } from '../utils/DistanceEstimator';
import { OptotypeController } from '../utils/OptotypeController';
import { StaircaseProtocol, generateDirection, getRotationAngle } from '../utils/StaircaseProtocol';
import { RefractionCalculator } from '../utils/RefractionCalculator';
import { QualityController } from '../utils/QualityController';
import { DataRecorder } from '../utils/DataRecorder';

// Landolt C 組件
const LandoltC = ({ size, gap, stroke, direction }) => {
  const rotation = getRotationAngle(direction);
  
  return (
    <View style={[styles.landoltContainer, { transform: [{ rotate: `${rotation}deg` }] }]}>
      <View style={[styles.landoltC, { 
        width: size, 
        height: size,
        borderWidth: stroke,
        borderRightWidth: 0,
        borderRadius: size / 2
      }]}>
        <View style={[styles.landoltGap, { 
          width: gap,
          right: -gap/2
        }]} />
      </View>
    </View>
  );
};

export default function EyesightTestScreen({ navigation }) {
  // ========== 狀態管理 ==========
  const [phase, setPhase] = useState('intro');
  const [eye, setEye] = useState('right');
  
  // 手動輸入距離
  const [manualDistance, setManualDistance] = useState('40');
  const [currentDistance, setCurrentDistance] = useState(40);
  
  // 視力測試
  const [currentOptotype, setCurrentOptotype] = useState(null);
  const [optotypeSize, setOptotypeSize] = useState(100);
  const [vaThreshold, setVaThreshold] = useState(null);
  const [testProgress, setTestProgress] = useState({ reversals: 0, trials: 0 });
  
  // 遠點測量
  const [farPointCount, setFarPointCount] = useState(0);
  const [farPointProgress, setFarPointProgress] = useState(0);
  
  // 結果
  const [finalResults, setFinalResults] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  
  // ========== 模組實例 ==========
  const distanceEstimator = useRef(new DistanceEstimator()).current;
  const optotypeController = useRef(new OptotypeController(401)).current;
  const staircaseProtocol = useRef(new StaircaseProtocol()).current;
  const refractionCalculator = useRef(new RefractionCalculator()).current;
  const qualityController = useRef(new QualityController()).current;
  const dataRecorder = useRef(new DataRecorder()).current;
  
  const recordId = useRef(null);

  // ========== 初始化 ==========
  React.useEffect(() => {
    (async () => {
      await dataRecorder.initializeDeviceInfo();
    })();
  }, []);

  // ========== 校正流程（手動輸入距離）==========
  const handleCalibration = () => {
    const distance = parseFloat(manualDistance);
    
    if (isNaN(distance) || distance < 20 || distance > 100) {
      Alert.alert('錯誤', '請輸入合理的距離（20-100 cm）');
      return;
    }

    // 模擬臉部寬度（假設平均值）
    const simulatedFaceWidth = 150; // 像素
    
    distanceEstimator.calibrate(distance, simulatedFaceWidth);
    setCurrentDistance(distance);
    
    Alert.alert(
      '校正完成',
      `已校正距離為 ${distance} cm\n校正常數 k = ${distanceEstimator.calibrationConstant.toFixed(2)}`,
      [{ text: '開始視力測試', onPress: startVisualAcuityTest }]
    );
  };

  // ========== 視力測試流程 ==========
  const startVisualAcuityTest = () => {
    recordId.current = dataRecorder.createTestRecord(eye, {
      ppi: 401,
      calibrationDistance: currentDistance,
      useBlueLight: true,
      mode: 'manual' // 標記為手動模式
    }).recordId;
    
    staircaseProtocol.reset();
    setPhase('visualAcuity');
    presentNextOptotype();
  };

  const presentNextOptotype = () => {
    const direction = generateDirection();
    setCurrentOptotype(direction);
    
    // 設定視標大小（基於當前距離）
    if (staircaseProtocol.currentLogMAR !== null) {
      optotypeController.setTargetLogMAR(staircaseProtocol.currentLogMAR);
      const params = optotypeController.getLandoltCParams(currentDistance);
      if (params) {
        setOptotypeSize(params.size);
      }
    }
  };

  const handleResponse = (userDirection) => {
    const correct = userDirection === currentOptotype;
    const result = staircaseProtocol.recordResponse(correct);
    
    setTestProgress({
      reversals: result.reversalCount,
      trials: result.trialCount
    });
    
    if (result.continue) {
      presentNextOptotype();
    } else {
      const threshold = result.threshold;
      setVaThreshold(threshold);
      
      dataRecorder.recordVisualAcuity(recordId.current, {
        logMAR: threshold,
        snellen: optotypeController.logMARToSnellen(threshold),
        threshold: threshold,
        responses: staircaseProtocol.responses,
        reversals: staircaseProtocol.reversals,
        trialCount: staircaseProtocol.trialCount
      });
      
      Alert.alert(
        '視力測試完成',
        `視力: ${optotypeController.logMARToSnellen(threshold)}\nlogMAR: ${threshold.toFixed(2)}`,
        [{ text: '繼續遠點測量', onPress: startFarPointTest }]
      );
    }
  };

  // ========== 遠點測量流程 ==========
  const startFarPointTest = () => {
    setPhase('farPoint');
    refractionCalculator.reset();
    setFarPointCount(0);
    setFarPointProgress(0);
  };

  const recordFarPoint = () => {
    const distance = parseFloat(manualDistance);
    
    if (isNaN(distance) || distance < 20 || distance > 100) {
      Alert.alert('錯誤', '請輸入合理的距離（20-100 cm）');
      return;
    }

    refractionCalculator.recordMeasurement(distance, {
      std: 0.5, // 模擬穩定度
      manual: true
    });
    
    dataRecorder.recordFarPointMeasurement(recordId.current, {
      farPointDistance: distance,
      vergence: -100 / distance,
      distanceStd: 0.5,
      distanceMean: distance
    });
    
    const newCount = farPointCount + 1;
    setFarPointCount(newCount);
    setFarPointProgress(newCount / 3);
    
    if (newCount >= 3) {
      calculateFinalResults();
    } else {
      Alert.alert('已記錄', `第 ${newCount}/3 次測量完成\n請調整距離後記錄下一次`);
    }
  };

  // ========== 計算最終結果 ==========
  const calculateFinalResults = () => {
    const refraction = refractionCalculator.calculateRefraction(true);
    
    const qualityData = {
      geometry: {
        distanceStd: 0.5,
        yaw: 0,
        pitch: 0,
        roll: 0,
        confidence: 0.8
      },
      vergenceStd: refraction.vergenceStd,
      logMAR: vaThreshold,
      spherical: refraction.spherical,
      measurementCount: refraction.measurementCount
    };
    
    const quality = qualityController.assessOverallQuality(qualityData);
    
    dataRecorder.recordQualityMetrics(recordId.current, quality);
    dataRecorder.recordFinalResults(recordId.current, {
      ...refraction,
      qualityScore: quality.score,
      qualityGrade: quality.grade,
      lcaCorrected: true,
      dofCorrected: true,
      calibrationParams: {
        alpha: refractionCalculator.alpha,
        beta: refractionCalculator.beta
      }
    });
    
    setFinalResults(refraction);
    setQualityReport(quality);
    setPhase('results');
  };

  // ========== 輔助函數 ==========
  const getDirectionLabel = (dir) => {
    const labels = { up: '↑', down: '↓', left: '←', right: '→' };
    return labels[dir];
  };

  const getQualityColor = (grade) => {
    const colors = {
      'EXCELLENT': '#4CAF50',
      'GOOD': '#8BC34A',
      'FAIR': '#FFC107',
      'POOR': '#FF9800',
      'UNRELIABLE': '#f44336'
    };
    return colors[grade] || '#666';
  };

  // ========== 渲染 ==========
  return (
    <ScrollView style={styles.container}>
      {/* 介紹畫面 */}
      {phase === 'intro' && (
        <View style={styles.section}>
          <Text style={styles.title}>🔬 專業視力與屈光檢測系統</Text>
          <Text style={styles.subtitle}>簡化版本（適用於 Expo Go）</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>📐 系統架構</Text>
            <Text style={styles.cardText}>
              1. 手動距離輸入（替代臉部追蹤）{'\n'}
              2. 視標渲染與角度控制{'\n'}
              3. 視力測試 (Landolt C + Staircase){'\n'}
              4. 遠點測光與屈光轉換{'\n'}
              5. 品質控制與結果輸出
            </Text>
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>ℹ️ 簡化版本說明</Text>
            <Text style={styles.cardText}>
              此版本不使用相機和臉部檢測，改為手動輸入距離。{'\n\n'}
              雖然精度較低，但所有核心演算法完全相同：{'\n'}
              • 視標動態縮放{'\n'}
              • Staircase 自適應測試{'\n'}
              • LCA + DoF 屈光校正{'\n'}
              • 完整品質控制
            </Text>
          </View>

          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setPhase('calibration')}
          >
            <Text style={styles.startButtonText}>開始測試</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 校正畫面 */}
      {phase === 'calibration' && (
        <View style={styles.section}>
          <Text style={styles.title}>距離校正</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>📏 使用方法</Text>
            <Text style={styles.cardText}>
              1. 使用尺或手臂估測手機到眼睛的距離{'\n'}
              2. 輸入距離（建議 30-50 cm）{'\n'}
              3. 保持這個距離完成測試
            </Text>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>請輸入距離（cm）：</Text>
            <TextInput
              style={styles.input}
              value={manualDistance}
              onChangeText={setManualDistance}
              keyboardType="numeric"
              placeholder="40"
            />
            <Text style={styles.inputHint}>建議範圍：30-50 cm</Text>
          </View>

          <TouchableOpacity
            style={styles.calibrateButton}
            onPress={handleCalibration}
          >
            <Text style={styles.buttonText}>完成校正</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 視力測試畫面 */}
      {phase === 'visualAcuity' && (
        <View style={styles.section}>
          <Text style={styles.title}>視力測試</Text>
          
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>
              反轉: {testProgress.reversals}/4  |  試驗: {testProgress.trials}/30
            </Text>
          </View>

          <View style={styles.distanceReminder}>
            <Text style={styles.reminderText}>
              保持距離: {currentDistance} cm
            </Text>
          </View>

          {currentOptotype && optotypeSize && (
            <>
              <View style={styles.optotypeArea}>
                <LandoltC
                  size={optotypeSize}
                  gap={optotypeSize / 5}
                  stroke={optotypeSize / 5}
                  direction={currentOptotype}
                />
              </View>

              <Text style={styles.instruction}>請指出缺口方向：</Text>

              <View style={styles.responseButtons}>
                {['up', 'down', 'left', 'right'].map(dir => (
                  <TouchableOpacity
                    key={dir}
                    style={styles.directionButton}
                    onPress={() => handleResponse(dir)}
                  >
                    <Text style={styles.directionText}>{getDirectionLabel(dir)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      )}

      {/* 遠點測量畫面 */}
      {phase === 'farPoint' && (
        <View style={styles.section}>
          <Text style={styles.title}>遠點測量</Text>
          
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>🔵 操作說明</Text>
            <Text style={styles.cardText}>
              1. 觀察藍色圓形{'\n'}
              2. 調整手機距離直到剛好清晰{'\n'}
              3. 測量或估計距離並輸入{'\n'}
              4. 點擊「記錄遠點」{'\n'}
              5. 重複 3 次
            </Text>
          </View>

          <View style={styles.blueTargetContainer}>
            <View style={styles.blueTarget} />
            <Text style={styles.targetLabel}>請調整距離直到清晰</Text>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>當前清晰距離（cm）：</Text>
            <TextInput
              style={styles.input}
              value={manualDistance}
              onChangeText={setManualDistance}
              keyboardType="numeric"
              placeholder="45"
            />
          </View>

          <TouchableOpacity
            style={styles.recordButton}
            onPress={recordFarPoint}
          >
            <Text style={styles.buttonText}>
              記錄遠點 ({farPointCount}/3)
            </Text>
          </TouchableOpacity>

          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${farPointProgress * 100}%` }]} />
          </View>
        </View>
      )}

      {/* 結果畫面 */}
      {phase === 'results' && finalResults && qualityReport && (
        <View style={styles.section}>
          <Text style={styles.title}>📊 測量結果</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>屈光度（球鏡）</Text>
            <Text style={styles.resultValue}>
              {finalResults.spherical.toFixed(2)} D
            </Text>
            <Text style={styles.resultSubtext}>(LCA + DoF 校正後)</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>視力</Text>
            <Text style={styles.resultValue}>
              {optotypeController.logMARToSnellen(vaThreshold)}
            </Text>
            <Text style={styles.resultSubtext}>{vaThreshold.toFixed(2)} logMAR</Text>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>品質分數</Text>
            <Text style={[styles.resultValue, { color: getQualityColor(qualityReport.grade) }]}>
              {qualityReport.score} / 100
            </Text>
            <Text style={styles.resultSubtext}>{qualityReport.grade}</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📈 測量統計</Text>
            <Text style={styles.statsText}>
              • vergence 平均: {finalResults.vergenceMean.toFixed(2)} D{'\n'}
              • vergence 標準差: {finalResults.vergenceStd.toFixed(2)} D{'\n'}
              • 重測穩定度: ±{(finalResults.vergenceStd * 1.96).toFixed(2)} D (95% CI){'\n'}
              • 測量次數: {finalResults.measurementCount}
            </Text>
          </View>

          {qualityReport.issues.length > 0 && (
            <View style={styles.issuesCard}>
              <Text style={styles.issuesTitle}>⚠️ 品質提醒</Text>
              {qualityReport.issues.map((issue, idx) => (
                <Text key={idx} style={styles.issueText}>• {issue.message}</Text>
              ))}
            </View>
          )}

          <View style={styles.recommendationCard}>
            <Text style={styles.recommendationTitle}>💡 建議</Text>
            <Text style={styles.recommendationText}>{qualityReport.recommendation}</Text>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>完成</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => {
              const data = dataRecorder.exportJSON(recordId.current);
              console.log('Exported data:', data);
              Alert.alert('數據已導出', '完整測量數據已保存到控制台');
            }}
          >
            <Text style={styles.exportButtonText}>📥 導出完整數據</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  warningCard: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#f57c00',
  },
  cardText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  startButton: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  calibrateButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  distanceReminder: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  reminderText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    color: '#1976d2',
  },
  optotypeArea: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  landoltContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landoltC: {
    borderColor: '#000',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  landoltGap: {
    position: 'absolute',
    top: '40%',
    backgroundColor: '#fff',
    height: '20%',
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  responseButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  directionButton: {
    backgroundColor: '#000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionText: {
    color: '#fff',
    fontSize: 30,
  },
  blueTargetContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  blueTarget: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2196F3',
    marginBottom: 12,
  },
  targetLabel: {
    fontSize: 14,
    color: '#666',
  },
  recordButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  resultCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultSubtext: {
    fontSize: 14,
    color: '#999',
  },
  statsCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    lineHeight: 22,
    color: '#333',
  },
  issuesCard: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  issuesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#f57c00',
  },
  issueText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  recommendationCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  exportButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 40,
  },
  exportButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});