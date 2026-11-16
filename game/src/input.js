import { FIELD } from './config.js';

export function createInput(canvas, onGesture) {
  const keys = new Set();
  const aim = { x: FIELD.cx + 170, y: FIELD.cy - 70 };
  const actions = [];
  let held = false;
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * FIELD.width / r.width, y: (e.clientY - r.top) * FIELD.height / r.height };
  }
  window.addEventListener('keydown', e => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    onGesture(e);
    keys.add(e.code);
    if (!e.repeat) actions.push({ key: e.code });
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  canvas.addEventListener('pointermove', e => Object.assign(aim, point(e)));
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    onGesture(e);
    Object.assign(aim, point(e));
    held = true;
    actions.push({ key: 'click', ...aim });
    canvas.focus();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* Old browsers can decline capture. */ }
  });
  window.addEventListener('pointerup', () => { held = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  function clear() { keys.clear(); held = false; }
  window.addEventListener('blur', clear);
  return {
    aim,
    clear,
    actions() { return actions.splice(0); },
    read() {
      return {
        x: Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')),
        y: Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')),
        aimX: aim.x, aimY: aim.y, stoke: held || keys.has('Space'),
      };
    },
  };
}
