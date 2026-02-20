import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import * as Device from 'expo-device';

import { DistanceEstimator } from '../utils/DistanceEstimator';
import { OptotypeController } from '../utils/OptotypeController';
import { StaircaseProtocol, generateDirection, getRotationAngle } from '../utils/StaircaseProtocol';
import { RefractionCalculator } from '../utils/RefractionCalculator';
import { QualityController } from '../utils/QualityController';
import { DataRecorder } from '../utils/DataRecorder';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const [phase, setPhase] = useState('intro'); // intro, permission, calibration, visualAcuity, farPoint, results
  const [hasPermission, setHasPermission] = useState(null);
  const [eye, setEye] = useState('right');
  
  // 相機與臉部追蹤
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentFace, setCurrentFace] = useState(null);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [distanceStability, setDistanceStability] = useState(null);
  const [currentPose, setCurrentPose] = useState({ yaw: 0, pitch: 0, roll: 0 });
  
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
  const optotypeController = useRef(new OptotypeController(401)).current; // iPhone PPI
  const staircaseProtocol = useRef(new StaircaseProtocol()).current;
  const refractionCalculator = useRef(new RefractionCalculator()).current;
  const qualityController = useRef(new QualityController()).current;
  const dataRecorder = useRef(new DataRecorder()).current;
  
  const recordId = useRef(null);
  const cameraRef = useRef(null);

  // ========== 初始化 ==========
  useEffect(() => {
    (async () => {
      await dataRecorder.initializeDeviceInfo();
    })();
  }, []);

  // ========== 請求相機權限 ==========
  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status === 'granted') {
      setPhase('calibration');
    } else {
      Alert.alert('權限被拒絕', '需要相機權限才能進行臉部追蹤測量');
    }
  };

  // ========== 臉部檢測處理 ==========
  const handleFacesDetected = ({ faces }) => {
    if (faces.length === 0) {
      setFaceDetected(false);
      setCurrentFace(null);
      return;
    }

    setFaceDetected(true);
    const face = faces[0];
    setCurrentFace(face);

    // 提取臉部寬度（像素）
    const faceWidth = face.bounds.size.width;
    
    // 提取姿態角（度）
    const yaw = face.yawAngle || 0;
    const pitch = face.pitchAngle || 0;
    const roll = face.rollAngle || 0;
    
    setCurrentPose({ yaw, pitch, roll });

    // 估計距離
    if (distanceEstimator.calibrationConstant) {
      const distance = distanceEstimator.estimateDistance(faceWidth, yaw);
      
      if (distance) {
        setCurrentDistance(distance);
        
        // 獲取穩定性
        const { std } = distanceEstimator.getAverageDistance(1000);
        setDistanceStability(std);
        
        // 記錄數據
        if (recordId.current && phase !== 'intro' && phase !== 'permission') {
          dataRecorder.recordDistancePoint(recordId.current, {
            timestamp: Date.now(),
            distance: distance,
            pixelWidth: faceWidth,
            correctedWidth: faceWidth / Math.cos((yaw * Math.PI) / 180),
            yaw: yaw,
            pitch: pitch,
            roll: roll
          });
          
          dataRecorder.recordPose(recordId.current, {
            timestamp: Date.now(),
            yaw: yaw,
            pitch: pitch,
            roll: roll,
            confidence: face.rollAngle !== undefined ? 0.9 : 0.7
          });
        }
        
        // 動態調整視標大小（視力測試階段）
        if (phase === 'visualAcuity' && staircaseProtocol.currentLogMAR !== null) {
          optotypeController.setTargetLogMAR(staircaseProtocol.currentLogMAR);
          const params = optotypeController.getLandoltCParams(distance);
          if (params) {
            setOptotypeSize(params.size);
          }
        }
      }
    }
  };

  // ========== 校正流程 ==========
  const handleCalibration = () => {
    if (!faceDetected || !currentDistance) {
      Alert.alert('提示', '請確保臉部在畫面中央');
      return;
    }

    if (Math.abs(currentPose.yaw) > 15) {
      Alert.alert('提示', '請保持頭部正對螢幕（偏航角過大）');
      return;
    }

    if (!distanceEstimator.isStable(2.0)) {
      Alert.alert('提示', '請保持頭部穩定（距離波動過大）');
      return;
    }

    // 使用當前平均距離和像素寬度進行校正
    const calibrationDistance = 40; // cm
    const { mean: avgDistance } = distanceEstimator.getAverageDistance(1000);
    
    if (avgDistance && currentFace) {
      // 計算平均臉部像素寬度
      const avgFaceWidth = currentFace.bounds.size.width;
      
      // 校正：k = d0 * s0
      distanceEstimator.calibrate(calibrationDistance, avgFaceWidth);
      
      Alert.alert(
        '校正完成',
        `已校正距離基準為 ${calibrationDistance} cm\n校正常數 k = ${distanceEstimator.calibrationConstant.toFixed(2)}`,
        [{ text: '開始視力測試', onPress: startVisualAcuityTest }]
      );
    }
  };

  // ========== 視力測試流程 ==========
  const startVisualAcuityTest = () => {
    recordId.current = dataRecorder.createTestRecord(eye, {
      ppi: 401,
      calibrationDistance: 40,
      useBlueLight: true
    }).recordId;
    
    staircaseProtocol.reset();
    setPhase('visualAcuity');
    presentNextOptotype();
  };

  const presentNextOptotype = () => {
    const direction = generateDirection();
    setCurrentOptotype(direction);
    
    // 設定視標大小（基於當前距離）
    if (currentDistance && staircaseProtocol.currentLogMAR !== null) {
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
      // 視力測試完成
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
    if (!distanceEstimator.isStable(2.0)) {
      Alert.alert('提示', '請保持頭部穩定後再記錄');
      return;
    }

    const { mean, std } = distanceEstimator.getAverageDistance(1000);
    
    if (mean) {
      refractionCalculator.recordMeasurement(mean, {
        std: std,
        yaw: currentPose.yaw,
        pitch: currentPose.pitch,
        roll: currentPose.roll
      });
      
      dataRecorder.recordFarPointMeasurement(recordId.current, {
        farPointDistance: mean,
        vergence: -100 / mean,
        distanceStd: std,
        distanceMean: mean
      });
      
      const newCount = farPointCount + 1;
      setFarPointCount(newCount);
      setFarPointProgress(newCount / 3);
      
      if (newCount >= 3) {
        calculateFinalResults();
      } else {
        Alert.alert('已記錄', `第 ${newCount}/3 次測量完成`);
      }
    }
  };

  // ========== 計算最終結果 ==========
  const calculateFinalResults = () => {
    const refraction = refractionCalculator.calculateRefraction(true);
    
    const qualityData = {
      geometry: {
        distanceStd: distanceStability || 0,
        yaw: currentPose.yaw,
        pitch: currentPose.pitch,
        roll: currentPose.roll,
        confidence: faceDetected ? 0.9 : 0.5
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
    <View style={styles.container}>
      {/* 介紹畫面 */}
      {phase === 'intro' && (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.introContainer}>
            <Text style={styles.introTitle}>🔬 專業視力與屈光檢測系統</Text>
            
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>📐 系統架構</Text>
              <Text style={styles.cardText}>
                1. 臉部追蹤與距離估測{'\n'}
                2. 視標渲染與角度控制{'\n'}
                3. 視力測試 (Landolt C + Staircase){'\n'}
                4. 遠點測光與屈光轉換{'\n'}
                5. 品質控制與結果輸出
              </Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>🔬 核心技術</Text>
              <Text style={styles.techText}>
                • 距離估測: d = k / s{'\n'}
                • 姿態修正: s_corr = s / cos(θ){'\n'}
                • 視角恆定: H(t) = α₀ · d(t){'\n'}
                • LCA校正: v_white = v - 0.70D{'\n'}
                • DoF校正: AppRx = α + β·v
              </Text>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ 系統限制</Text>
              <Text style={styles.cardText}>
                • 測量範圍: -10D ~ +5D{'\n'}
                • 僅球鏡度數（無散光）{'\n'}
                • 不能替代專業眼科檢查{'\n'}
                • 需要良好光線與穩定環境
              </Text>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setPhase('permission')}
            >
              <Text style={styles.startButtonText}>開始專業檢測</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 權限請求畫面 */}
      {phase === 'permission' && (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>📷 需要相機權限</Text>
          <Text style={styles.permissionText}>
            本系統使用前置相機進行臉部追蹤{'\n'}
            以估測距離並確保測量準確性
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>授予相機權限</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 校正畫面 */}
      {phase === 'calibration' && hasPermission && (
        <View style={styles.container}>
          <CameraView
            style={styles.camera}
            facing="front"
            onFacesDetected={handleFacesDetected}
            faceDetectorSettings={{
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
              tracking: true,
            }}
            ref={cameraRef}
          >
            <View style={styles.cameraOverlay}>
              {/* 狀態指示 */}
              <View style={styles.statusPanel}>
                <Text style={[styles.statusText, { color: faceDetected ? '#4CAF50' : '#f44336' }]}>
                  {faceDetected ? '✓ 臉部偵測' : '✗ 未偵測到臉部'}
                </Text>
                <Text style={styles.statusText}>
                  距離: {currentDistance ? `${currentDistance.toFixed(1)} cm` : '--'}
                </Text>
                <Text style={styles.statusText}>
                  穩定度: {distanceStability ? `σ=${distanceStability.toFixed(2)}cm` : '--'}
                </Text>
                <Text style={styles.statusText}>
                  偏航角: {currentPose.yaw.toFixed(1)}°
                </Text>
              </View>

              {/* 臉部框 */}
              {currentFace && (
                <View
                  style={[
                    styles.faceBox,
                    {
                      left: currentFace.bounds.origin.x,
                      top: currentFace.bounds.origin.y,
                      width: currentFace.bounds.size.width,
                      height: currentFace.bounds.size.height,
                    },
                  ]}
                />
              )}
            </View>
          </CameraView>

          <View style={styles.calibrationPanel}>
            <Text style={styles.calibrationTitle}>距離校正</Text>
            <Text style={styles.calibrationInstruction}>
              1. 保持手機距離眼睛約 40 cm{'\n'}
              2. 臉部居中，頭部正對螢幕{'\n'}
              3. 保持穩定直到看到 ✓ 標示
            </Text>
            <TouchableOpacity
              style={[
                styles.calibrateButton,
                (!faceDetected || !distanceEstimator.isStable(2.0)) && styles.buttonDisabled
              ]}
              onPress={handleCalibration}
              disabled={!faceDetected || !distanceEstimator.isStable(2.0)}
            >
              <Text style={styles.calibrateButtonText}>完成校正</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 視力測試畫面 */}
      {phase === 'visualAcuity' && (
        <View style={styles.container}>
          <CameraView
            style={styles.cameraSmall}
            facing="front"
            onFacesDetected={handleFacesDetected}
            faceDetectorSettings={{
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
              tracking: true,
            }}
          >
            <View style={styles.miniStatus}>
              <Text style={styles.miniStatusText}>
                距離: {currentDistance ? `${currentDistance.toFixed(0)}cm` : '--'}
              </Text>
            </View>
          </CameraView>

          <View style={styles.testPanel}>
            <View style={styles.progressBar}>
              <Text style={styles.progressText}>
                反轉: {testProgress.reversals}/4  試驗: {testProgress.trials}/30
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
        </View>
      )}

      {/* 遠點測量畫面 */}
      {phase === 'farPoint' && (
        <View style={styles.container}>
          <CameraView
            style={styles.camera}
            facing="front"
            onFacesDetected={handleFacesDetected}
            faceDetectorSettings={{
              mode: FaceDetector.FaceDetectorMode.fast,
              detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
              runClassifications: FaceDetector.FaceDetectorClassifications.none,
              tracking: true,
            }}
          >
            <View style={styles.farPointOverlay}>
              <View style={styles.blueTarget} />
              <Text style={styles.farPointInstruction}>
                調整手機距離{'\n'}
                直到藍色圓形剛好清晰
              </Text>
            </View>
          </CameraView>

          <View style={styles.farPointPanel}>
            <View style={styles.measurementInfo}>
              <Text style={styles.measurementLabel}>當前距離:</Text>
              <Text style={styles.measurementValue}>
                {currentDistance ? `${currentDistance.toFixed(1)} cm` : '--'}
              </Text>
              <Text style={styles.measurementLabel}>穩定度:</Text>
              <Text style={styles.measurementValue}>
                {distanceStability ? `σ=${distanceStability.toFixed(2)}cm` : '--'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.recordButton,
                !distanceEstimator.isStable(2.0) && styles.buttonDisabled
              ]}
              onPress={recordFarPoint}
              disabled={!distanceEstimator.isStable(2.0)}
            >
              <Text style={styles.recordButtonText}>
                記錄遠點 ({farPointCount}/3)
              </Text>
            </TouchableOpacity>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${farPointProgress * 100}%` }]} />
            </View>
          </View>
        </View>
      )}

      {/* 結果畫面 */}
      {phase === 'results' && finalResults && qualityReport && (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>📊 測量結果</Text>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>屈光度（球鏡）</Text>
              <Text style={styles.resultValue}>
                {finalResults.spherical.toFixed(2)} D
              </Text>
              <Text style={styles.resultSubtext}>
                (LCA + DoF 校正後)
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>視力</Text>
              <Text style={styles.resultValue}>
                {optotypeController.logMARToSnellen(vaThreshold)}
              </Text>
              <Text style={styles.resultSubtext}>
                {vaThreshold.toFixed(2)} logMAR
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>品質分數</Text>
              <Text style={[styles.resultValue, { color: getQualityColor(qualityReport.grade) }]}>
                {qualityReport.score} / 100
              </Text>
              <Text style={styles.resultSubtext}>
                {qualityReport.grade}
              </Text>
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
                  <Text key={idx} style={styles.issueText}>
                    • {issue.message}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>💡 建議</Text>
              <Text style={styles.recommendationText}>
                {qualityReport.recommendation}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.doneButtonText}>完成</Text>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // 介紹畫面
  introContainer: {
    padding: 20,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
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
  techText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  startButton: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // 權限畫面
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#000',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // 相機相關
  camera: {
    flex: 1,
  },
  cameraSmall: {
    height: 150,
  },
  cameraOverlay: {
    flex: 1,
  },
  statusPanel: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 8,
  },
  miniStatus: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  miniStatusText: {
    color: '#fff',
    fontSize: 12,
  },

  // 校正畫面
  calibrationPanel: {
    backgroundColor: '#fff',
    padding: 20,
  },
  calibrationTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  calibrationInstruction: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 20,
  },
  calibrateButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  calibrateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },

  // 視力測試
  testPanel: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  progressBar: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  optotypeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // 遠點測量
  farPointOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueTarget: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2196F3',
    marginBottom: 20,
  },
  farPointInstruction: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 8,
  },
  farPointPanel: {
    backgroundColor: '#fff',
    padding: 20,
  },
  measurementInfo: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  measurementLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  recordButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

  // 結果畫面
  resultsContainer: {
    padding: 20,
  },
  resultsTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
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
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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