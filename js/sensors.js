/** Sensor acquisition. Timestamps are monotonic seconds, never wall-clock time. */
export class SensorSource {
  stop() {
    this.token = (this.token || 0) + 1;
    if (this.sensor) this.sensor.stop();
    this.sensor = null;
    if (this.listener) window.removeEventListener('devicemotion', this.listener);
    this.listener = null;
    clearInterval(this.timer);
  }

  start(onSample, onSource, onError) {
    this.stop();
    const token = this.token;
    if (!window.isSecureContext) throw new Error('Bitte über HTTPS oder localhost öffnen.');

    // Call iOS permission synchronously from the user's button gesture.
    const permission = typeof window.DeviceMotionEvent?.requestPermission === 'function'
      ? window.DeviceMotionEvent.requestPermission().then(result => result, () => 'denied')
      : Promise.resolve('granted');
    let fallbackStarted = false;
    const deliver = (vector, time) => {
      if (token === this.token && vector.every(v => typeof v === 'number' && Number.isFinite(v))) onSample(vector, time);
    };
    const fallback = async () => {
      if (fallbackStarted || token !== this.token) return;
      fallbackStarted = true;
      if (this.sensor) this.sensor.stop();
      this.sensor = null;
      const result = await permission;
      if (token !== this.token) return;
      if (result !== 'granted') return onError('Bewegungszugriff nicht erlaubt.');
      if (!('DeviceMotionEvent' in window)) return onError('Keine passende Sensor-API.');
      onSource('DeviceMotionEvent.acceleration');
      this.listener = event => {
        const a = event.acceleration;
        if (a) deliver([a.x, a.y, a.z], performance.now() / 1000);
      };
      window.addEventListener('devicemotion', this.listener);
    };

    if (!('LinearAccelerationSensor' in window)) return fallback();
    try {
      const sensor = new LinearAccelerationSensor({ frequency: 60, referenceFrame: 'device' });
      this.sensor = sensor;
      onSource('LinearAccelerationSensor · angefordert: 60 Hz');
      sensor.addEventListener('reading', () => deliver([sensor.x, sensor.y, sensor.z], sensor.timestamp / 1000));
      sensor.addEventListener('error', fallback);
      sensor.start();
    } catch (error) { fallback(); }
  }

  simulate(onSample, onSource) {
    this.stop();
    onSource('SIMULATION · synthetische Daten');
    const start = performance.now() / 1000;
    this.timer = setInterval(() => {
      const now = performance.now() / 1000;
      const t = Math.max(0, now - start - 2);
      // x(t) = A * (1 - cos(omega*t)); v(0) = 0, fixed orientation.
      const amplitudes = [0.12, 0.07, 0.04];
      const omega = [2, 2.5, 3];
      const vector = amplitudes.map((a, i) => t === 0 ? 0 : a * omega[i] ** 2 * Math.cos(omega[i] * t));
      onSample(vector, now);
    }, 1000 / 60);
  }
}
