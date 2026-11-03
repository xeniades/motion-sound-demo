/** Three oscillator voices. All mappings are independent of integration. */
const clamp = value => Math.max(0, Math.min(1, value));

export class Sonifier {
  async start() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.ratio.value = 12;
      this.master.connect(compressor).connect(this.context.destination);
      this.voices = [0, 1, 2].map(axis => {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain);
        if (this.context.createStereoPanner) {
          const pan = this.context.createStereoPanner();
          pan.pan.value = [-0.8, 0, 0.8][axis];
          gain.connect(pan).connect(this.master);
        } else gain.connect(this.master);
        oscillator.start();
        return { oscillator, gain };
      });
    }
    await this.context.resume();
  }

  update(vector, { range, volume, gate, mapping }) {
    if (!this.context) return;
    const now = this.context.currentTime;
    const normalized = value => clamp((Math.abs(value) / range - gate) / (1 - gate));
    this.master.gain.setTargetAtTime(volume, now, 0.03);
    this.voices.forEach((voice, axis) => {
      let frequency = 440;
      let amplitude = 0;
      if (mapping === 'xyz') {
        const n = normalized(vector[axis]);
        frequency = [220, 330, 440][axis] * 2 ** (Math.sign(vector[axis]) * n);
        amplitude = n * 0.25;
      } else if (axis === 0) {
        const value = mapping === 'magnitude' ? Math.hypot(...vector) : vector[{ x: 0, y: 1, z: 2 }[mapping]];
        const n = normalized(value);
        frequency = mapping === 'magnitude' ? 110 * 2 ** (4 * n) : 440 * 2 ** (2 * Math.sign(value) * n);
        amplitude = n * 0.65;
      }
      voice.oscillator.frequency.setTargetAtTime(frequency, now, 0.025);
      voice.gain.gain.setTargetAtTime(amplitude, now, 0.025);
    });
  }

  mute() {
    if (this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
  }
}
