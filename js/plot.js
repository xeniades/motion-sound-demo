/** Six-second trace; scaling affects display only. */
export class TracePlot {
  constructor(canvas) { this.canvas = canvas; this.points = []; }
  clear() { this.points = []; }
  add(vector) {
    const time = performance.now() / 1000;
    this.points.push({ time, vector: [...vector] });
    while (this.points.length && time - this.points[0].time > 6) this.points.shift();
  }
  draw(range) {
    const canvas = this.canvas;
    const width = canvas.clientWidth, height = canvas.clientHeight;
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    }
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.strokeStyle = '#455871';
    context.beginPath(); context.moveTo(0, height / 2); context.lineTo(width, height / 2); context.stroke();
    const now = performance.now() / 1000;
    ['#ff8d96', '#73e6bd', '#84baff'].forEach((color, axis) => {
      context.strokeStyle = color; context.lineWidth = 2; context.beginPath();
      let first = true;
      for (const point of this.points) {
        const x = width * (1 - (now - point.time) / 6);
        if (x < 0) continue;
        const y = height / 2 - Math.max(-1, Math.min(1, point.vector[axis] / range)) * (height / 2 - 5);
        if (first) { context.moveTo(x, y); first = false; } else context.lineTo(x, y);
      }
      context.stroke();
    });
  }
}
