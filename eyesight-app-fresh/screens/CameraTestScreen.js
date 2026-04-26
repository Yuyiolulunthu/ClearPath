/**
 * CameraTestScreen v1.3
 * --------------------------------------------------------------------------
 * Updated to match CameraView v1.3 callback shape:
 *   - `ipd_pixels` is now `ipd` (normalized 0-1)
 *   - Added `faceWidth` display
 *   - Calibration info uses new field names
 * --------------------------------------------------------------------------
 */

import { useRef, useState } from 'react';
import {
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CameraView from '../components/CameraView';

export default function CameraTestScreen({ navigation }) {
  const [latest, setLatest] = useState(null);
  const [calibInfo, setCalibInfo] = useState(null);

  const distanceLog = useRef([]);
  const [logVersion, setLogVersion] = useState(0);

  const handleUpdate = (state) => {
    setLatest(state);
    if (state.distance !== null && state.distance !== undefined) {
      distanceLog.current.push(state.distance);
      if (distanceLog.current.length > 30) distanceLog.current.shift();
      setLogVersion((v) => v + 1);
    }
  };

  const handleCalibrate = (info) => {
    setCalibInfo(info);
    distanceLog.current = [];
  };

  const distStats = computeStats(distanceLog.current);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {navigation && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}

      <View style={styles.cameraContainer}>
        <CameraView
          onUpdate={handleUpdate}
          onCalibrate={handleCalibrate}
          calibrationDistanceCm={40}
          showOverlay={true}
        />
      </View>

      <ScrollView
        style={styles.debugPanel}
        contentContainerStyle={styles.debugContent}
      >
        <Text style={styles.debugTitle}>DEBUG OUTPUT</Text>

        <Section title="Calibration">
          {calibInfo ? (
            <>
              <Row k="Reference distance" v={`${calibInfo.distance} cm`} />
              <Row
                k="Feature used at calib"
                v={
                  calibInfo.featureUsed != null
                    ? `${(calibInfo.featureUsed * 100).toFixed(2)}%`
                    : '—'
                }
              />
              <Row
                k="IPD at calib"
                v={
                  calibInfo.ipd != null
                    ? `${(calibInfo.ipd * 100).toFixed(2)}%`
                    : '—'
                }
              />
              <Row
                k="Face W at calib"
                v={
                  calibInfo.faceWidth != null
                    ? `${(calibInfo.faceWidth * 100).toFixed(1)}%`
                    : '—'
                }
              />
              <Row
                k="k constant"
                v={
                  calibInfo.k != null ? `${calibInfo.k.toFixed(3)} cm·norm` : '—'
                }
              />
            </>
          ) : (
            <Text style={styles.dim}>Not calibrated yet.</Text>
          )}
        </Section>

        <Section title="Distance stability (last 30 samples)">
          {distStats ? (
            <>
              <Row k="Mean"      v={`${distStats.mean.toFixed(2)} cm`} />
              <Row k="Std dev"   v={`${distStats.std.toFixed(2)} cm`} />
              <Row k="CV"        v={`${(distStats.cv * 100).toFixed(1)}%`} />
              <Row k="Min / Max" v={`${distStats.min.toFixed(1)} / ${distStats.max.toFixed(1)} cm`} />
              <Row k="Samples"   v={`${distStats.n}`} />
            </>
          ) : (
            <Text style={styles.dim}>Need calibration + face in view.</Text>
          )}
        </Section>

        <Section title="Latest face detection">
          {latest?.face ? (
            <>
              <Row
                k="IPD"
                v={
                  latest.ipd != null
                    ? `${(latest.ipd * 100).toFixed(2)}%`
                    : '—'
                }
              />
              <Row
                k="Face W"
                v={
                  latest.faceWidth != null
                    ? `${(latest.faceWidth * 100).toFixed(1)}%`
                    : '—'
                }
              />
              <Row k="Yaw"   v={`${(latest.face.yawAngle ?? 0).toFixed(1)}°`} />
              <Row k="Roll"  v={`${(latest.face.rollAngle ?? 0).toFixed(1)}°`} />
              <Row k="Pitch" v={`${(latest.face.pitchAngle ?? 0).toFixed(1)}°`} />
              <Row
                k="Left eye open prob"
                v={fmtProb(latest.face.leftEyeOpenProbability)}
              />
              <Row
                k="Right eye open prob"
                v={fmtProb(latest.face.rightEyeOpenProbability)}
              />
              <Row k="Tracking ID" v={`${latest.face.trackingId ?? '—'}`} />
            </>
          ) : (
            <Text style={styles.dim}>No face detected yet.</Text>
          )}
        </Section>

        <Section title="Eye state">
          {latest?.eyeState ? (
            <>
              <Row k="Left covered"     v={latest.eyeState.leftCovered  ? 'YES' : 'no'} />
              <Row k="Right covered"    v={latest.eyeState.rightCovered ? 'YES' : 'no'} />
              <Row k="Active eye"       v={`${latest.eyeState.activeEye ?? '—'}`} />
              <Row k="Valid test state" v={latest.eyeState.validState ? 'YES' : 'no'} />
              <Row
                k="Confidence"
                v={
                  latest.eyeState.confidence != null
                    ? `${(latest.eyeState.confidence * 100).toFixed(0)}%`
                    : '—'
                }
              />
              <Row k="Reason" v={`${latest.eyeState.reason ?? '—'}`} />
            </>
          ) : (
            <Text style={styles.dim}>—</Text>
          )}
        </Section>

        <Section title="Test checklist">
          <Check label="Face detected within 1 sec" pass={!!latest?.face} />
          <Check label="Calibrated"                  pass={!!calibInfo} />
          <Check
            label="Distance stable (CV < 3%)"
            pass={!!distStats && distStats.cv < 0.03}
          />
          <Check
            label="Eye state confidence > 70% when one eye covered"
            pass={
              !!latest?.eyeState?.validState &&
              latest.eyeState.confidence > 0.7
            }
          />
        </Section>
      </ScrollView>
    </View>
  );
}

// ---------- helpers ----------

function fmtProb(p) {
  return p === undefined || p === null ? '—' : `${(p * 100).toFixed(0)}%`;
}

function computeStats(arr) {
  if (!arr || arr.length < 3) return null;
  const n = arr.length;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  return {
    n, mean, std,
    cv: std / mean,
    min: Math.min(...arr),
    max: Math.max(...arr),
  };
}

// ---------- subcomponents ----------

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ k, v }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={styles.rowValue}>{v}</Text>
    </View>
  );
}

function Check({ label, pass }) {
  return (
    <View style={styles.checkRow}>
      <Text style={[styles.checkBox, pass && styles.checkBoxPass]}>
        {pass ? '✓' : '○'}
      </Text>
      <Text style={[styles.checkLabel, pass && styles.checkLabelPass]}>
        {label}
      </Text>
    </View>
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 24,
    left: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  cameraContainer: { flex: 1.4 },
  debugPanel:      { flex: 1, backgroundColor: '#0a0a0a' },
  debugContent:    { padding: 16, paddingBottom: 32 },

  debugTitle: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  section: { marginBottom: 16 },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  sectionBody: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  rowKey:   { color: '#9ca3af', fontSize: 13 },
  rowValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  dim: { color: '#555', fontSize: 13, fontStyle: 'italic' },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: 'center',
    lineHeight: 22,
    color: '#555',
    backgroundColor: '#1a1a1a',
    fontSize: 14,
    fontWeight: '800',
    marginRight: 10,
  },
  checkBoxPass: {
    color: '#fff',
    backgroundColor: '#10b981',
  },
  checkLabel: { color: '#9ca3af', fontSize: 13, flex: 1 },
  checkLabelPass: { color: '#fff' },
});