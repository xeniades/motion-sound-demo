/** UI orchestration. Sensor, estimator, plot and audio remain separate modules. */
import { SensorSource } from './sensors.js';
import { MotionEstimator } from './estimator.js';
import { Sonifier } from './audio.js';
import { TracePlot } from './plot.js';

const element = id => document.getElementById(id);
const source = new SensorSource();
const estimator = new MotionEstimator();
const audio = new Sonifier();
const plot = new TracePlot(element('plot'));
const quantities = {
  acceleration: { label: 'Beschleunigung', unit: 'm/s²', range: 8 },
  velocity: { label: 'Geschwindigkeit · Schätzung', unit: 'm/s', range: 1 },
  position: { label: 'Relative Position · Schätzung', unit: 'm', range: 0.5 },
  distance: { label: 'Strecke · Schätzung', unit: 'm', range: 1 }
};
let running = false, generation = 0, lastArrival = 0, started = 0;

function options() {
  return {
    range: Number(element('range').value),
    volume: Number(element('volume').value) / 100,
    gate: Number(element('gate').value),
    mapping: element('quantity').value === 'distance' ? 'magnitude' : element('mapping').value
  };
}

function stop(message = 'Gestoppt.') {
  generation++;
  running = false;
  source.stop();
  audio.mute();
  estimator.invalidate('Integration pausiert. Neu kalibrieren.');
  element('status').textContent = message;
  updateButtons();
}

function updateButtons() {
  element('start').disabled = element('demo').disabled = running;
  element('stop').disabled = element('calibrate').disabled = !running;
  element('reset').disabled = element('zero').disabled = !running || !estimator.ready;
}

function sample(vector, time) {
  if (!running) return;
  lastArrival = performance.now();
  estimator.update(vector, time);
  const quantity = element('quantity').value;
  const selected = estimator.vector(quantity);
  plot.add(selected);
  if (quantity === 'acceleration' || estimator.ready) audio.update(selected, options());
  else audio.mute();
  element('status').textContent = 'Daten aktiv. ' + (quantity === 'acceleration' ? '' : 'Integrierte Schätzung, keine direkte Messung.');
}

async function start(simulation) {
  stop();
  const token = generation;
  running = true;
  lastArrival = 0;
  started = performance.now();
  plot.clear();
  updateButtons();
  element('status').textContent = 'Startet …';
  const label = text => { if (generation === token) element('source').textContent = text; };
  const deliver = (v, t) => { if (generation === token) sample(v, t); };
  const fail = text => { if (generation === token) stop(text); };
  try {
    // Both calls occur before awaiting, preserving the browser's user gesture.
    const audioReady = audio.start();
    audioReady.catch(error => fail('Audio: ' + error.message));
    if (simulation) {
      estimator.bias = [0, 0, 0];
      estimator.ready = true;
      estimator.reset();
      estimator.message = 'Simulation: idealer Bias 0, Start aus Ruhe.';
      source.simulate(deliver, label);
    } else {
      estimator.bias = [0, 0, 0];
      source.start(deliver, label, fail);
    }
    await audioReady;
  } catch (error) { fail(error.message); }
}

element('start').onclick = () => start(false);
element('demo').onclick = () => start(true);
element('stop').onclick = () => stop();
element('calibrate').onclick = () => { estimator.startCalibration(); plot.clear(); audio.mute(); };
element('reset').onclick = () => { estimator.reset(); plot.clear(); };
element('zero').onclick = () => estimator.zeroVelocity();
element('quantity').onchange = () => {
  const quantity = element('quantity').value;
  element('range').value = quantities[quantity].range;
  element('rangeValue').textContent = element('range').value;
  element('unit').textContent = quantities[quantity].unit;
  element('valueTitle').textContent = quantities[quantity].label;
  element('mapping').disabled = quantity === 'distance';
  plot.clear(); audio.mute();
};
for (const id of ['range', 'volume', 'gate', 'smoothing']) {
  element(id).oninput = () => {
    element(id + 'Value').textContent = element(id).value;
    if (id === 'smoothing') {
      estimator.filterTime = Number(element(id).value) / 1000;
      estimator.invalidate('Glättung geändert. Neu kalibrieren.');
      plot.clear(); audio.mute();
    }
  };
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) stop('Seite ausgeblendet: gestoppt.');
});
window.addEventListener('pagehide', () => stop());

function render() {
  const selected = estimator.vector(element('quantity').value);
  ['x', 'y', 'z'].forEach((id, axis) => element(id).textContent = selected[axis].toFixed(3));
  element('magnitude').textContent = Math.hypot(...selected).toFixed(3);
  element('distanceValue').textContent = 'Strecke (geschätzt): ' + estimator.distance.toFixed(3) + ' m';
  element('estimateStatus').textContent = estimator.message + ' · Integrationszeit: ' + estimator.elapsed.toFixed(1) + ' s';
  if (running && performance.now() - (lastArrival || started) > 1500) {
    audio.mute();
    if (estimator.ready || estimator.calibration) {
      estimator.ready = false;
      estimator.calibration = null;
      estimator.message = 'Keine aktuellen Daten. Neu kalibrieren.';
    }
    element('status').textContent = 'Warte auf Sensordaten. Freigaben und Browser prüfen.';
  }
  updateButtons();
  plot.draw(Number(element('range').value));
  requestAnimationFrame(render);
}
render();
