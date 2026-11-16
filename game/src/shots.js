import { FIELD } from './config.js';
import { createRng } from './rng.js';
import { resetWorld, stepWorld, chooseRelic } from './world.js';

// A real controller: approach fallen embers, retreat from nearby enemies, aim at the
// closest threat. It receives no powers or hidden state changes unavailable to a player.
export function autopilot(w) {
  const p = w.player;
  const nearest = w.enemies.reduce((best, e) => !best || distance(p, e) < distance(p, best) ? e : best, null);
  const ember = w.embers.reduce((best, e) => !best || distance(p, e) < distance(p, best) ? e : best, null);
  let tx = FIELD.cx + Math.cos(w.time * 0.25) * 140;
  let ty = FIELD.cy + Math.sin(w.time * 0.25) * 85;
  if (ember) { tx = ember.x; ty = ember.y; }
  let x = (tx - p.x) / 60, y = (ty - p.y) / 60;
  for (const e of w.enemies) {
    const d = distance(p, e);
    if (d < 100) { x += (p.x - e.x) / Math.max(1, d) * (100 - d) / 13; y += (p.y - e.y) / Math.max(1, d) * (100 - d) / 13; }
  }
  const d = nearest ? distance(p, nearest) : Infinity;
  const harvesting = ember && distance(p, ember) < 180;
  return {
    x, y, aimX: nearest?.x ?? tx, aimY: nearest?.y ?? ty,
    stoke: d < 240 && (!harvesting || d < 100) && (p.oil > 24 || d < 125),
  };
}
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

export function pilotRelic(w) {
  const priority = w.player.hearts < 3
    ? ['heart', 'lamp', 'mantle', 'boots', 'wick', 'vessel', 'flask', 'lens']
    : ['lamp', 'mantle', 'boots', 'wick', 'vessel', 'flask', 'lens', 'heart'];
  for (const id of priority) {
    const index = w.choices.findIndex(r => r.id === id);
    if (index !== -1) { chooseRelic(w, index); return; }
  }
}

export function stageShot(name, w) {
  resetWorld(w);
  // A frozen render always uses simulation time, never the machine's clock or storage.
  w.best = 0;
  if (name === 'start') { w.screen = 'title'; return w; }
  let candidate = null, quality = -Infinity, thirdNightTicks = 0;
  for (let i = 0; i < 72000; i++) {
    if (w.screen === 'relic') pilotRelic(w);
    if (w.screen !== 'play') break;
    const input = name === 'end' && w.night >= 3
      ? { aimX: FIELD.cx, aimY: FIELD.cy, stoke: false }
      : autopilot(w);
    if (w.night === 3) thirdNightTicks++;
    // Stoke toward the water briefly, spending oil while a crowd approaches.
    if (name === 'play' && w.night === 3 && thirdNightTicks < 360) {
      input.stoke = w.player.oil > 62;
      input.aimX = w.player.x + 220;
      input.aimY = w.player.y + 130;
    }
    stepWorld(w, input);
    if (name === 'play' && w.night >= 2 && w.screen === 'play') {
      const q = Math.min(7, w.enemies.length) * 9 + Math.min(5, w.embers.length) * 10
        + Number(w.player.stoking) * 18 + Number(w.player.oil > 20 && w.player.oil < 85) * 25
        + Number(w.night === 3) * 65;
      if (q > quality && w.score > 500 && w.player.oil < 85 && w.player.oil > 20 && (w.night !== 3 || thirdNightTicks >= 360)) {
        quality = q;
        candidate = JSON.parse(JSON.stringify({ ...w, rng: undefined, rngState: w.rng.state }));
      }
      if (q >= 190) break;
    }
    if (name === 'relic' && w.screen === 'relic') break;
  }
  if (name === 'play' && candidate) {
    const { rngState, ...state } = candidate;
    Object.assign(w, state);
    w.rng = createRng(rngState);
  }
  w.best = Math.max(w.best, w.score);
  return w;
}
