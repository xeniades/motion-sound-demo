/** Device-frame dead reckoning. Valid only for a fixed phone orientation. */
export class MotionEstimator {
  constructor() {
    this.bias = [0, 0, 0];
    this.filterTime = 0.03;
    this.invalidate('Erst in Ruhe kalibrieren.');
  }

  invalidate(reason) {
    this.ready = false;
    this.calibration = null;
    this.message = reason;
    this.lastTime = null;
    this.acceleration = [0, 0, 0];
    this.clearIntegrals();
  }

  clearIntegrals() {
    this.velocity = [0, 0, 0];
    this.position = [0, 0, 0];
    this.distance = 0;
    this.elapsed = 0;
  }

  startCalibration() {
    this.invalidate('2 Sekunden stillhalten: Mittelwert und Streuung werden erfasst.');
    this.calibration = { start: null, samples: [] };
  }

  reset() {
    this.clearIntegrals();
    this.lastTime = null;
    this.acceleration = [0, 0, 0];
    this.message = this.ready ? 'Nullgesetzt. Startgeschwindigkeit als 0 angenommen.' : 'Erst kalibrieren.';
  }

  zeroVelocity() {
    this.velocity = [0, 0, 0];
    this.message = 'Geschwindigkeit manuell auf 0 gesetzt. Position bleibt erhalten.';
  }

  update(raw, time) {
    if (this.calibration) {
      const c = this.calibration;
      if (c.start === null) c.start = time;
      c.samples.push({ raw: [...raw], time });
      if (time - c.start >= 2) this.finishCalibration();
    }

    const corrected = raw.map((value, axis) => value - this.bias[axis]);
    if (this.lastTime === null) {
      this.lastTime = time;
      this.acceleration = corrected;
      return;
    }

    const dt = time - this.lastTime;
    if (dt <= 0) return;
    this.lastTime = time;
    if (dt > 0.25) {
      this.ready = false;
      this.calibration = null;
      this.acceleration = corrected;
      this.message = 'Datenlücke: Integration pausiert. Neu kalibrieren.';
      return;
    }

    const previousAcceleration = this.acceleration;
    const alpha = this.filterTime > 0 ? 1 - Math.exp(-dt / this.filterTime) : 1;
    this.acceleration = corrected.map((value, axis) =>
      previousAcceleration[axis] + alpha * (value - previousAcceleration[axis]));

    if (!this.ready) return;
    if (this.elapsed + dt > 30) {
      this.ready = false;
      this.message = '30-s-Demofenster beendet. Neu kalibrieren.';
      return;
    }

    const oldVelocity = [...this.velocity];
    this.velocity = oldVelocity.map((v, axis) =>
      v + 0.5 * (previousAcceleration[axis] + this.acceleration[axis]) * dt);
    this.position = this.position.map((p, axis) =>
      p + 0.5 * (oldVelocity[axis] + this.velocity[axis]) * dt);
    this.distance += 0.5 * (Math.hypot(...oldVelocity) + Math.hypot(...this.velocity)) * dt;
    this.elapsed += dt;
  }

  finishCalibration() {
    const samples = this.calibration.samples;
    const n = samples.length;
    const mean = [0, 1, 2].map(axis => samples.reduce((sum, s) => sum + s.raw[axis], 0) / n);
    const sd = mean.map((m, axis) => Math.sqrt(samples.reduce((sum, s) => sum + (s.raw[axis] - m) ** 2, 0) / n));
    const maxGap = samples.slice(1).reduce((m, s, i) => Math.max(m, s.time - samples[i].time), 0);
    this.calibration = null;
    if (n < 20 || maxGap > 0.25 || Math.max(...sd) > 0.2) {
      this.message = 'Kalibrierung verworfen: zu wenig Daten, Datenlücke oder zu viel Bewegung.';
      return;
    }
    this.bias = mean;
    this.ready = true;
    this.reset();
    this.message = 'Kalibriert. Integration aktiv; Orientierung beibehalten.';
  }

  vector(quantity) {
    return quantity === 'distance' ? [this.distance, 0, 0] : [...this[quantity]];
  }
}
