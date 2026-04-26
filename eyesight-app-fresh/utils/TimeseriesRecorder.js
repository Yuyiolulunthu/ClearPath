/**
 * TimeseriesRecorder
 * --------------------------------------------------------------------------
 * In-memory buffer for §10 audit data:
 *   - frames: per-camera-update samples of d(t), yaw, roll, pitch, conf, etc.
 *   - events: phase transitions, gate triggers, captures, pauses, etc.
 *
 * Both share a common monotonic time axis (ms since session start), so
 * downstream analysis can reconstruct everything that happened during the
 * test run.
 *
 * Memory: ~80 bytes/frame × 10 Hz × ~5 min ≈ 240 KB worst case. Well under
 * RN's per-message limit. Frames live in this object (not React state) so
 * pushing them does not trigger re-renders.
 *
 * Disable via the RESEARCH_MODE flag in EyesightTestScreen for production
 * deployments where audit logging isn't needed.
 * --------------------------------------------------------------------------
 */

export class TimeseriesRecorder {
  constructor() {
    this.startMs = null;
    this.frames  = [];
    this.events  = [];
  }

  start() {
    this.startMs = Date.now();
    this.frames  = [];
    this.events  = [];
    this.events.push({ t: 0, type: 'session_start' });
  }

  isStarted() {
    return this.startMs !== null;
  }

  /** Push a per-frame sample. Cheap — call every camera update. */
  pushFrame(data) {
    if (this.startMs === null) return;
    this.frames.push({
      t: Date.now() - this.startMs,
      ...data,
    });
  }

  /** Push a discrete event (phase change, gate trigger, capture, pause, …) */
  pushEvent(type, payload = {}) {
    if (this.startMs === null) this.start();
    this.events.push({
      t: Date.now() - this.startMs,
      type,
      ...payload,
    });
  }

  reset() {
    this.startMs = null;
    this.frames  = [];
    this.events  = [];
  }

  /**
   * Snapshot the current state for inclusion in a data record.
   * Returns a plain object — safe to JSON.stringify.
   */
  export() {
    if (this.startMs === null) return null;
    return {
      startTime:    new Date(this.startMs).toISOString(),
      durationMs:   this.frames.length > 0
                    ? this.frames[this.frames.length - 1].t
                    : (this.events.length > 0 ? this.events[this.events.length - 1].t : 0),
      frameCount:   this.frames.length,
      eventCount:   this.events.length,
      frameRateHz:  this._estimateFrameRate(),
      frames:       this.frames,
      events:       this.events,
    };
  }

  /** Lightweight summary for UI display without the full payload. */
  summary() {
    return {
      started:    this.startMs !== null,
      frames:     this.frames.length,
      events:     this.events.length,
      durationMs: this.startMs ? Date.now() - this.startMs : 0,
    };
  }

  _estimateFrameRate() {
    if (this.frames.length < 2) return null;
    const span = this.frames[this.frames.length - 1].t - this.frames[0].t;
    if (span <= 0) return null;
    return Math.round((this.frames.length - 1) / (span / 1000) * 10) / 10;
  }
}

export default TimeseriesRecorder;