import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';

// --- Configuration ---
// Standard LogMAR / Snellen approximation
const ACUITY_LEVELS = [
  { label: '20/200 (0.1)', sizeFactor: 10.0, limit: 1 }, // Level 1 (Easiest)
  { label: '20/100 (0.2)', sizeFactor: 5.0, limit: 1 },
  { label: '20/70 (0.3)', sizeFactor: 3.5, limit: 1 },
  { label: '20/50 (0.4)', sizeFactor: 2.5, limit: 2 },
  { label: '20/40 (0.5)', sizeFactor: 2.0, limit: 2 },
  { label: '20/30 (0.6)', sizeFactor: 1.5, limit: 2 },
  { label: '20/20 (1.0)', sizeFactor: 1.0, limit: 3 }, // Level 7 (Hardest)
];

const DIRECTIONS = ['up', 'down', 'left', 'right'];

export default function ProfessionalEyeTestScreen({ navigation }) {
  // --- State Management ---
  const [step, setStep] = useState('intro'); // intro, calibrate, test_setup, testing, result
  const [calibrationScale, setCalibrationScale] = useState(1); 
  
  // Test Logic State
  const [currentEye, setCurrentEye] = useState('Right'); 
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentDirection, setCurrentDirection] = useState('right');
  const [mistakesInLevel, setMistakesInLevel] = useState(0);
  const [correctInLevel, setCorrectInLevel] = useState(0);
  
  // Results Storage
  const [results, setResults] = useState({ Right: null, Left: null });
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // --- 1. Calibration Logic ---
  const handleCalibrationComplete = () => {
    setStep('test_setup');
  };

  const adjustScale = (delta) => {
    setCalibrationScale(prev => Math.max(0.5, Math.min(prev + delta, 2.0)));
  };

  // --- 2. Testing Logic Core ---
  const startTest = (eye) => {
    console.log(`Starting test for ${eye} eye`);
    setCurrentEye(eye);
    setCurrentLevelIndex(0);
    setMistakesInLevel(0);
    setCorrectInLevel(0);
    randomizeDirection();
    setStep('testing');
  };

  const randomizeDirection = () => {
    // Reset animation
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    const newDir = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
    setCurrentDirection(newDir);
  };

  const handleInput = (inputDir) => {
    const currentLevel = ACUITY_LEVELS[currentLevelIndex];
    
    if (inputDir === currentDirection) {
      // --- CORRECT ANSWER ---
      const newCorrect = correctInLevel + 1;
      setCorrectInLevel(newCorrect);

      // Rule: 2 consecutive correct answers -> Level Up
      if (newCorrect >= 2) {
        if (currentLevelIndex < ACUITY_LEVELS.length - 1) {
          // Go to next harder level
          setCurrentLevelIndex(prev => prev + 1);
          setMistakesInLevel(0);
          setCorrectInLevel(0);
          randomizeDirection();
        } else {
          // Player beat the game (20/20)
          finishEyeTest(ACUITY_LEVELS[currentLevelIndex].label);
        }
      } else {
        // Stay on same level, need one more correct
        randomizeDirection();
      }
    } else {
      // --- WRONG ANSWER ---
      const newMistakes = mistakesInLevel + 1;
      setMistakesInLevel(newMistakes);

      // Rule: Too many mistakes -> Fail Level
      if (newMistakes >= currentLevel.limit) {
        // Return the *previous* level's label as the result
        // If they fail level 0, result is < 20/200
        const finalScore = currentLevelIndex > 0 
          ? ACUITY_LEVELS[currentLevelIndex - 1].label 
          : '< 20/200';
        
        finishEyeTest(finalScore);
      } else {
        // Retry same level with new direction
        randomizeDirection();
      }
    }
  };

  // --- 3. Finish Logic (FIXED) ---
  const finishEyeTest = (score) => {
    console.log(`Finished ${currentEye} eye with score: ${score}`);
    
    // Update state safely
    const updatedResults = { ...results, [currentEye]: score };
    setResults(updatedResults);

    // Immediate Alert to confirm data is captured
    Alert.alert(
      `${currentEye} Eye Completed`,
      `Result recorded: ${score}`,
      [
        {
          text: "OK",
          onPress: () => {
            // ALWAYS go back to menu first. This is safer than auto-navigating.
            setStep('test_setup');
          }
        }
      ],
      { cancelable: false }
    );
  };

  // --- Render Functions ---

  const renderIntro = () => (
    <View style={styles.centerContent}>
      <Text style={styles.headerTitle}>Professional Vision Screen</Text>
      <Text style={styles.subText}>
        This tool uses the standard "Tumbling E" protocol. 
        Identify the open side of the letter "E".
      </Text>
      
      <View style={styles.instructionBox}>
        <Text style={styles.instructionText}>📏 Distance: 40cm (Arm's length)</Text>
        <Text style={styles.instructionText}>💡 Lighting: Bright room</Text>
        <Text style={styles.instructionText}>👓 Glasses: Wear them if prescribed</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('calibrate')}>
        <Text style={styles.btnText}>Start Calibration</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCalibration = () => (
    <View style={styles.centerContent}>
      <Text style={styles.headerTitle}>Screen Calibration</Text>
      <Text style={styles.subText}>
        Place a standard credit card on the screen. 
        Tap buttons to match the box width to the card.
      </Text>
      
      {/* Box to measure */}
      <View style={[styles.calibrationBox, { width: 300 * calibrationScale, height: 180 * calibrationScale }]}>
        <Text style={styles.calibrationText}>Credit Card Overlay</Text>
      </View>

      <View style={styles.adjustControls}>
        <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustScale(-0.02)}>
          <Text style={styles.adjustBtnText}>－ Shrink</Text>
        </TouchableOpacity>
        
        <Text style={styles.scaleText}>{(calibrationScale * 100).toFixed(0)}%</Text>
        
        <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustScale(0.02)}>
          <Text style={styles.adjustBtnText}>＋ Expand</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleCalibrationComplete}>
        <Text style={styles.btnText}>Confirm Size</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTestSetup = () => (
    <View style={styles.centerContent}>
      <Text style={styles.headerTitle}>Select Eye to Test</Text>
      <Text style={styles.subText}>Please test one eye at a time while covering the other.</Text>
      
      <View style={styles.eyeSelectionContainer}>
        {/* Right Eye Button */}
        <TouchableOpacity 
          style={[styles.eyeCard, results.Right ? styles.eyeCardDone : null]}
          onPress={() => startTest('Right')}
        >
          <Text style={styles.eyeIcon}>{results.Right ? '✅' : '👁️'}</Text>
          <Text style={styles.eyeTitle}>Right Eye (OD)</Text>
          <Text style={styles.eyeStatus}>{results.Right || 'Tap to Start'}</Text>
        </TouchableOpacity>

        {/* Left Eye Button - Unlocks after Right Eye */}
        <TouchableOpacity 
          style={[
            styles.eyeCard, 
            results.Left ? styles.eyeCardDone : null,
            !results.Right && styles.eyeCardLocked
          ]}
          onPress={() => {
            if (results.Right) {
              startTest('Left');
            } else {
              Alert.alert("Locked", "Please test your Right Eye first.");
            }
          }}
          activeOpacity={results.Right ? 0.7 : 1}
        >
          <Text style={styles.eyeIcon}>{results.Left ? '✅' : '👁️'}</Text>
          <Text style={styles.eyeTitle}>Left Eye (OS)</Text>
          <Text style={styles.eyeStatus}>
            {!results.Right ? 'Locked' : (results.Left || 'Tap to Start')}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Result Button - Only appears when both eyes are done */}
      {results.Right && results.Left && (
         <TouchableOpacity 
           style={styles.successButton} 
           onPress={() => setStep('result')}
         >
           <Text style={styles.btnText}>View Full Report ➔</Text>
         </TouchableOpacity>
      )}
    </View>
  );

  const renderTesting = () => {
    const level = ACUITY_LEVELS[currentLevelIndex];
    // Base size approx 20px, adjusted by level factor and user calibration
    const displaySize = 20 * level.sizeFactor * calibrationScale;

    let rotation = '0deg';
    if (currentDirection === 'down') rotation = '90deg';
    if (currentDirection === 'left') rotation = '180deg';
    if (currentDirection === 'up') rotation = '270deg';

    return (
      <View style={styles.testContainer}>
        <View style={styles.testHeader}>
          <Text style={styles.testInfoText}>Testing: {currentEye} Eye</Text>
          <Text style={styles.testInfoText}>Level: {currentLevelIndex + 1} / {ACUITY_LEVELS.length}</Text>
        </View>

        <View style={styles.optotypeContainer}>
          <Animated.Text 
            style={[
              styles.optotype, 
              { 
                fontSize: displaySize, 
                transform: [{ rotate: rotation }],
                opacity: fadeAnim
              }
            ]}
          >
            E
          </Animated.Text>
        </View>

        <Text style={styles.instructionLabel}>Swipe or Tap Direction</Text>

        {/* Directional Pad */}
        <View style={styles.controlPad}>
          <TouchableOpacity style={styles.padButton} onPress={() => handleInput('up')}>
            <Text style={styles.padText}>⬆️</Text>
          </TouchableOpacity>
          <View style={styles.padRow}>
            <TouchableOpacity style={styles.padButton} onPress={() => handleInput('left')}>
              <Text style={styles.padText}>⬅️</Text>
            </TouchableOpacity>
            <View style={{ width: 80 }} /> 
            <TouchableOpacity style={styles.padButton} onPress={() => handleInput('right')}>
              <Text style={styles.padText}>➡️</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.padButton} onPress={() => handleInput('down')}>
            <Text style={styles.padText}>⬇️</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.abortButton} onPress={() => setStep('test_setup')}>
          <Text style={styles.abortText}>Exit Test</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderResult = () => (
    <SafeAreaView style={{flex: 1, backgroundColor: '#FFF'}}>
      <View style={styles.resultContainer}>
        <Text style={styles.headerTitle}>Vision Report</Text>
        
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Right Eye (OD)</Text>
            <Text style={styles.resultValue}>{results.Right}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Left Eye (OS)</Text>
            <Text style={styles.resultValue}>{results.Left}</Text>
          </View>
        </View>

        <View style={styles.analysisBox}>
          <Text style={styles.analysisTitle}>Clinical Recommendation</Text>
          <Text style={styles.analysisText}>
            {(results.Right === '20/20 (1.0)' && results.Left === '20/20 (1.0)')
              ? "Your vision appears normal. No correction needed."
              : "Reduced visual acuity detected. According to the 3-Tier Model, you may benefit from Tier 2 (School Stock) glasses."}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => {
            // Navigate to your inventory screen if it exists
             Alert.alert("Navigation", "This would navigate to the Glasses Inventory Screen.");
            // navigation.navigate('Inventory'); 
          }}
        >
          <Text style={styles.btnText}>Find Matching Glasses</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => {
            setResults({ Right: null, Left: null });
            setStep('test_setup');
          }}
        >
          <Text style={styles.secondaryBtnText}>Restart Test</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimerSmall}>
          DISCLAIMER: This is a screening tool for educational and development aid purposes. It does not replace a doctor's visit.
        </Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {step === 'intro' && renderIntro()}
      {step === 'calibrate' && renderCalibration()}
      {step === 'test_setup' && renderTestSetup()}
      {step === 'testing' && renderTesting()}
      {step === 'result' && renderResult()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  // Typography
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1A73E8', marginBottom: 12, textAlign: 'center' },
  subText: { fontSize: 15, color: '#5F6368', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  
  // Instructions
  instructionBox: { backgroundColor: '#E8F0FE', padding: 20, borderRadius: 12, width: '100%', marginBottom: 32 },
  instructionText: { fontSize: 15, color: '#1565C0', marginBottom: 10, fontWeight: '600' },
  
  // Buttons
  primaryButton: { backgroundColor: '#1A73E8', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 100, width: '100%', alignItems: 'center', elevation: 2 },
  successButton: { backgroundColor: '#34A853', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 100, width: '100%', alignItems: 'center', elevation: 4, marginTop: 20 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { marginTop: 16, padding: 12 },
  secondaryBtnText: { color: '#5F6368', fontSize: 14, fontWeight: '600' },
  abortButton: { marginTop: 20 },
  abortText: { color: '#D93025', fontSize: 14 },

  // Calibration
  calibrationBox: { backgroundColor: '#B3E5FC', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#0288D1' },
  calibrationText: { color: '#01579B', fontWeight: 'bold' },
  adjustControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
  adjustBtn: { backgroundColor: '#F5F5F5', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  adjustBtnText: { fontWeight: '700', color: '#333' },
  scaleText: { fontSize: 20, fontWeight: '700', color: '#1A73E8' },

  // Eye Selection
  eyeSelectionContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
  eyeCard: { width: '47%', backgroundColor: '#F8F9FA', padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8EAED', elevation: 1 },
  eyeCardDone: { backgroundColor: '#E8F5E9', borderColor: '#34A853', borderWidth: 2 },
  eyeCardLocked: { backgroundColor: '#EEEEEE', opacity: 0.5 },
  eyeIcon: { fontSize: 32, marginBottom: 12 },
  eyeTitle: { fontSize: 14, fontWeight: '700', color: '#202124' },
  eyeStatus: { fontSize: 12, color: '#5F6368', marginTop: 4 },

  // Test Screen
  testContainer: { flex: 1, alignItems: 'center', padding: 24, justifyContent: 'space-between' },
  testHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  testInfoText: { fontSize: 14, color: '#5F6368', fontWeight: '600' },
  optotypeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  optotype: { fontWeight: '900', color: '#000' }, 
  instructionLabel: { fontSize: 16, color: '#202124', marginBottom: 20, fontWeight: '500' },
  
  controlPad: { marginBottom: 20, alignItems: 'center' },
  padRow: { flexDirection: 'row', alignItems: 'center' },
  padButton: { width: 70, height: 70, backgroundColor: '#F1F3F4', borderRadius: 35, justifyContent: 'center', alignItems: 'center', margin: 8, elevation: 3, borderWidth: 1, borderColor: '#DADCE0' },
  padText: { fontSize: 28 },

  // Results
  resultContainer: { padding: 24, alignItems: 'center', flex: 1, justifyContent: 'center' },
  resultCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, marginBottom: 24, borderWidth: 1, borderColor: '#F1F3F4' },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultLabel: { fontSize: 16, color: '#5F6368' },
  resultValue: { fontSize: 24, fontWeight: '800', color: '#1A73E8' },
  separator: { height: 1, backgroundColor: '#E8EAED', marginVertical: 16 },
  
  analysisBox: { backgroundColor: '#FFF3E0', padding: 20, borderRadius: 12, marginBottom: 32, width: '100%', borderWidth: 1, borderColor: '#FFE0B2' },
  analysisTitle: { fontSize: 16, fontWeight: '700', color: '#E65100', marginBottom: 8 },
  analysisText: { fontSize: 14, color: '#BF360C', lineHeight: 22 },
  disclaimerSmall: { fontSize: 11, color: '#9AA0A6', marginTop: 20, textAlign: 'center', lineHeight: 16 },
});