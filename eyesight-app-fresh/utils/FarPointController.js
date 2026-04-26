/**
 * FarPointController v1.1
 * --------------------------------------------------------------------------
 * Handheld-realistic thresholds.
 *
 * Feasibility doc §7.2 specifies σ_d ≤ 1.0 cm. That value is calibrated
 * against fixed-fixture or head-rest setups. For a handheld phone, even
 * a steady user produces 1.5-2.5 cm of natural sway in the camera's
 * IPD-derived distance estimate. Setting the gate at 1.0 cm makes the
 * Capture button effectively unreachable.
 *
 * We use 2.5 cm as the operational threshold and surface the actual σ
 * to the user, with the data logged for downstream analysis. After we
 * collect a real validation cohort (P1+), we'll tighten this to the
 * §7.2 figure if the data supports it.
 *
 * Min samples relaxed from 5 to 3 because at 10 Hz throttle a single
 * dropped frame can leave us with 4 samples in a 500 ms window.
 * --------------------------------------------------------------------------
 */

const DEFAULT_WINDOW_MS    = 500;
const DEFAULT_SIGMA_MAX_CM = 2.5;   // relaxed from 1.0 (handheld reality)
const MIN_SAMPLES_FOR_GATE = 3;     // relaxed from 5

export class FarPointController {
  constructor(opts = {}) {
    this.windowMs    = opts.windowMs    ?? DEFAULT_WINDOW_MS;
    this.sigmaMaxCm  = opts.sigmaMaxCm  ?? DEFAULT_SIGMA_MAX_CM;
    this.minSamples  = opts.minSamples  ?? MIN_SAMPLES_FOR_GATE;
    this.samples     = [];
  }

  pushSample(distanceCm, timestamp = Date.now()) {
    if (!Number.isFinite(distanceCm)) return;
    this.samples.push({ t: timestamp, d: distanceCm });
    const cutoff = timestamp - this.windowMs;
    while (this.samples.length > 0 && this.samples[0].t < cutoff) {
      this.samples.shift();
    }
  }

  inspect() {
    if (this.samples.length === 0) {
      return { ready: false, mean: null, std: null, sampleCount: 0, durationMs: 0 };
    }
    const ds = this.samples.map(s => s.d);
    const mean = ds.reduce((a, b) => a + b, 0) / ds.length;
    const variance = ds.reduce((a, b) => a + (b - mean) ** 2, 0) / ds.length;
    const std = Math.sqrt(variance);
    const durationMs = this.samples[this.samples.length - 1].t - this.samples[0].t;
    const ready =
      this.samples.length >= this.minSamples &&
      durationMs >= this.windowMs * 0.6;   // relaxed from 0.8
    return { ready, mean, std, sampleCount: this.samples.length, durationMs };
  }

  tryCapture() {
    const { ready, mean, std, sampleCount, durationMs } = this.inspect();

    if (sampleCount === 0) {
      return { ok: false, reason: 'No distance reading. Wait for the camera to lock on your face.' };
    }
    if (!ready) {
      return {
        ok: false,
        reason: `Need ${this.minSamples} samples in window — got ${sampleCount} over ${durationMs} ms. Hold steady a moment.`,
        sampleCount, durationMs,
      };
    }
    if (std > this.sigmaMaxCm) {
      return {
        ok: false,
        reason: `σ = ${std.toFixed(2)} cm (max ${this.sigmaMaxCm}). Hold the phone steadier.`,
        std, sampleCount, durationMs,
      };
    }

    this.samples = [];
    return { ok: true, mean, std, sampleCount, durationMs };
  }

  reset() {
    this.samples = [];
  }
}

export default FarPointController;