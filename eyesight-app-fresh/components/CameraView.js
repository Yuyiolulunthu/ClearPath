/**
 * CameraView v1.4
 * --------------------------------------------------------------------------
 * Changes from v1.3:
 *   - Passes face.yawAngle and face.pitchAngle to DistanceEstimator so
 *     the cos(yaw)·cos(pitch) pose correction can be applied (Feasibility
 *     doc §3.2).
 * --------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useFrameProcessor,
} from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

import DistanceEstimator from '../utils/DistanceEstimator';
import EyeStateDetector from '../utils/EyeStateDetector';

const JS_UPDATE_INTERVAL_MS = 100;
const CALIBRATION_MIN_IPD = 0.08;

export default function CameraView({
  onUpdate,
  onCalibrate,
  calibrationDistanceCm = 40,
  showOverlay = true,
  mirroredCamera = true,
}) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');

  const distanceEstimatorRef = useRef(null);
  const eyeStateDetectorRef  = useRef(null);
  if (!distanceEstimatorRef.current) {
    distanceEstimatorRef.current = new DistanceEstimator();
  }
  if (!eyeStateDetectorRef.current) {
    eyeStateDetectorRef.current = new EyeStateDetector({ mirroredCamera });
  }

  const hasLoggedLandmarks = useRef(false);

  const [calibrated,      setCalibrated]      = useState(false);
  const [distance,        setDistance]        = useState(null);
  const [distanceConf,    setDistanceConf]    = useState(0);
  const [eyeState,        setEyeState]        = useState({
    leftCovered:  false,
    rightCovered: false,
    activeEye:    'both',
    confidence:   0,
    leftProb:     null,
    rightProb:    null,
  });
  const [trackingQuality, setTrackingQuality] = useState('searching');
  const [lastFace,        setLastFace]        = useState(null);

  const faceDetectionOptions = useRef({
    performanceMode:    'accurate',
    classificationMode: 'all',
    landmarkMode:       'all',
    contourMode:        'none',
    minFaceSize:        0.15,
    trackingEnabled:    true,
    autoMode:           true,
  }).current;

  const { detectFaces } = useFaceDetector(faceDetectionOptions);

  const lastUpdateAt = useRef(0);

  const onFacesJS = Worklets.createRunOnJS((faces) => {
    const now = Date.now();
    if (now - lastUpdateAt.current < JS_UPDATE_INTERVAL_MS) return;
    lastUpdateAt.current = now;

    if (!faces || faces.length === 0) {
      setTrackingQuality('searching');
      setLastFace(null);
      return;
    }

    const face = faces[0];

    if (!hasLoggedLandmarks.current) {
      hasLoggedLandmarks.current = true;
      console.log('[CameraView] Face object structure (first detection):');
      console.log(JSON.stringify(face, null, 2));
    }

    const faceWidth = face.bounds?.width ?? null;

    const leftEye  = face.landmarks?.LEFT_EYE;
    const rightEye = face.landmarks?.RIGHT_EYE;
    let ipd = null;
    if (leftEye && rightEye) {
      const lx = leftEye.x  ?? leftEye.position?.x;
      const ly = leftEye.y  ?? leftEye.position?.y;
      const rx = rightEye.x ?? rightEye.position?.x;
      const ry = rightEye.y ?? rightEye.position?.y;
      if (Number.isFinite(lx) && Number.isFinite(rx)) {
        ipd = Math.hypot(lx - rx, ly - ry);
      }
    }

    const distanceFeature = ipd ?? faceWidth;
    const yaw   = face.yawAngle   ?? 0;
    const pitch = face.pitchAngle ?? 0;

    let dist_cm = null, dist_conf = 0;
    if (distanceFeature) {
      // v1.4: pass yaw and pitch for cos(yaw)·cos(pitch) pose correction
      const result = distanceEstimatorRef.current.getDistanceWithConfidence(
        distanceFeature, yaw, pitch
      );
      dist_cm   = result.distance;
      dist_conf = result.confidence;
    }

    const eyeResult = eyeStateDetectorRef.current.analyze({
      leftEyeOpenProb:  face.leftEyeOpenProbability,
      rightEyeOpenProb: face.rightEyeOpenProbability,
      yaw:              face.yawAngle,
      roll:             face.rollAngle,
    });

    const yawAbs  = Math.abs(yaw);
    const rollAbs = Math.abs(face.rollAngle ?? 0);
    let quality;
    if (!distanceEstimatorRef.current.isCalibrated())          quality = 'uncalibrated';
    else if (yawAbs > 15 || rollAbs > 15)                      quality = 'tilted';
    else if (dist_cm === null)                                 quality = 'unstable';
    else if (dist_cm < 30 || dist_cm > 60)                     quality = 'wrong_distance';
    else                                                       quality = 'good';

    setLastFace({
      bounds:           face.bounds,
      yaw:              face.yawAngle,
      roll:             face.rollAngle,
      pitch:            face.pitchAngle,
      faceWidth,
      ipd,
      leftEyeOpenProb:  face.leftEyeOpenProbability,
      rightEyeOpenProb: face.rightEyeOpenProbability,
    });
    setDistance(dist_cm);
    setDistanceConf(dist_conf);
    setEyeState(eyeResult);
    setTrackingQuality(quality);

    onUpdate?.({
      face,
      distance:       dist_cm,
      distanceConf:   dist_conf,
      eyeState:       eyeResult,
      faceWidth,
      ipd,
      quality,
      isCalibrated:   distanceEstimatorRef.current.isCalibrated(),
    });
  });

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const faces = detectFaces(frame);
      onFacesJS(faces);
    },
    [onFacesJS, detectFaces]
  );

  const calibrate = useCallback(() => {
    const ipd = lastFace?.ipd;
    const fw  = lastFace?.faceWidth;

    if (!lastFace || (ipd == null && fw == null)) {
      Alert.alert(
        'No face detected',
        'Hold the phone in front of your face and wait for tracking to start.'
      );
      return false;
    }

    const feature = ipd ?? fw;
    if (feature < CALIBRATION_MIN_IPD) {
      Alert.alert(
        'Move closer',
        `Your face is too small in frame (IPD ≈ ${(feature * 100).toFixed(1)}% of frame width). Move closer to ~40 cm.`
      );
      return false;
    }

    const yaw   = Math.abs(lastFace.yaw   ?? 0);
    const roll  = Math.abs(lastFace.roll  ?? 0);
    const pitch = Math.abs(lastFace.pitch ?? 0);
    if (yaw > 10 || roll > 10 || pitch > 15) {
      Alert.alert(
        'Face not straight',
        `Look directly at the camera. yaw=${yaw.toFixed(0)}°, roll=${roll.toFixed(0)}°, pitch=${pitch.toFixed(0)}°. Yaw/roll < 10°, pitch < 15°.`
      );
      return false;
    }

    const result = distanceEstimatorRef.current.calibrateFromIPD(
      calibrationDistanceCm,
      feature
    );

    if (!result.ok) {
      Alert.alert('Calibration failed', result.error ?? 'Unknown error');
      return false;
    }

    setCalibrated(true);
    onCalibrate?.({
      distance:    calibrationDistanceCm,
      ipd:         ipd,
      faceWidth:   fw,
      featureUsed: feature,
      k:           result.k,
    });
    return true;
  }, [lastFace, calibrationDistanceCm, onCalibrate]);

  useEffect(() => {
    if (onUpdate) onUpdate.calibrate = calibrate;
  }, [calibrate, onUpdate]);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigText}>Camera permission required</Text>
        <Text style={styles.helper}>
          ClearPath needs camera access to measure your distance and detect
          which eye is being tested.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.helper}>Loading front camera…</Text>
      </View>
    );
  }

  const distanceColor =
    trackingQuality === 'good'           ? '#10b981' :
    trackingQuality === 'wrong_distance' ? '#f59e0b' :
    '#ef4444';

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />

      {showOverlay && (
        <View style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <StatusItem
              label="Tracking"
              value={trackingQuality.replace('_', ' ').toUpperCase()}
              color={trackingQuality === 'good' ? '#10b981' : '#f59e0b'}
            />
            <StatusItem
              label="Distance"
              value={distance ? `${distance.toFixed(1)} cm` : '—'}
              color={distanceColor}
              sub={distance ? `${(distanceConf * 100).toFixed(0)}% conf` : null}
            />
            <StatusItem
              label="Calibrated"
              value={calibrated ? 'YES' : 'NO'}
              color={calibrated ? '#10b981' : '#ef4444'}
            />
          </View>

          <View style={styles.middleArea} pointerEvents="none">
            <View style={[
              styles.faceFrame,
              {
                borderColor:
                  trackingQuality === 'good' ? '#10b981' :
                  lastFace ? '#f59e0b' : '#ffffff66',
              },
            ]} />
            {lastFace && (
              <View style={styles.angleReadout}>
                <Text style={styles.angleText}>
                  yaw {(lastFace.yaw ?? 0).toFixed(0)}° · roll {(lastFace.roll ?? 0).toFixed(0)}° · pitch {(lastFace.pitch ?? 0).toFixed(0)}°
                </Text>
                <Text style={styles.angleText}>
                  IPD {lastFace.ipd != null ? (lastFace.ipd * 100).toFixed(1) + '%' : '—'}
                  {' · '}
                  face W {lastFace.faceWidth != null ? (lastFace.faceWidth * 100).toFixed(0) + '%' : '—'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.bottomPanel}>
            <Text style={styles.panelTitle}>Eye State</Text>
            <View style={styles.eyeRow}>
              <EyeIndicator label="LEFT EYE"  covered={eyeState.leftCovered}  prob={eyeState.leftProb} />
              <EyeIndicator label="RIGHT EYE" covered={eyeState.rightCovered} prob={eyeState.rightProb} />
            </View>

            <View style={styles.activeEyeBanner}>
              <Text style={styles.activeEyeLabel}>TESTING</Text>
              <Text style={[
                styles.activeEyeValue,
                { color: eyeState.validState ? '#10b981' : '#9ca3af' },
              ]}>
                {eyeState.activeEye === 'left'  ? 'LEFT EYE'  :
                 eyeState.activeEye === 'right' ? 'RIGHT EYE' :
                 eyeState.activeEye === 'both'  ? 'cover one eye to begin' :
                 'both eyes covered'}
              </Text>
            </View>

            {!calibrated && (
              <TouchableOpacity
                style={[styles.calibrateBtn, !lastFace && { opacity: 0.4 }]}
                onPress={calibrate}
                disabled={!lastFace}
              >
                <Text style={styles.calibrateBtnText}>
                  Calibrate at {calibrationDistanceCm} cm
                </Text>
                <Text style={styles.calibrateBtnHint}>
                  Hold phone exactly {calibrationDistanceCm} cm away, look straight, then tap
                </Text>
              </TouchableOpacity>
            )}

            {calibrated && (
              <TouchableOpacity
                style={styles.recalibrateBtn}
                onPress={() => {
                  distanceEstimatorRef.current.resetCalibration();
                  setCalibrated(false);
                  setDistance(null);
                }}
              >
                <Text style={styles.recalibrateBtnText}>Re-calibrate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function StatusItem({ label, value, color, sub }) {
  return (
    <View style={styles.statusItem}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color }]} numberOfLines={1}>{value}</Text>
      {sub && <Text style={styles.statusSub}>{sub}</Text>}
    </View>
  );
}

function EyeIndicator({ label, covered, prob }) {
  return (
    <View style={styles.eyeIndicator}>
      <Text style={styles.eyeLabel}>{label}</Text>
      <View style={[styles.eyeStatusPill, covered ? styles.eyeCoveredPill : styles.eyeOpenPill]}>
        <Text style={[styles.eyeStatusText, { color: covered ? '#fff' : '#10b981' }]}>
          {covered ? 'COVERED' : 'OPEN'}
        </Text>
      </View>
      <Text style={styles.eyeProb}>
        {prob !== null && prob !== undefined ? `${(prob * 100).toFixed(0)}%` : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 24 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  bigText: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 12 },
  helper: { color: '#cbd5e1', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  btn: { marginTop: 24, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#000' },
  topBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  statusItem: { flex: 1, alignItems: 'center' },
  statusLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  statusValue: { fontSize: 14, fontWeight: '700' },
  statusSub:   { color: '#9ca3af', fontSize: 10, marginTop: 2 },
  middleArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  faceFrame: { width: 240, height: 320, borderWidth: 3, borderRadius: 120, borderStyle: 'dashed' },
  angleReadout: {
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  angleText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    textAlign: 'center',
  },
  bottomPanel: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  },
  panelTitle: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  eyeRow: { flexDirection: 'row', gap: 12 },
  eyeIndicator: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  eyeLabel: { color: '#9ca3af', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  eyeStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  eyeOpenPill:    { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: '#10b981' },
  eyeCoveredPill: { backgroundColor: '#ef4444' },
  eyeStatusText:  { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  eyeProb:        { color: '#cbd5e1', fontSize: 12, marginTop: 6, fontWeight: '600' },
  activeEyeBanner: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  activeEyeLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  activeEyeValue: { fontSize: 18, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  calibrateBtn: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  calibrateBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  calibrateBtnHint: { color: '#666', fontSize: 11, marginTop: 4 },
  recalibrateBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
  },
  recalibrateBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});