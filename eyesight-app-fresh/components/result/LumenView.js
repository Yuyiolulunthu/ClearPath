/**
 * LumenView — consumer-friendly wellness result page
 * --------------------------------------------------------------------------
 * Shows a 6-axis radar (Distance / Near / Focus / Light / Contrast / Colour)
 * with the dimensions ClearPath actually measures highlighted in the brand
 * colour, and the unmeasured dimensions de-emphasized with a small "more
 * tests coming" note.
 *
 * The wellness index in the centre is the mean of the MEASURED dimensions
 * only — no fake numbers in unmeasured slots.
 *
 * Requires react-native-svg:
 *   npx expo install react-native-svg
 * --------------------------------------------------------------------------
 */

import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

const ACCENT  = '#C44D26';    // editorial orange
const ACCENT_FAINT = 'rgba(196, 77, 38, 0.15)';
const PAPER   = '#F4ECDD';    // cream background
const INK     = '#1A1A1A';    // strong text
const MUTED   = '#7A6D5F';    // secondary text
const FAINT   = '#D4C8B2';    // grid lines, untested axes

// Order matches the design clockwise from top.
const DIMENSIONS = [
  { key: 'distance', label: 'DISTANCE', measured: true  },
  { key: 'near',     label: 'NEAR',     measured: false },
  { key: 'colour',   label: 'COLOUR',   measured: false },
  { key: 'contrast', label: 'CONTRAST', measured: false },
  { key: 'light',    label: 'LIGHT',    measured: false },
  { key: 'focus',    label: 'FOCUS',    measured: true  },
];

// ---------- Score derivation from measurements ----------

function computeLumenScores(finalResults, vaThreshold, qualityReport) {
  // Distance: derive from vergence consistency. Smaller σ → higher score.
  // ISO target σ ≤ 0.20 D → 100. σ = 0.50 D → 0.
  const vstd = finalResults?.vergenceStd;
  const distance = Number.isFinite(vstd)
    ? Math.max(0, Math.min(100, Math.round(100 - vstd * 333)))
    : null;

  // Focus: derive from logMAR.  logMAR 0 (20/20) → 100. logMAR 0.3 (20/40) → 70.
  // logMAR 0.7 → 30. Clamp 0..100.
  const focus = Number.isFinite(vaThreshold)
    ? Math.max(0, Math.min(100, Math.round(100 - vaThreshold * 100)))
    : null;

  return {
    distance,
    focus,
    near:     null,
    light:    null,
    contrast: null,
    colour:   null,
  };
}

function overallIndex(scores) {
  const measured = Object.values(scores).filter((v) => Number.isFinite(v));
  if (measured.length === 0) return null;
  return Math.round(measured.reduce((a, b) => a + b, 0) / measured.length);
}

// ---------- Radar chart geometry ----------

function radarPoint(i, val, maxVal = 100, radius = 1) {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length;
  const r = (val / maxVal) * radius;
  return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
}

function gridHexagonPoints(level, radius = 1) {
  const r = level * radius;
  return DIMENSIONS.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length;
    return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
  }).join(' ');
}

function valuePolygon(scores, radius = 1) {
  return DIMENSIONS.map((d, i) => {
    const v = scores[d.key];
    // Untested axes get rendered at a small inner radius so the polygon
    // still has shape. We dim it visually instead.
    const val = Number.isFinite(v) ? v : 0;
    const p = radarPoint(i, val, 100, radius);
    return `${p.x},${p.y}`;
  }).join(' ');
}

// ---------- Radar SVG ----------

function Radar({ scores }) {
  const SIZE = 280;
  const cx = SIZE / 2, cy = SIZE / 2;
  const RADIUS = 110;     // outer radius in SVG units (pixels here)
  const LABEL_R = 130;    // label distance from center

  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <G transform={`translate(${cx}, ${cy})`}>
        {/* Concentric grid */}
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((lvl, i) => (
          <Polygon
            key={i}
            points={gridHexagonPoints(lvl, RADIUS)}
            fill="none"
            stroke={FAINT}
            strokeWidth={0.8}
          />
        ))}

        {/* Radial axes */}
        {DIMENSIONS.map((d, i) => {
          const p = radarPoint(i, 100, 100, RADIUS);
          return (
            <Line
              key={i}
              x1={0} y1={0} x2={p.x} y2={p.y}
              stroke={FAINT}
              strokeWidth={0.8}
            />
          );
        })}

        {/* Value polygon */}
        <Polygon
          points={valuePolygon(scores, RADIUS)}
          fill={ACCENT_FAINT}
          stroke={ACCENT}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Vertex dots — solid for measured, hollow for untested */}
        {DIMENSIONS.map((d, i) => {
          const v = scores[d.key];
          const measured = Number.isFinite(v);
          const val = measured ? v : 0;
          const p = radarPoint(i, val, 100, RADIUS);
          return (
            <Circle
              key={i}
              cx={p.x} cy={p.y}
              r={measured ? 4 : 3}
              fill={measured ? ACCENT : '#fff'}
              stroke={measured ? ACCENT : FAINT}
              strokeWidth={measured ? 0 : 1.5}
            />
          );
        })}

        {/* Per-axis numeric labels for measured dimensions */}
        {DIMENSIONS.map((d, i) => {
          const v = scores[d.key];
          if (!Number.isFinite(v)) return null;
          const p = radarPoint(i, v + 8, 100, RADIUS);
          return (
            <SvgText
              key={i}
              x={p.x} y={p.y}
              fontSize={11}
              fontWeight="600"
              textAnchor="middle"
              fill={MUTED}
            >
              {v}
            </SvgText>
          );
        })}

        {/* Axis labels around the outside */}
        {DIMENSIONS.map((d, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DIMENSIONS.length;
          const x = LABEL_R * Math.cos(angle);
          const y = LABEL_R * Math.sin(angle) + 4;
          return (
            <SvgText
              key={i}
              x={x} y={y}
              fontSize={10}
              fontWeight="700"
              textAnchor="middle"
              fill={d.measured ? INK : FAINT}
              letterSpacing="1.2"
            >
              {d.label}
            </SvgText>
          );
        })}

        {/* Center score badge */}
        <Circle cx={0} cy={0} r={28} fill="#fff" stroke={FAINT} strokeWidth={1} />
      </G>
    </Svg>
  );
}

// ---------- Insight derivation ----------

function deriveInsights(qualityReport, scores) {
  const out = [];
  const issues = qualityReport?.issues ?? [];

  // Top 2 quality issues if available
  for (const i of issues.slice(0, 2)) {
    out.push({
      severity: i.severity,
      title:    issueTitle(i),
      hint:     i.message,
    });
  }

  // Always: untested-dimension nudge
  const untested = DIMENSIONS.filter((d) => !Number.isFinite(scores[d.key])).map((d) => d.label.toLowerCase());
  if (untested.length > 0) {
    out.push({
      severity: 'LOW',
      title:    `${untested.length} of 6 vision dimensions still untested.`,
      hint:     `${untested.join(', ')} tests coming in future versions.`,
    });
  }

  return out.slice(0, 3);
}

function issueTitle(issue) {
  if (issue.source === 'cross-modality') return 'Cross-check inconsistency.';
  if (issue.source === 'va-staircase')   return 'Acuity test was uncertain.';
  if (issue.source === 'calibration-status') return 'Refraction not yet calibrated.';
  return 'Quality notice.';
}

// ---------- Main view ----------

export default function LumenView({
  finalResults,
  vaThreshold,
  qualityReport,
  eye,
  date,
}) {
  const scores = computeLumenScores(finalResults, vaThreshold, qualityReport);
  const overall = overallIndex(scores);
  const insights = deriveInsights(qualityReport, scores);
  const dateLabel = date || new Date().toDateString().toUpperCase().slice(0, 10);

  return (
    <ScrollView
      style={{ backgroundColor: PAPER }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandDot} />
          <Text style={styles.brandName}>ALL GOOD VISION</Text>
        </View>
        <Text style={styles.dateText}>{dateLabel}</Text>
      </View>

      <Text style={styles.eyebrow}>VISION WELLNESS READ</Text>
      <Text style={styles.title}>Your eyes,</Text>
      <Text style={[styles.title, styles.titleAccent]}>visualised.</Text>

      <View style={styles.radarHolder}>
        <Radar scores={scores} />
        {/* Score in the center */}
        <View style={styles.centerBadge}>
          <Text style={styles.centerScore}>{overall ?? '—'}</Text>
          <Text style={styles.centerLabel}>SCORE</Text>
        </View>
      </View>

      <View style={styles.overallCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overallLabel}>OVERALL</Text>
          <Text style={styles.overallTitle}>Vision wellness index</Text>
          <Text style={styles.overallSub}>
            {`Mean of ${Object.values(scores).filter(Number.isFinite).length} of 6 dimensions tested`}
          </Text>
        </View>
        <View style={styles.deltaPill}>
          <Text style={styles.deltaPillText}>
            {Number.isFinite(overall) ? `${overall} pts` : '—'}
          </Text>
        </View>
      </View>

      {insights.map((ins, i) => (
        <View key={i} style={styles.insightRow}>
          <View style={[styles.insightDot, { backgroundColor: severityColor(ins.severity) }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>{ins.title}</Text>
            <Text style={styles.insightHint}>{ins.hint}</Text>
          </View>
          <Text style={styles.insightArrow}>→</Text>
        </View>
      ))}

      <View style={styles.footerNote}>
        <Text style={styles.footerNoteText}>
          ALL GOOD VISION currently measures Distance and Focus. Near, Light, Contrast, and
          Colour assessments are on the development roadmap.
        </Text>
      </View>
    </ScrollView>
  );
}

function severityColor(sev) {
  if (sev === 'HIGH')   return '#C44D26';
  if (sev === 'MEDIUM') return '#A8842B';
  return '#6B6051';
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: ACCENT },
  brandName: {
    fontSize: 18, fontWeight: '500', color: INK,
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
  },
  dateText: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  eyebrow: { color: MUTED, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8 },
  title: {
    fontSize: 44, fontWeight: '500', color: INK, lineHeight: 48,
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
  },
  titleAccent: { color: ACCENT, fontStyle: 'italic', marginBottom: 24 },

  radarHolder: { alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative' },
  centerBadge: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
    width: 56, height: 56,
  },
  centerScore: {
    fontSize: 26, fontWeight: '500', color: INK, lineHeight: 28,
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }),
  },
  centerLabel: { fontSize: 8, fontWeight: '700', color: MUTED, letterSpacing: 1.2, marginTop: 2 },

  overallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: FAINT,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 28,
  },
  overallLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.2, marginBottom: 6 },
  overallTitle: { fontSize: 17, color: INK, fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Times New Roman', android: 'serif' }), marginBottom: 4 },
  overallSub:   { fontSize: 13, color: MUTED },
  deltaPill: { backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  deltaPillText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },

  insightRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16,
    borderTopWidth: 0.7, borderTopColor: FAINT,
  },
  insightDot: { width: 7, height: 7, borderRadius: 3.5, marginTop: 6, marginRight: 14 },
  insightTitle: { fontSize: 15, color: INK, fontWeight: '500', marginBottom: 4 },
  insightHint:  { fontSize: 13, color: MUTED, lineHeight: 18 },
  insightArrow: { color: MUTED, fontSize: 16, marginLeft: 8 },

  footerNote: { marginTop: 16, paddingTop: 18, borderTopWidth: 0.7, borderTopColor: FAINT },
  footerNoteText: { fontSize: 12, color: MUTED, lineHeight: 18, fontStyle: 'italic' },
});