import { FIELD, STEP, MAX_FRAME, BEST_KEY } from './config.js';
import { createWorld, resetWorld, stepWorld, chooseRelic } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, hitTarget } from './render.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const parsedSeed = Number.parseInt(params.get('seed') ?? '1897', 10);
const world = createWorld(Number.isFinite(parsedSeed) ? parsedSeed : 1897);
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);
const shot = params.get('shot');
// Exposed for deterministic replay inspection; not needed by the game itself.
window.__lantern = { world, stepWorld, resetWorld, chooseRelic };

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.width * dpr;
  canvas.height = FIELD.height * dpr;
  renderer.draw(world);
}
window.addEventListener('resize', resize);
resize();

if (shot) {
  stageShot(shot, world);
  renderer.draw(world);
  status.textContent = `${world.screen}. Night ${world.night}. Score ${world.score}.`;
  window.__shotReady = true;
} else {
  try { world.best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { /* Storage is optional. */ }
  const input = createInput(canvas, e => audio.gesture(e));
  let accumulator = 0, last = performance.now(), previous = world.screen;
  function start() {
    resetWorld(world);
    input.clear();
    accumulator = 0;
    audio.play('relic');
  }
  function actions() {
    for (const a of input.actions()) {
      if (a.key === 'KeyM' || (a.key === 'click' && hitTarget(a.x, a.y, world.screen) === 'mute')) {
        world.muted = !world.muted;
        audio.mute(world.muted);
        continue;
      }
      if (['title', 'victory', 'defeat'].includes(world.screen)) {
        if (a.key === 'Enter' || (a.key === 'click' && hitTarget(a.x, a.y, world.screen) === 'begin')) start();
      } else if (world.screen === 'relic') {
        let index = ['Digit1', 'Digit2', 'Digit3'].indexOf(a.key);
        if (a.key === 'click') index = hitTarget(a.x, a.y, world.screen);
        if (Number.isInteger(index) && chooseRelic(world, index)) audio.play('relic');
      } else if (['KeyP', 'Escape'].includes(a.key) || (world.screen === 'paused' && a.key === 'Enter')) {
        world.screen = world.screen === 'paused' ? 'play' : 'paused';
        input.clear();
      }
    }
  }
  function frame(now) {
    actions();
    accumulator += Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    while (accumulator >= STEP) {
      if (world.screen === 'play') {
        stepWorld(world, input.read());
        for (const event of new Set(world.events)) audio.play(event);
        if (world.events.includes('hit')) status.textContent = `Hit. ${world.player.hearts} hearts remain.`;
      }
      accumulator -= STEP;
    }
    if (world.screen !== previous) {
      previous = world.screen;
      status.textContent = world.screen === 'relic'
        ? `Night ${world.night} clear. Choose a relic with 1, 2 or 3. ${world.choices.map(r => `${r.name}: ${r.detail}`).join('. ')}`
        : `${world.screen}. Night ${world.night}. Score ${world.score}. ${world.screen === 'play' ? 'Hold to burn, release to gather.' : 'Press Enter.'}`;
      if (['victory', 'defeat'].includes(world.screen)) {
        try { localStorage.setItem(BEST_KEY, String(world.best)); } catch { /* Keep session best. */ }
      }
    }
    renderer.draw(world, input.aim);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.screen === 'play') { world.screen = 'paused'; input.clear(); }
    accumulator = 0;
    last = performance.now();
  });
  requestAnimationFrame(frame);
}
