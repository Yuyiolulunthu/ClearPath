/**
 * EyesightTestScreen v2.6
 * --------------------------------------------------------------------------
 * Changes from v2.5:
 *
 *   Cross-modality consistency check (Feasibility doc §7.4):
 *
 *   Case A — Vision OK but refraction abnormal
 *     logMAR < 0.10 AND |spherical| > 1.0 D
 *     → Hard reject. The far-point measurement is suspect. User redoes
 *       far-point only; VA threshold (30+ trial staircase) is preserved.
 *
 *   Case B — Vision poor but refraction normal
 *     logMAR > 0.30 AND |spherical| < 0.5 D
 *     → Soft flag. Result is released but with a HIGH-severity quality
 *       issue and a referral recommendation. Likely non-refractive cause
 *       (amblyopia, cataract, etc) — beyond what a refraction screener
 *       can resolve.
 * --------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CameraView from '../components/CameraView';
import { DataRecorder } from '../utils/DataRecorder';
import { FarPointController } from '../utils/FarPointController';
import { OptotypeController } from '../utils/OptotypeController';
import { detectPPI } from '../utils/ppiDetector';
import { QualityController } from '../utils/QualityController';
import { RefractionCalculator } from '../utils/RefractionCalculator';
import {
  StaircaseProtocol,
  generateDirection,
  getRotationAngle,
} from '../utils/StaircaseProtocol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- Tunables ----------
const CALIBRATION_DISTANCE_CM = 40;
const SETUP_OK_HEAD_ANGLE_YAW_ROLL = 10;
const SETUP_OK_PITCH               = 15;
const SETUP_STABLE_MS              = 1500;
const CALIBRATION_COUNTDOWN_MS     = 3000;
const TEST_DISTANCE_TOLERANCE_CM   = 7;
const FARPOINT_DISTANCE_MIN_CM     = 15;
const FARPOINT_DISTANCE_MAX_CM     = 90;
const TEST_HEAD_ANGLE_LIMIT        = 15;
const TEST_PITCH_LIMIT             = 20;
const TEST_BAD_POSE_PAUSE_MS       = 1000;
const TEST_GOOD_POSE_RESUME_MS     = 800;
const READY_EYE_STABLE_MS          = 1000;
const FARPOINT_LOGMAR_OFFSET       = 0.2;
const VERGENCE_STD_HARD_GATE_D     = 0.20;

// §7.4 cross-modality thresholds
const CROSS_CASE_A_LOGMAR_MAX = 0.10;   // good vision = ≥20/25
const CROSS_CASE_A_SE_MIN_ABS = 1.0;    // notable refraction
const CROSS_CASE_B_LOGMAR_MIN = 0.30;   // poor vision = ≤20/40
const CROSS_CASE_B_SE_MAX_ABS = 0.5;    // refraction near zero

const FARPOINT_BG    = '#000';
const FARPOINT_BLUE  = '#0066FF';

// ---------- Cross-modality consistency (§7.4) ----------

function checkCrossModalityConsistency(logMAR, spherical) {
  if (!Number.isFinite(logMAR) || !Number.isFinite(spherical)) {
    return { type: 'none' };
  }
  const absSE = Math.abs(spherical);

  // Case A — vision good but refraction abnormal → suspect far-point
  if (logMAR < CROSS_CASE_A_LOGMAR_MAX && absSE > CROSS_CASE_A_SE_MIN_ABS) {
    return {
      type: 'A',
      action: 'hardReject',
      logMAR, spherical,
      message:
        `Visual acuity is good (${snellenString(logMAR)}, logMAR ${logMAR.toFixed(2)}) but ` +
        `the refraction reading is ${spherical.toFixed(2)} D. ` +
        `These don't agree — likely the far-point measurement didn't capture your ` +
        `true far point. Please redo the far-point procedure.`,
    };
  }

  // Case B — vision poor but refraction near zero → likely non-refractive cause
  if (logMAR > CROSS_CASE_B_LOGMAR_MIN && absSE < CROSS_CASE_B_SE_MAX_ABS) {
    return {
      type: 'B',
      action: 'flag',
      logMAR, spherical,
      message:
        `Visual acuity (${snellenString(logMAR)}, logMAR ${logMAR.toFixed(2)}) is below normal ` +
        `but no significant refractive error was detected (${spherical.toFixed(2)} D). ` +
        `The reduced vision may have a non-refractive cause that this screening tool cannot ` +
        `resolve. We recommend a full eye exam with an optometrist.`,
    };
  }

  return { type: 'none' };
}

function snellenString(logMAR) {
  const denom = Math.round(20 * Math.pow(10, logMAR));
  return `20/${denom}`;
}

// ---------- Landolt C ----------

const LandoltC = ({ size, gap, stroke, direction, color = '#000', gapColor = '#fff' }) => {
  const rotation = getRotationAngle(direction);
  return (
    <View style={[styles.landoltContainer, { transform: [{ rotate: `${rotation}deg` }] }]}>
      <View style={[styles.landoltC, {
        width: size,
        height: size,
        borderWidth: stroke,
        borderRightWidth: 0,
        borderRadius: size / 2,
        borderColor: color,
      }]}>
        <View style={[styles.landoltGap, {
          width: gap,
          right: -gap / 2,
          backgroundColor: gapColor,
        }]} />
      </View>
    </View>
  );
};

// ---------- Main component ----------

export default function EyesightTestScreen({ navigation }) {
  const [phase, setPhase] = useState('intro');

  const [cam, setCam] = useState({
    distance:     null,
    distanceConf: 0,
    eyeState:     { leftCovered: false, rightCovered: false, activeEye: 'both', validState: false, confidence: 0 },
    quality:      'searching',
    isCalibrated: false,
    yaw:          0,
    roll:         0,
    pitch:        0,
  });

  const cameraOnUpdate = useRef(null);
  if (!cameraOnUpdate.current) {
    cameraOnUpdate.current = function onCamUpdate(state) {
      setCam({
        distance:     state.distance,
        distanceConf: state.distanceConf,
        eyeState:     state.eyeState,
        quality:      state.quality,
        isCalibrated: state.isCalibrated,
        yaw:          state.face?.yawAngle   ?? 0,
        roll:         state.face?.rollAngle  ?? 0,
        pitch:        state.face?.pitchAngle ?? 0,
      });
    };
  }

  const [eye, setEye]                       = useState(null);
  const [currentOptotype, setCurrentOptotype] = useState(null);
  const [optotypeSize, setOptotypeSize]     = useState(120);
  const [vaThreshold, setVaThreshold]       = useState(null);
  const [progress, setProgress]             = useState({ reversals: 0, trials: 0 });

  const [farPointCount, setFarPointCount]   = useState(0);
  const [farPointStimulus, setFarPointStimulus] = useState(null);
  const [farPointBuffer, setFarPointBuffer] = useState({ ready: false, mean: null, std: null, sampleCount: 0 });
  const [retestModal, setRetestModal]       = useState(null);
  const [crossModalityModal, setCrossModalityModal] = useState(null);

  const [finalResults, setFinalResults]     = useState(null);
  const [qualityReport, setQualityReport]   = useState(null);

  const [setupStableSince, setSetupStableSince] = useState(null);
  const [calibCountdown, setCalibCountdown]     = useState(null);
  const [readyEyeStableSince, setReadyEyeStableSince] = useState(null);
  const [paused, setPaused]                     = useState(false);
  const [pauseReason, setPauseReason]           = useState('');

  const ppiInfoRef = useRef(null);
  if (!ppiInfoRef.current) {
    ppiInfoRef.current = detectPPI();
    console.log(
      `[PPI] detected ${ppiInfoRef.current.ppi} via ${ppiInfoRef.current.source} (dpr=${ppiInfoRef.current.dpr})`
    );
  }

  const optotypeRef     = useRef(null);
  const staircaseRef    = useRef(null);
  const refractionRef   = useRef(null);
  const qualityRef      = useRef(null);
  const recorderRef     = useRef(null);
  const farPointCtrlRef = useRef(null);
  if (!optotypeRef.current)     optotypeRef.current     = new OptotypeController(ppiInfoRef.current.ppi);
  if (!staircaseRef.current)    staircaseRef.current    = new StaircaseProtocol();
  if (!refractionRef.current)   refractionRef.current   = new RefractionCalculator();
  if (!qualityRef.current)      qualityRef.current      = new QualityController();
  if (!recorderRef.current)     recorderRef.current     = new DataRecorder();
  if (!farPointCtrlRef.current) farPointCtrlRef.current = new FarPointController();
  const recordIdRef = useRef(null);

  useEffect(() => {
    (async () => {
      try { await recorderRef.current.initializeDeviceInfo?.(); } catch {}
    })();
  }, []);

  // ----- SETUP → CALIBRATING -----
  useEffect(() => {
    if (phase !== 'setup') {
      setSetupStableSince(null);
      return;
    }
    const faceDetected = cam.quality !== 'searching';
    const headOK =
      Math.abs(cam.yaw)   < SETUP_OK_HEAD_ANGLE_YAW_ROLL &&
      Math.abs(cam.roll)  < SETUP_OK_HEAD_ANGLE_YAW_ROLL &&
      Math.abs(cam.pitch) < SETUP_OK_PITCH;
    if (faceDetected && headOK) {
      if (setupStableSince === null) {
        setSetupStableSince(Date.now());
      } else if (Date.now() - setupStableSince >= SETUP_STABLE_MS) {
        setPhase('calibrating');
        setSetupStableSince(null);
      }
    } else {
      setSetupStableSince(null);
    }
  }, [phase, cam, setupStableSince]);

  // ----- CALIBRATING -----
  useEffect(() => {
    if (phase !== 'calibrating') {
      setCalibCountdown(null);
      return;
    }
    const start = Date.now();
    setCalibCountdown(Math.ceil(CALIBRATION_COUNTDOWN_MS / 1000));
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.ceil((CALIBRATION_COUNTDOWN_MS - elapsed) / 1000);
      setCalibCountdown(Math.max(0, remaining));
      if (elapsed >= CALIBRATION_COUNTDOWN_MS) {
        clearInterval(tick);
        const calibrateFn = cameraOnUpdate.current?.calibrate;
        if (typeof calibrateFn === 'function') {
          const ok = calibrateFn();
          if (!ok) setPhase('setup');
        } else {
          Alert.alert('Calibration not ready', 'Camera tracking is still initializing.');
          setPhase('setup');
        }
      }
    }, 100);
    return () => clearInterval(tick);
  }, [phase]);

  const handleCameraCalibrate = useCallback((info) => {
    if (phase === 'calibrating') {
      const r = recorderRef.current.createTestRecord('unknown', {
        ppi: ppiInfoRef.current.ppi,
        ppiSource: ppiInfoRef.current.source,
        ppiDpr: ppiInfoRef.current.dpr,
        calibrationDistance: CALIBRATION_DISTANCE_CM,
        useBlueLight: true,
        mode: 'auto-camera',
      });
      recordIdRef.current = r?.recordId ?? null;
      setPhase('ready');
    }
  }, [phase]);

  // ----- READY → visualAcuity -----
  useEffect(() => {
    if (phase !== 'ready') {
      setReadyEyeStableSince(null);
      return;
    }
    const valid = cam.eyeState?.validState && (cam.eyeState.activeEye === 'left' || cam.eyeState.activeEye === 'right');
    if (valid) {
      if (readyEyeStableSince === null) {
        setReadyEyeStableSince(Date.now());
      } else if (Date.now() - readyEyeStableSince >= READY_EYE_STABLE_MS) {
        setEye(cam.eyeState.activeEye);
        startVisualAcuityTest(cam.eyeState.activeEye);
        setReadyEyeStableSince(null);
      }
    } else {
      setReadyEyeStableSince(null);
    }
  }, [phase, cam.eyeState, readyEyeStableSince]);

  const startVisualAcuityTest = (whichEye) => {
    staircaseRef.current.reset();
    setProgress({ reversals: 0, trials: 0 });
    setVaThreshold(null);
    setPhase('visualAcuity');
    presentNextOptotype();
  };

  // ----- visualAcuity -----
  const presentNextOptotype = () => {
    const direction = generateDirection();
    setCurrentOptotype(direction);
    updateOptotypeSize();
  };

  const updateOptotypeSize = () => {
    const logMAR = staircaseRef.current.currentLogMAR;
    if (logMAR === null || logMAR === undefined) return;
    optotypeRef.current.setTargetLogMAR(logMAR);
    const dist = cam.distance ?? CALIBRATION_DISTANCE_CM;
    const params = optotypeRef.current.getLandoltCParams(dist);
    if (params) setOptotypeSize(params.size);
  };

  useEffect(() => {
    if (phase === 'visualAcuity') updateOptotypeSize();
  }, [cam.distance, phase]);

  // ----- farPoint sample push + dynamic stimulus -----
  useEffect(() => {
    if (phase !== 'farPoint') return;
    if (cam.distance == null) return;
    farPointCtrlRef.current.pushSample(cam.distance);
    setFarPointBuffer(farPointCtrlRef.current.inspect());

    if (vaThreshold !== null) {
      optotypeRef.current.setTargetLogMAR(vaThreshold + FARPOINT_LOGMAR_OFFSET);
      const params = optotypeRef.current.getLandoltCParams(cam.distance);
      if (params && farPointStimulus) {
        setFarPointStimulus({ ...farPointStimulus, size: params.size });
      }
    }
  }, [cam.distance, phase, vaThreshold]);

  // ----- auto-pause -----
  const badPoseSince  = useRef(null);
  const goodPoseSince = useRef(null);

  useEffect(() => {
    if (phase !== 'visualAcuity' && phase !== 'farPoint') {
      badPoseSince.current = null;
      goodPoseSince.current = null;
      if (paused) {
        setPaused(false);
        setPauseReason('');
      }
      return;
    }
    const reasons = [];
    if (phase === 'visualAcuity') {
      const distOK = cam.distance != null
        && Math.abs(cam.distance - CALIBRATION_DISTANCE_CM) <= TEST_DISTANCE_TOLERANCE_CM;
      if (!distOK) reasons.push(
        cam.distance == null
          ? 'Face not detected'
          : `Distance ${cam.distance.toFixed(0)} cm — should be ~${CALIBRATION_DISTANCE_CM} cm`
      );
    } else {
      const distOK = cam.distance != null
        && cam.distance >= FARPOINT_DISTANCE_MIN_CM
        && cam.distance <= FARPOINT_DISTANCE_MAX_CM;
      if (!distOK) reasons.push(
        cam.distance == null
          ? 'Face not detected'
          : `Distance ${cam.distance.toFixed(0)} cm — out of range (${FARPOINT_DISTANCE_MIN_CM}-${FARPOINT_DISTANCE_MAX_CM} cm)`
      );
    }
    const yawOK   = Math.abs(cam.yaw)   < TEST_HEAD_ANGLE_LIMIT;
    const rollOK  = Math.abs(cam.roll)  < TEST_HEAD_ANGLE_LIMIT;
    const pitchOK = Math.abs(cam.pitch) < TEST_PITCH_LIMIT;
    if (!yawOK || !rollOK) reasons.push('Look straight at the screen');
    else if (!pitchOK)     reasons.push('Tilt your phone — keep eye level');

    const eyeOK = cam.eyeState?.validState && cam.eyeState.activeEye === eye;
    if (!eyeOK) {
      reasons.push(phase === 'farPoint'
        ? `Keep ${eye === 'right' ? 'left' : 'right'} eye covered`
        : `Cover ${eye === 'right' ? 'left' : 'right'} eye, look with ${eye} eye`);
    }

    const allOK = reasons.length === 0;
    if (!allOK) {
      goodPoseSince.current = null;
      if (badPoseSince.current === null) {
        badPoseSince.current = Date.now();
      } else if (!paused && Date.now() - badPoseSince.current >= TEST_BAD_POSE_PAUSE_MS) {
        setPaused(true);
        setPauseReason(reasons[0]);
      } else if (paused) {
        setPauseReason(reasons[0]);
      }
    } else {
      badPoseSince.current = null;
      if (paused) {
        if (goodPoseSince.current === null) {
          goodPoseSince.current = Date.now();
        } else if (Date.now() - goodPoseSince.current >= TEST_GOOD_POSE_RESUME_MS) {
          setPaused(false);
          setPauseReason('');
          goodPoseSince.current = null;
        }
      }
    }
  }, [phase, cam, eye, paused]);

  // ----- visualAcuity response -----
  const handleResponse = (userDir) => {
    if (paused) return;
    const correct = userDir === currentOptotype;
    const result = staircaseRef.current.recordResponse(correct);
    setProgress({ reversals: result.reversalCount, trials: result.trialCount });
    if (result.continue) {
      presentNextOptotype();
    } else {
      const threshold = result.threshold;
      setVaThreshold(threshold);
      try {
        recorderRef.current.recordVisualAcuity?.(recordIdRef.current, {
          logMAR: threshold,
          snellen: optotypeRef.current.logMARToSnellen(threshold),
          threshold,
          responses: staircaseRef.current.responses,
          reversals: staircaseRef.current.reversals,
          trialCount: staircaseRef.current.trialCount,
        });
      } catch {}
      startFarPointTest(threshold);
    }
  };

  // ----- farPoint -----
  const startFarPointTest = (vaThr) => {
    refractionRef.current.reset();
    farPointCtrlRef.current.reset();
    setFarPointCount(0);
    optotypeRef.current.setTargetLogMAR((vaThr ?? 0) + FARPOINT_LOGMAR_OFFSET);
    const params = optotypeRef.current.getLandoltCParams(20);
    setFarPointStimulus({
      direction: generateDirection(),
      size: params?.size ?? 100,
    });
    setPhase('farPoint');
  };

  const captureFarPoint = () => {
    if (paused) return;
    const result = farPointCtrlRef.current.tryCapture();
    if (!result.ok) {
      Alert.alert('Hold steadier', result.reason);
      return;
    }
    const { mean, std } = result;
    refractionRef.current.recordMeasurement(mean, { std, manual: false });
    try {
      recorderRef.current.recordFarPointMeasurement?.(recordIdRef.current, {
        farPointDistance: mean,
        vergence:         -100 / mean,
        distanceStd:      std,
        distanceMean:     mean,
        sampleCount:      result.sampleCount,
        durationMs:       result.durationMs,
      });
    } catch {}
    const newCount = farPointCount + 1;
    setFarPointCount(newCount);
    if (newCount >= 3) {
      // Gate 1 — §7.3 vergence stability
      const refraction = refractionRef.current.calculateRefraction(true);
      if (refraction.vergenceStd > VERGENCE_STD_HARD_GATE_D) {
        setRetestModal({ vergenceStd: refraction.vergenceStd });
        return;
      }
      // Gate 2 — §7.4 cross-modality consistency
      const consistency = checkCrossModalityConsistency(vaThreshold, refraction.spherical);
      if (consistency.action === 'hardReject') {
        setCrossModalityModal({ ...consistency });
        return;
      }
      // Pass-through (or soft-flag): finalize
      finalizeResults(refraction, std, consistency);
    } else {
      setFarPointStimulus({
        direction: generateDirection(),
        size: farPointStimulus?.size ?? 100,
      });
    }
  };

  const handleRetestConfirm = () => {
    refractionRef.current.reset();
    farPointCtrlRef.current.reset();
    setFarPointCount(0);
    setFarPointStimulus({
      direction: generateDirection(),
      size: farPointStimulus?.size ?? 100,
    });
    setRetestModal(null);
  };

  // §7.4 Case A — redo far-point only; preserve VA threshold
  const handleCrossModalityRedo = () => {
    refractionRef.current.reset();
    farPointCtrlRef.current.reset();
    setFarPointCount(0);
    setFarPointStimulus({
      direction: generateDirection(),
      size: farPointStimulus?.size ?? 100,
    });
    setCrossModalityModal(null);
  };

  const finalizeResults = (refraction, lastStd, consistency) => {
    const qualityData = {
      geometry: {
        distanceStd: lastStd ?? 0.5,
        yaw:   cam.yaw,
        pitch: cam.pitch,
        roll:  cam.roll,
        confidence: cam.distanceConf ?? 0.8,
      },
      vergenceStd:      refraction.vergenceStd,
      logMAR:           vaThreshold,
      spherical:        refraction.spherical,
      measurementCount: refraction.measurementCount,
    };
    const quality = qualityRef.current.assessOverallQuality(qualityData);

    // §7.4 Case B — soft flag with referral
    if (consistency && consistency.action === 'flag') {
      quality.issues = [
        ...(Array.isArray(quality.issues) ? quality.issues : []),
        {
          severity: 'HIGH',
          message: consistency.message,
          source: 'cross-modality',
        },
      ];
      // Lower the score to reflect the flag (cap at 70 to indicate concern)
      if (typeof quality.score === 'number' && quality.score > 70) {
        quality.score = 70;
        if (quality.grade === 'EXCELLENT' || quality.grade === 'GOOD') {
          quality.grade = 'FAIR';
        }
      }
      quality.recommendation =
        (quality.recommendation ? quality.recommendation + ' ' : '') +
        'Schedule a full eye exam — the reduced acuity is unlikely to be explained by refractive error alone.';
    }

    try {
      recorderRef.current.recordQualityMetrics?.(recordIdRef.current, quality);
      recorderRef.current.recordFinalResults?.(recordIdRef.current, {
        ...refraction,
        qualityScore: quality.score,
        qualityGrade: quality.grade,
        eye,
        ppi: ppiInfoRef.current.ppi,
        ppiSource: ppiInfoRef.current.source,
        crossModalityFlag: consistency?.type ?? 'none',
        lcaCorrected: true,
        dofCorrected: true,
      });
    } catch {}
    setFinalResults(refraction);
    setQualityReport(quality);
    setPhase('results');
  };

  // ----- RENDER -----
  const showCamera = phase !== 'intro' && phase !== 'results';

  return (
    <View style={styles.root}>
      {showCamera && (
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            onUpdate={cameraOnUpdate.current}
            onCalibrate={handleCameraCalibrate}
            calibrationDistanceCm={CALIBRATION_DISTANCE_CM}
            showOverlay={false}
          />
        </View>
      )}

      {showCamera && (
        <View style={styles.statusBar} pointerEvents="none">
          <StatusItem
            label="DISTANCE"
            value={cam.distance ? `${cam.distance.toFixed(0)} cm` : '—'}
            color={
              cam.distance == null ? '#9ca3af' :
              phase === 'farPoint'
                ? (cam.distance >= FARPOINT_DISTANCE_MIN_CM && cam.distance <= FARPOINT_DISTANCE_MAX_CM ? '#10b981' : '#f59e0b')
                : (Math.abs(cam.distance - CALIBRATION_DISTANCE_CM) <= TEST_DISTANCE_TOLERANCE_CM ? '#10b981' : '#f59e0b')
            }
          />
          <StatusItem
            label="EYE"
            value={
              phase === 'visualAcuity' || phase === 'farPoint'
                ? (eye?.toUpperCase() ?? '—')
                : (cam.eyeState?.activeEye === 'left'  ? 'LEFT'
                :  cam.eyeState?.activeEye === 'right' ? 'RIGHT'
                :  '—')
            }
            color={cam.eyeState?.validState ? '#10b981' : '#9ca3af'}
          />
          <StatusItem
            label="POSTURE"
            value={
              Math.abs(cam.yaw)   < TEST_HEAD_ANGLE_LIMIT &&
              Math.abs(cam.roll)  < TEST_HEAD_ANGLE_LIMIT &&
              Math.abs(cam.pitch) < TEST_PITCH_LIMIT
                ? 'OK' : 'TILT'
            }
            color={
              Math.abs(cam.yaw)   < TEST_HEAD_ANGLE_LIMIT &&
              Math.abs(cam.roll)  < TEST_HEAD_ANGLE_LIMIT &&
              Math.abs(cam.pitch) < TEST_PITCH_LIMIT
                ? '#10b981' : '#f59e0b'
            }
          />
        </View>
      )}

      {phase === 'intro'         && <IntroPhase ppiInfo={ppiInfoRef.current} onBegin={() => setPhase('setup')} />}
      {phase === 'setup'         && <SetupPhase cam={cam} stableSince={setupStableSince} />}
      {phase === 'calibrating'   && <CalibratingPhase countdown={calibCountdown} />}
      {phase === 'ready'         && <ReadyPhase cam={cam} eyeStableSince={readyEyeStableSince} />}
      {phase === 'visualAcuity'  && (
        <VisualAcuityPhase
          progress={progress}
          eye={eye}
          optotypeSize={optotypeSize}
          currentOptotype={currentOptotype}
          onResponse={handleResponse}
        />
      )}
      {phase === 'farPoint'      && (
        <FarPointPhase
          count={farPointCount}
          distance={cam.distance}
          buffer={farPointBuffer}
          stimulus={farPointStimulus}
          onCapture={captureFarPoint}
        />
      )}
      {phase === 'results' && finalResults && qualityReport && (
        <ResultsPhase
          eye={eye}
          finalResults={finalResults}
          qualityReport={qualityReport}
          vaThreshold={vaThreshold}
          ppiInfo={ppiInfoRef.current}
          optotypeController={optotypeRef.current}
          dataRecorder={recorderRef.current}
          recordId={recordIdRef.current}
          onDone={() => navigation.goBack()}
        />
      )}

      {paused && (phase === 'visualAcuity' || phase === 'farPoint') && (
        <View style={styles.pauseOverlay} pointerEvents="none">
          <View style={styles.pauseCard}>
            <Text style={styles.pauseIcon}>⏸</Text>
            <Text style={styles.pauseTitle}>Paused</Text>
            <Text style={styles.pauseReason}>{pauseReason}</Text>
            <Text style={styles.pauseHint}>Test will resume automatically</Text>
          </View>
        </View>
      )}

      {/* §7.3 vergence-std retest */}
      {retestModal && (
        <View style={styles.retestOverlay}>
          <View style={styles.retestCard}>
            <Text style={styles.retestIcon}>↻</Text>
            <Text style={styles.retestTitle}>Measurements inconsistent</Text>
            <Text style={styles.retestReason}>
              The 3 far-point captures disagree by σ = {retestModal.vergenceStd.toFixed(2)} D
              (must be ≤ {VERGENCE_STD_HARD_GATE_D.toFixed(2)} D, ISO 10342).
            </Text>
            <Text style={styles.retestHint}>
              We won't release a result that's likely unreliable. Please redo the
              far-point procedure: hold steady, capture the moment blur appears.
            </Text>
            <TouchableOpacity style={styles.retestButton} onPress={handleRetestConfirm}>
              <Text style={styles.retestButtonText}>Redo Far-Point</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* §7.4 Case A cross-modality hard reject */}
      {crossModalityModal && (
        <View style={styles.retestOverlay}>
          <View style={styles.retestCard}>
            <Text style={styles.retestIcon}>⚠</Text>
            <Text style={styles.retestTitle}>Inconsistent results</Text>
            <Text style={styles.retestReason}>
              {crossModalityModal.message}
            </Text>
            <Text style={styles.retestHint}>
              Your acuity test result is preserved. Only the far-point measurement
              will be redone.
            </Text>
            <TouchableOpacity style={styles.retestButton} onPress={handleCrossModalityRedo}>
              <Text style={styles.retestButtonText}>Redo Far-Point</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ============================================================================
// PHASE COMPONENTS
// ============================================================================

function IntroPhase({ ppiInfo, onBegin }) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.introContainer}>
      <View style={styles.introHeader}>
        <Text style={styles.introIcon}>👁️</Text>
        <Text style={styles.introTitle}>Professional Vision Testing</Text>
        <Text style={styles.introSubtitle}>Camera-driven · Fully automatic</Text>
      </View>
      <View style={styles.contentSection}>
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>How it works</Text>
          {[
            'Front camera tracks your face and measures distance automatically.',
            'Position ~40 cm away. Calibration happens once.',
            'Cover one eye to begin. The system detects which eye is being tested.',
            'Acuity test: identify the gap direction in shrinking targets.',
            'Far-point test: blue target on dark — start near, move away, capture when blur appears.',
          ].map((text, i) => (
            <View key={i} style={styles.bullet}>
              <View style={styles.bulletNum}><Text style={styles.bulletNumText}>{i + 1}</Text></View>
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>
        {ppiInfo && (
          <View style={styles.ppiInfoCard}>
            <Text style={styles.ppiInfoText}>
              Display: {ppiInfo.ppi} PPI · DPR {ppiInfo.dpr} · src: {ppiInfo.source}
            </Text>
          </View>
        )}
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠ Research tool</Text>
          <Text style={styles.warningText}>
            Results are for reference only. Consult a qualified optometrist before
            getting prescription glasses.
          </Text>
        </View>
        <TouchableOpacity style={styles.startButton} onPress={onBegin}>
          <Text style={styles.startButtonText}>Begin →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SetupPhase({ cam, stableSince }) {
  const faceDetected = cam.quality !== 'searching';
  const headOK =
    Math.abs(cam.yaw)   < SETUP_OK_HEAD_ANGLE_YAW_ROLL &&
    Math.abs(cam.roll)  < SETUP_OK_HEAD_ANGLE_YAW_ROLL &&
    Math.abs(cam.pitch) < SETUP_OK_PITCH;
  const allOK = faceDetected && headOK;
  let elapsed = 0;
  if (allOK && stableSince != null) elapsed = Date.now() - stableSince;
  const progress = Math.min(1, elapsed / SETUP_STABLE_MS);
  return (
    <View style={styles.setupContainer}>
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Position yourself</Text>
        <Text style={styles.setupSubtitle}>Hold the phone ~40 cm away, look straight at the camera</Text>
        <View style={styles.checkList}>
          <CheckRow label="Face detected"  pass={faceDetected} />
          <CheckRow label="Head straight (yaw / roll / pitch)" pass={headOK} />
        </View>
        <View style={styles.progressRing}>
          <View style={[styles.progressRingFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={styles.setupHint}>
          {allOK ? `Hold still… ${Math.ceil((SETUP_STABLE_MS - elapsed) / 1000)}s` : 'Adjust your position'}
        </Text>
      </View>
    </View>
  );
}

function CalibratingPhase({ countdown }) {
  return (
    <View style={styles.calibContainer}>
      <View style={styles.calibCard}>
        <Text style={styles.calibIcon}>📏</Text>
        <Text style={styles.calibTitle}>Calibrating</Text>
        <Text style={styles.calibSubtitle}>Stay still and look at the camera</Text>
        <Text style={styles.calibCountdown}>{countdown ?? '—'}</Text>
      </View>
    </View>
  );
}

function ReadyPhase({ cam, eyeStableSince }) {
  const valid = cam.eyeState?.validState;
  const which = cam.eyeState?.activeEye;
  let elapsed = 0;
  if (valid && eyeStableSince != null) elapsed = Date.now() - eyeStableSince;
  const progress = Math.min(1, elapsed / READY_EYE_STABLE_MS);
  return (
    <View style={styles.setupContainer}>
      <View style={styles.setupCard}>
        <Text style={styles.calibIcon}>✋</Text>
        <Text style={styles.setupTitle}>Cover one eye</Text>
        <Text style={styles.setupSubtitle}>
          Use your hand to cover one eye. Keep the other open and looking at the screen.
        </Text>
        {valid && (which === 'left' || which === 'right') ? (
          <>
            <Text style={styles.eyeAnnouncement}>
              Testing <Text style={{ color: '#10b981' }}>{which.toUpperCase()}</Text> eye
            </Text>
            <View style={styles.progressRing}>
              <View style={[styles.progressRingFill, { width: `${progress * 100}%` }]} />
            </View>
          </>
        ) : (
          <Text style={styles.setupHint}>Waiting for one eye to be covered…</Text>
        )}
      </View>
    </View>
  );
}

function VisualAcuityPhase({ progress, eye, optotypeSize, currentOptotype, onResponse }) {
  return (
    <View style={styles.testContainer}>
      <View style={styles.statsBar}>
        <Stat label="Reversals" value={`${progress.reversals}/6`} />
        <View style={styles.statDivider} />
        <Stat label="Trials" value={`${progress.trials}/40`} />
        <View style={styles.statDivider} />
        <Stat label="Eye" value={eye?.toUpperCase() ?? '—'} />
      </View>
      <View style={styles.optotypeArea}>
        {currentOptotype && optotypeSize && (
          <LandoltC
            size={optotypeSize}
            gap={optotypeSize / 5}
            stroke={optotypeSize / 5}
            direction={currentOptotype}
            color="#000"
            gapColor="#fff"
          />
        )}
      </View>
      <Text style={styles.instruction}>Identify the gap direction</Text>
      <View style={styles.directionPad}>
        {['up', 'left', 'right', 'down'].map(dir => (
          <TouchableOpacity key={dir} style={styles.directionButton} onPress={() => onResponse(dir)}>
            <Text style={styles.directionIcon}>
              {dir === 'up' ? '↑' : dir === 'down' ? '↓' : dir === 'left' ? '←' : '→'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function FarPointPhase({ count, distance, buffer, stimulus, onCapture }) {
  const stable = buffer.ready && buffer.std != null && buffer.std <= 2.5;
  const stdColor = !buffer.ready ? '#9ca3af' : (buffer.std <= 2.5 ? '#10b981' : '#f59e0b');
  return (
    <View style={styles.farPointContainer}>
      <Text style={styles.farPointTitle}>Refraction Measurement</Text>
      <Text style={styles.farPointSubtitle}>
        Start with the phone close (~15-20 cm). Slowly move it AWAY from your face.
        The instant the blue C below becomes blurry — stop and tap Capture.
      </Text>
      <View style={styles.farPointStimulusBoxBlue}>
        {stimulus?.size && (
          <LandoltC
            size={stimulus.size}
            gap={stimulus.size / 5}
            stroke={stimulus.size / 5}
            direction={stimulus.direction}
            color={FARPOINT_BLUE}
            gapColor={FARPOINT_BG}
          />
        )}
      </View>
      <View style={styles.farPointReadouts}>
        <View style={styles.farPointReadout}>
          <Text style={styles.farPointReadoutLabel}>Distance</Text>
          <Text style={styles.farPointReadoutValue}>
            {distance ? `${distance.toFixed(1)} cm` : '—'}
          </Text>
        </View>
        <View style={styles.farPointReadout}>
          <Text style={styles.farPointReadoutLabel}>Stability σ</Text>
          <Text style={[styles.farPointReadoutValue, { color: stdColor }]}>
            {buffer.std != null ? `${buffer.std.toFixed(2)} cm` : '—'}
          </Text>
        </View>
      </View>
      <View style={styles.farPointCounterBox}>
        <Text style={styles.farPointCounter}>Capture {count}/3</Text>
        <View style={styles.dots}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.dot, i < count && styles.dotActive]} />
          ))}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.captureButton, !stable && styles.captureButtonAmber]}
        onPress={onCapture}
      >
        <Text style={styles.captureButtonText}>Capture</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultsPhase({ eye, finalResults, qualityReport, vaThreshold, ppiInfo, optotypeController, dataRecorder, recordId, onDone }) {
  const colorFor = (grade) => ({
    EXCELLENT: '#10b981', GOOD: '#84cc16', FAIR: '#f59e0b',
    POOR: '#ef4444', UNRELIABLE: '#dc2626',
  }[grade] || '#666');
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.resultsScroll}>
      <View style={styles.resultsHeader}>
        <View style={styles.completeBadge}><Text style={styles.completeBadgeText}>✓ Complete</Text></View>
        <Text style={styles.resultsTitle}>Test Results</Text>
        <Text style={styles.resultsSubtitle}>
          {eye === 'right' ? 'Right Eye' : 'Left Eye'} · {new Date().toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.contentSection}>
        <View style={styles.mainResults}>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Spherical Refraction</Text>
            <Text style={styles.resultValue}>{finalResults.spherical.toFixed(2)}</Text>
            <Text style={styles.resultUnit}>Diopters (D)</Text>
          </View>
          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>Visual Acuity</Text>
            <Text style={styles.resultValue}>{optotypeController.logMARToSnellen(vaThreshold)}</Text>
            <Text style={styles.resultUnit}>{vaThreshold.toFixed(2)} logMAR</Text>
          </View>
        </View>
        <View style={[styles.qualityCard, { borderLeftColor: colorFor(qualityReport.grade) }]}>
          <View style={styles.qualityHeader}>
            <Text style={styles.qualityTitle}>Quality Assessment</Text>
            <View style={[styles.qualityBadge, { backgroundColor: colorFor(qualityReport.grade) }]}>
              <Text style={styles.qualityBadgeText}>{qualityReport.score}</Text>
            </View>
          </View>
          <Text style={[styles.qualityGrade, { color: colorFor(qualityReport.grade) }]}>{qualityReport.grade}</Text>
          <View style={styles.qualityBar}>
            <View style={[styles.qualityBarFill, { width: `${qualityReport.score}%`, backgroundColor: colorFor(qualityReport.grade) }]} />
          </View>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Measurement Statistics</Text>
          <View style={styles.statsGrid}>
            <StatsItem label="Vergence Mean"   value={`${finalResults.vergenceMean.toFixed(2)} D`} />
            <StatsItem label="Std. Deviation"  value={`${finalResults.vergenceStd.toFixed(2)} D`} />
            <StatsItem label="Repeatability"   value={`±${(finalResults.vergenceStd * 1.96).toFixed(2)} D`} />
            <StatsItem label="Measurements"    value={`${finalResults.measurementCount}`} />
            {ppiInfo && (
              <StatsItem label="Display PPI" value={`${ppiInfo.ppi} (${ppiInfo.source})`} />
            )}
          </View>
        </View>
        {qualityReport.issues?.length > 0 && (
          <View style={styles.issuesCard}>
            <Text style={styles.issuesTitle}>Quality Notices</Text>
            {qualityReport.issues.map((issue, i) => (
              <View key={i} style={styles.issueItem}>
                <View style={[styles.issueDot, { backgroundColor: issue.severity === 'HIGH' ? '#ef4444' : issue.severity === 'MEDIUM' ? '#f59e0b' : '#84cc16' }]} />
                <Text style={styles.issueText}>{issue.message}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={styles.recommendationCard}>
          <Text style={styles.recommendationTitle}>💡 Recommendation</Text>
          <Text style={styles.recommendationText}>{qualityReport.recommendation}</Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => {
              try {
                const data = dataRecorder?.exportJSON?.(recordId);
                console.log('Exported:', data);
                Alert.alert('Exported', 'Data logged to console.');
              } catch (e) {
                Alert.alert('Error', String(e));
              }
            }}
          >
            <Text style={styles.exportButtonText}>📥 Export Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={onDone}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

function StatusItem({ label, value, color }) {
  return (
    <View style={styles.statusItem}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}
function CheckRow({ label, pass }) {
  return (
    <View style={styles.checkRow}>
      <Text style={[styles.checkBox, pass && styles.checkBoxPass]}>{pass ? '✓' : '○'}</Text>
      <Text style={[styles.checkLabel, pass && styles.checkLabelPass]}>{label}</Text>
    </View>
  );
}
function Stat({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}
function StatsItem({ label, value }) {
  return (
    <View style={styles.statsItem}>
      <Text style={styles.statsLabel}>{label}</Text>
      <Text style={styles.statsValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  statusBar: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 12, right: 12, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, zIndex: 50 },
  statusItem: { flex: 1, alignItems: 'center' },
  statusLabel: { color: '#9ca3af', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  statusValue: { fontSize: 14, fontWeight: '800' },
  introContainer: { backgroundColor: '#000' },
  scrollContent: { paddingBottom: 40 },
  introHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, alignItems: 'center', backgroundColor: '#000' },
  introIcon: { fontSize: 64, marginBottom: 20 },
  introTitle: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  introSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  contentSection: { paddingHorizontal: 20, backgroundColor: '#fafafa', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -20, paddingTop: 32, minHeight: 600 },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  cardTitle: { fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 16 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  bulletNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 1 },
  bulletNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bulletText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 21 },
  ppiInfoCard: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center' },
  ppiInfoText: { fontSize: 12, color: '#666', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }) },
  warningCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  warningTitle: { fontSize: 16, fontWeight: '800', color: '#000', marginBottom: 6 },
  warningText: { fontSize: 14, color: '#666', lineHeight: 20 },
  startButton: { backgroundColor: '#000', borderRadius: 16, padding: 20, alignItems: 'center' },
  startButtonText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  setupContainer: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  setupCard: { backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 20, padding: 24, alignItems: 'center' },
  setupTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 8 },
  setupSubtitle: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 21 },
  checkList: { width: '100%', marginBottom: 20, gap: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  checkBox: { width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, color: '#666', backgroundColor: '#1a1a1a', fontSize: 14, fontWeight: '800', marginRight: 12 },
  checkBoxPass: { color: '#fff', backgroundColor: '#10b981' },
  checkLabel: { color: '#9ca3af', fontSize: 15, flex: 1 },
  checkLabelPass: { color: '#fff' },
  progressRing: { width: '100%', height: 6, borderRadius: 3, backgroundColor: '#1a1a1a', overflow: 'hidden', marginBottom: 12 },
  progressRingFill: { height: '100%', backgroundColor: '#10b981' },
  setupHint: { color: '#9ca3af', fontSize: 13, fontWeight: '600' },
  eyeAnnouncement: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  calibContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  calibCard: { backgroundColor: 'rgba(0,0,0,0.92)', borderRadius: 24, padding: 32, alignItems: 'center', minWidth: 240 },
  calibIcon: { fontSize: 48, marginBottom: 12 },
  calibTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  calibSubtitle: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  calibCountdown: { color: '#10b981', fontSize: 64, fontWeight: '800' },
  testContainer: { flex: 1, paddingTop: Platform.OS === 'ios' ? 100 : 80, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: '#fafafa' },
  statsBar: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#666', marginBottom: 4, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#000' },
  statDivider: { width: 1, backgroundColor: '#f0f0f0', marginHorizontal: 8 },
  optotypeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 20, marginBottom: 16 },
  landoltContainer: { alignItems: 'center', justifyContent: 'center' },
  landoltC: { backgroundColor: 'transparent', position: 'relative' },
  landoltGap: { position: 'absolute', top: '40%', height: '20%' },
  instruction: { fontSize: 15, fontWeight: '600', color: '#666', textAlign: 'center', marginBottom: 16 },
  directionPad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  directionButton: { width: (SCREEN_WIDTH - 48) / 2, aspectRatio: 1.5, borderRadius: 16, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  directionIcon: { fontSize: 40, color: '#fff', fontWeight: '700' },
  farPointContainer: { flex: 1, paddingTop: Platform.OS === 'ios' ? 100 : 80, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 32 : 20, backgroundColor: '#fafafa' },
  farPointTitle: { fontSize: 22, fontWeight: '800', color: '#000', marginBottom: 6 },
  farPointSubtitle: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 16 },
  farPointStimulusBoxBlue: { backgroundColor: FARPOINT_BG, borderRadius: 20, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 240 },
  farPointReadouts: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  farPointReadout: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  farPointReadoutLabel: { fontSize: 11, color: '#666', marginBottom: 4, fontWeight: '600', letterSpacing: 0.5 },
  farPointReadoutValue: { fontSize: 22, fontWeight: '800', color: '#000' },
  farPointCounterBox: { backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  farPointCounter: { fontSize: 13, color: '#666', marginBottom: 8, fontWeight: '600' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: '#3b82f6' },
  captureButton: { backgroundColor: '#10b981', borderRadius: 16, padding: 18, alignItems: 'center' },
  captureButtonAmber: { backgroundColor: '#f59e0b' },
  captureButtonText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  pauseOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  pauseCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '80%' },
  pauseIcon: { fontSize: 48, marginBottom: 8 },
  pauseTitle: { fontSize: 22, fontWeight: '800', color: '#000', marginBottom: 8 },
  pauseReason: { fontSize: 16, color: '#ef4444', fontWeight: '600', textAlign: 'center', marginBottom: 12 },
  pauseHint: { fontSize: 13, color: '#9ca3af' },
  retestOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  retestCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, alignItems: 'center', width: '85%' },
  retestIcon: { fontSize: 48, marginBottom: 8, color: '#f59e0b' },
  retestTitle: { fontSize: 22, fontWeight: '800', color: '#000', marginBottom: 12, textAlign: 'center' },
  retestReason: { fontSize: 14, color: '#ef4444', fontWeight: '600', textAlign: 'center', marginBottom: 12, lineHeight: 21 },
  retestHint: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  retestButton: { backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  retestButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultsScroll: { backgroundColor: '#fff' },
  resultsHeader: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 32, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  completeBadge: { backgroundColor: '#10b981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 16 },
  completeBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  resultsTitle: { fontSize: 28, fontWeight: '800', color: '#000', marginBottom: 6 },
  resultsSubtitle: { fontSize: 14, color: '#666' },
  mainResults: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  resultCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0' },
  resultLabel: { fontSize: 12, color: '#666', marginBottom: 10, textAlign: 'center' },
  resultValue: { fontSize: 32, fontWeight: '800', color: '#000', marginBottom: 6 },
  resultUnit: { fontSize: 12, color: '#999' },
  qualityCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0', borderLeftWidth: 4 },
  qualityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  qualityTitle: { fontSize: 17, fontWeight: '800', color: '#000' },
  qualityBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  qualityBadgeText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  qualityGrade: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  qualityBar: { height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' },
  qualityBarFill: { height: '100%' },
  statsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  statsTitle: { fontSize: 17, fontWeight: '800', color: '#000', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statsItem: { flex: 1, minWidth: '45%', backgroundColor: '#f8f9fa', padding: 14, borderRadius: 12 },
  statsLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  statsValue: { fontSize: 16, fontWeight: '800', color: '#000' },
  issuesCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#f0f0f0' },
  issuesTitle: { fontSize: 17, fontWeight: '800', color: '#000', marginBottom: 12 },
  issueItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  issueDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 12 },
  issueText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  recommendationCard: { backgroundColor: '#f0f9ff', borderRadius: 20, padding: 20, marginBottom: 16 },
  recommendationTitle: { fontSize: 16, fontWeight: '800', color: '#000', marginBottom: 8 },
  recommendationText: { fontSize: 14, color: '#333', lineHeight: 21 },
  actionButtons: { gap: 12, marginBottom: 24 },
  exportButton: { backgroundColor: '#fff', borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 2, borderColor: '#000' },
  exportButtonText: { fontSize: 15, fontWeight: '700', color: '#000' },
  doneButton: { backgroundColor: '#000', borderRadius: 16, padding: 18, alignItems: 'center' },
  doneButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
});