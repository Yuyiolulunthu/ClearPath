import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';

import { DistanceEstimator } from '../utils/DistanceEstimator';
import { OptotypeController } from '../utils/OptotypeController';
import { StaircaseProtocol, generateDirection, getRotationAngle } from '../utils/StaircaseProtocol';
import { RefractionCalculator } from '../utils/RefractionCalculator';
import { QualityController } from '../utils/QualityController';
import { DataRecorder } from '../utils/DataRecorder';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Landolt C Component
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
  // State
  const [phase, setPhase] = useState('intro');
  const [eye, setEye] = useState('right');
  const [manualDistance, setManualDistance] = useState('40');
  const [currentDistance, setCurrentDistance] = useState(40);
  const [currentOptotype, setCurrentOptotype] = useState(null);
  const [optotypeSize, setOptotypeSize] = useState(100);
  const [vaThreshold, setVaThreshold] = useState(null);
  const [testProgress, setTestProgress] = useState({ reversals: 0, trials: 0 });
  const [farPointCount, setFarPointCount] = useState(0);
  const [finalResults, setFinalResults] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  
  // Modules
  const distanceEstimator = useRef(new DistanceEstimator()).current;
  const optotypeController = useRef(new OptotypeController(401)).current;
  const staircaseProtocol = useRef(new StaircaseProtocol()).current;
  const refractionCalculator = useRef(new RefractionCalculator()).current;
  const qualityController = useRef(new QualityController()).current;
  const dataRecorder = useRef(new DataRecorder()).current;
  const recordId = useRef(null);

  React.useEffect(() => {
    (async () => {
      await dataRecorder.initializeDeviceInfo();
    })();
  }, []);

  const handleCalibration = () => {
    const distance = parseFloat(manualDistance);
    if (isNaN(distance) || distance < 20 || distance > 100) {
      Alert.alert('Invalid Input', 'Please enter a distance between 20-100 cm');
      return;
    }
    distanceEstimator.calibrate(distance, 150);
    setCurrentDistance(distance);
    startVisualAcuityTest();
  };

  const startVisualAcuityTest = () => {
    recordId.current = dataRecorder.createTestRecord(eye, {
      ppi: 401,
      calibrationDistance: currentDistance,
      useBlueLight: true,
      mode: 'manual'
    }).recordId;
    staircaseProtocol.reset();
    setPhase('visualAcuity');
    presentNextOptotype();
  };

  const presentNextOptotype = () => {
    const direction = generateDirection();
    setCurrentOptotype(direction);
    if (staircaseProtocol.currentLogMAR !== null) {
      optotypeController.setTargetLogMAR(staircaseProtocol.currentLogMAR);
      const params = optotypeController.getLandoltCParams(currentDistance);
      if (params) setOptotypeSize(params.size);
    }
  };

  const handleResponse = (userDirection) => {
    const correct = userDirection === currentOptotype;
    const result = staircaseProtocol.recordResponse(correct);
    setTestProgress({ reversals: result.reversalCount, trials: result.trialCount });
    if (result.continue) {
      presentNextOptotype();
    } else {
      const threshold = result.threshold;
      setVaThreshold(threshold);
      dataRecorder.recordVisualAcuity(recordId.current, {
        logMAR: threshold,
        snellen: optotypeController.logMARToSnellen(threshold),
        threshold,
        responses: staircaseProtocol.responses,
        reversals: staircaseProtocol.reversals,
        trialCount: staircaseProtocol.trialCount
      });
      startFarPointTest();
    }
  };

  const startFarPointTest = () => {
    setPhase('farPoint');
    refractionCalculator.reset();
    setFarPointCount(0);
  };

  const recordFarPoint = () => {
    const distance = parseFloat(manualDistance);
    if (isNaN(distance) || distance < 20 || distance > 100) {
      Alert.alert('Invalid Input', 'Please enter a distance between 20-100 cm');
      return;
    }
    refractionCalculator.recordMeasurement(distance, { std: 0.5, manual: true });
    dataRecorder.recordFarPointMeasurement(recordId.current, {
      farPointDistance: distance,
      vergence: -100 / distance,
      distanceStd: 0.5,
      distanceMean: distance
    });
    const newCount = farPointCount + 1;
    setFarPointCount(newCount);
    if (newCount >= 3) calculateFinalResults();
  };

  const calculateFinalResults = () => {
    const refraction = refractionCalculator.calculateRefraction(true);
    const qualityData = {
      geometry: { distanceStd: 0.5, yaw: 0, pitch: 0, roll: 0, confidence: 0.8 },
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
    });
    setFinalResults(refraction);
    setQualityReport(quality);
    setPhase('results');
  };

  const getDirectionIcon = (dir) => {
    const icons = { up: '↑', down: '↓', left: '←', right: '→' };
    return icons[dir];
  };

  const getQualityColor = (grade) => {
    const colors = {
      EXCELLENT: '#10b981',
      GOOD: '#84cc16',
      FAIR: '#f59e0b',
      POOR: '#ef4444',
      UNRELIABLE: '#dc2626'
    };
    return colors[grade] || '#666';
  };

  return (
    <View style={styles.container}>
      {/* Introduction */}
      {phase === 'intro' && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.introHeader}>
            <Text style={styles.introIcon}>👁️</Text>
            <Text style={styles.introTitle}>Professional Vision Testing</Text>
            <Text style={styles.introSubtitle}>Advanced Optical Measurement System</Text>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>🔬</Text>
                <Text style={styles.cardTitle}>System Architecture</Text>
              </View>
              <View style={styles.moduleList}>
                {[
                  'Distance Estimation (d = k/s)',
                  'Optotype Control (H = α·d)',
                  'Visual Acuity (Staircase)',
                  'Refraction (LCA + DoF)',
                  'Quality Control (0-100)'
                ].map((text, i) => (
                  <View key={i} style={styles.moduleItem}>
                    <View style={styles.moduleNumber}>
                      <Text style={styles.moduleNumberText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.moduleText}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>⚡</Text>
                <Text style={styles.cardTitle}>Key Features</Text>
              </View>
              <View style={styles.featureGrid}>
                {[
                  { label: 'Range', value: '-10D to +5D' },
                  { label: 'Optotype', value: 'Landolt C' },
                  { label: 'Method', value: 'Adaptive' },
                  { label: 'Correction', value: 'LCA + DoF' }
                ].map((feat, i) => (
                  <View key={i} style={styles.featureItem}>
                    <Text style={styles.featureLabel}>{feat.label}</Text>
                    <Text style={styles.featureValue}>{feat.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>Important Notice</Text>
              <Text style={styles.warningText}>
                This is a research tool. Results are for reference only. 
                Consult a qualified optometrist before getting prescription glasses.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setPhase('calibration')}
            >
              <Text style={styles.startButtonText}>Begin Professional Test →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Calibration */}
      {phase === 'calibration' && (
        <View style={styles.fullContainer}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseNumber}>Step 1/3</Text>
            <Text style={styles.phaseTitle}>Distance Calibration</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '33%' }]} />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.calibrationContent}>
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Setup Instructions</Text>
              {[
                'Measure distance from screen to your eyes',
                'Recommended range: 30-50 cm',
                'Maintain this distance throughout the test'
              ].map((text, i) => (
                <View key={i} style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Enter Distance (cm)</Text>
              <TextInput
                style={styles.distanceInput}
                value={manualDistance}
                onChangeText={setManualDistance}
                keyboardType="numeric"
                placeholder="40"
                placeholderTextColor="#999"
              />
              <Text style={styles.inputHint}>Optimal range: 30-50 cm</Text>
            </View>

            <TouchableOpacity style={styles.continueButton} onPress={handleCalibration}>
              <Text style={styles.continueButtonText}>Confirm & Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Visual Acuity */}
      {phase === 'visualAcuity' && (
        <View style={styles.fullContainer}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseNumber}>Step 2/3</Text>
            <Text style={styles.phaseTitle}>Visual Acuity Test</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '66%' }]} />
            </View>
          </View>

          <View style={styles.testContainer}>
            <View style={styles.statsBar}>
              {[
                { label: 'Reversals', value: `${testProgress.reversals}/4` },
                { label: 'Trials', value: `${testProgress.trials}/30` },
                { label: 'Distance', value: `${currentDistance}cm` }
              ].map((stat, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={styles.statDivider} />}
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                    <Text style={styles.statValue}>{stat.value}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>

            <View style={styles.optotypeArea}>
              {currentOptotype && optotypeSize && (
                <LandoltC
                  size={optotypeSize}
                  gap={optotypeSize / 5}
                  stroke={optotypeSize / 5}
                  direction={currentOptotype}
                />
              )}
            </View>

            <Text style={styles.instruction}>Identify the gap direction</Text>

            <View style={styles.directionPad}>
              {['up', 'left', 'right', 'down'].map(dir => (
                <TouchableOpacity
                  key={dir}
                  style={styles.directionButton}
                  onPress={() => handleResponse(dir)}
                >
                  <Text style={styles.directionIcon}>{getDirectionIcon(dir)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Far Point */}
      {phase === 'farPoint' && (
        <View style={styles.fullContainer}>
          <View style={styles.phaseHeader}>
            <Text style={styles.phaseNumber}>Step 3/3</Text>
            <Text style={styles.phaseTitle}>Refraction Measurement</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.calibrationContent}>
            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Measurement Protocol</Text>
              {[
                'Observe the blue target circle below',
                'Adjust screen distance until target is clear',
                'Measure and record the distance',
                'Repeat 3 times for accuracy'
              ].map((text, i) => (
                <View key={i} style={styles.instructionStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{text}</Text>
                </View>
              ))}
            </View>

            <View style={styles.targetContainer}>
              <View style={styles.blueTarget} />
              <Text style={styles.targetLabel}>Focus Target (470nm)</Text>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Clear Focus Distance (cm)</Text>
              <TextInput
                style={styles.distanceInput}
                value={manualDistance}
                onChangeText={setManualDistance}
                keyboardType="numeric"
                placeholder="45"
                placeholderTextColor="#999"
              />
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>Measurement {farPointCount}/3</Text>
                <View style={styles.counterDots}>
                  {[0, 1, 2].map(i => (
                    <View
                      key={i}
                      style={[styles.counterDot, i < farPointCount && styles.counterDotActive]}
                    />
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.continueButton} onPress={recordFarPoint}>
              <Text style={styles.continueButtonText}>Record Measurement ({farPointCount}/3)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Results */}
      {phase === 'results' && finalResults && qualityReport && (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.resultsHeader}>
            <View style={styles.completeBadge}>
              <Text style={styles.completeBadgeText}>✓ Complete</Text>
            </View>
            <Text style={styles.resultsTitle}>Test Results</Text>
            <Text style={styles.resultsSubtitle}>
              {eye === 'right' ? 'Right Eye' : 'Left Eye'} • {new Date().toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.contentSection}>
            <View style={styles.mainResults}>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Spherical Refraction</Text>
                <Text style={styles.resultValue}>{finalResults.spherical.toFixed(2)}</Text>
                <Text style={styles.resultUnit}>Diopters (D)</Text>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>LCA + DoF</Text>
                </View>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>Visual Acuity</Text>
                <Text style={styles.resultValue}>
                  {optotypeController.logMARToSnellen(vaThreshold)}
                </Text>
                <Text style={styles.resultUnit}>{vaThreshold.toFixed(2)} logMAR</Text>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>Staircase</Text>
                </View>
              </View>
            </View>

            <View style={[styles.qualityCard, { borderLeftColor: getQualityColor(qualityReport.grade) }]}>
              <View style={styles.qualityHeader}>
                <Text style={styles.qualityTitle}>Quality Assessment</Text>
                <View style={[styles.qualityBadge, { backgroundColor: getQualityColor(qualityReport.grade) }]}>
                  <Text style={styles.qualityBadgeText}>{qualityReport.score}</Text>
                </View>
              </View>
              <Text style={[styles.qualityGrade, { color: getQualityColor(qualityReport.grade) }]}>
                {qualityReport.grade}
              </Text>
              <View style={styles.qualityBar}>
                <View style={[
                  styles.qualityBarFill,
                  { width: `${qualityReport.score}%`, backgroundColor: getQualityColor(qualityReport.grade) }
                ]} />
              </View>
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Measurement Statistics</Text>
              <View style={styles.statsGrid}>
                {[
                  { label: 'Vergence Mean', value: `${finalResults.vergenceMean.toFixed(2)} D` },
                  { label: 'Std. Deviation', value: `${finalResults.vergenceStd.toFixed(2)} D` },
                  { label: 'Repeatability', value: `±${(finalResults.vergenceStd * 1.96).toFixed(2)} D` },
                  { label: 'Measurements', value: finalResults.measurementCount }
                ].map((stat, i) => (
                  <View key={i} style={styles.statsItem}>
                    <Text style={styles.statsLabel}>{stat.label}</Text>
                    <Text style={styles.statsValue}>{stat.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {qualityReport.issues.length > 0 && (
              <View style={styles.issuesCard}>
                <Text style={styles.issuesTitle}>Quality Notices</Text>
                {qualityReport.issues.map((issue, idx) => (
                  <View key={idx} style={styles.issueItem}>
                    <View style={[
                      styles.issueDot,
                      { backgroundColor: issue.severity === 'HIGH' ? '#ef4444' : issue.severity === 'MEDIUM' ? '#f59e0b' : '#84cc16' }
                    ]} />
                    <Text style={styles.issueText}>{issue.message}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationIcon}>💡</Text>
              <Text style={styles.recommendationTitle}>Recommendation</Text>
              <Text style={styles.recommendationText}>{qualityReport.recommendation}</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => {
                  const data = dataRecorder.exportJSON(recordId.current);
                  console.log('Exported:', data);
                  Alert.alert('Success', 'Data exported to console');
                }}
              >
                <Text style={styles.exportButtonText}>📥 Export Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fullContainer: { flex: 1, backgroundColor: '#fafafa' },
  scrollContent: { paddingBottom: 40 },
  introHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  introIcon: { fontSize: 64, marginBottom: 20 },
  introTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -1,
  },
  introSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  contentSection: {
    paddingHorizontal: 20,
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingTop: 32,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cardIcon: { fontSize: 28, marginRight: 12 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#000' },
  moduleList: { gap: 12 },
  moduleItem: { flexDirection: 'row', alignItems: 'center' },
  moduleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleNumberText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  moduleText: { fontSize: 15, color: '#333', flex: 1 },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  featureLabel: { fontSize: 13, color: '#666', marginBottom: 6 },
  featureValue: { fontSize: 16, fontWeight: '700', color: '#000' },
  warningCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  warningIcon: { fontSize: 24, marginBottom: 8 },
  warningTitle: { fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 8 },
  warningText: { fontSize: 15, color: '#666', lineHeight: 22 },
  startButton: {
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  startButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  phaseHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  phaseNumber: { fontSize: 14, fontWeight: '600', color: '#667eea', marginBottom: 8 },
  phaseTitle: { fontSize: 24, fontWeight: '800', color: '#000', marginBottom: 16 },
  progressBar: {
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#667eea' },
  calibrationContent: { padding: 20 },
  instructionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  instructionTitle: { fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 20 },
  instructionStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  inputLabel: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 12 },
  distanceInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  inputHint: { fontSize: 14, color: '#666', textAlign: 'center' },
  continueButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  continueButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  testContainer: { flex: 1, padding: 20 },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#000' },
  statDivider: { width: 1, backgroundColor: '#f0f0f0', marginHorizontal: 12 },
  optotypeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 20,
  },
  landoltContainer: { alignItems: 'center', justifyContent: 'center' },
  landoltC: { borderColor: '#000', backgroundColor: 'transparent', position: 'relative' },
  landoltGap: {
    position: 'absolute',
    top: '40%',
    backgroundColor: '#fff',
    height: '20%',
  },
  instruction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  directionPad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  directionButton: {
    width: (SCREEN_WIDTH - 60) / 2,
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionIcon: { fontSize: 48, color: '#fff', fontWeight: '700' },
  targetContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  blueTarget: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3b82f6',
    marginBottom: 16,
  },
  targetLabel: { fontSize: 14, color: '#666', fontWeight: '600' },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  counterText: { fontSize: 14, fontWeight: '600', color: '#666' },
  counterDots: { flexDirection: 'row', gap: 8 },
  counterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
  },
  counterDotActive: { backgroundColor: '#3b82f6' },
  resultsHeader: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  completeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  completeBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultsTitle: { fontSize: 32, fontWeight: '800', color: '#000', marginBottom: 8 },
  resultsSubtitle: { fontSize: 15, color: '#666' },
  mainResults: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  resultCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  resultLabel: { fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center' },
  resultValue: { fontSize: 36, fontWeight: '800', color: '#000', marginBottom: 8 },
  resultUnit: { fontSize: 13, color: '#999', marginBottom: 12 },
  resultBadge: { backgroundColor: '#f8f9fa', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resultBadgeText: { fontSize: 11, fontWeight: '600', color: '#666' },
  qualityCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 4,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qualityTitle: { fontSize: 18, fontWeight: '800', color: '#000' },
  qualityBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualityBadgeText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  qualityGrade: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  qualityBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  qualityBarFill: { height: '100%' },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statsTitle: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statsItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  statsLabel: { fontSize: 13, color: '#666', marginBottom: 8 },
  statsValue: { fontSize: 18, fontWeight: '800', color: '#000' },
  issuesCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  issuesTitle: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 16 },
  issueItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  issueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  issueText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22 },
  recommendationCard: {
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  recommendationIcon: { fontSize: 32, marginBottom: 12 },
  recommendationTitle: { fontSize: 18, fontWeight: '800', color: '#000', marginBottom: 12 },
  recommendationText: { fontSize: 15, color: '#333', lineHeight: 22 },
  actionButtons: { gap: 12 },
  exportButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  exportButtonText: { fontSize: 16, fontWeight: '700', color: '#000' },
  doneButton: {
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  doneButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});