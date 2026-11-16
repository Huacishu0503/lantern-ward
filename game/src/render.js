import { FIELD, COLORS as C, PLAYER, WAVES, KINDS, RELICS } from './config.js';
import { noise } from './rng.js';
import { starsFor } from './world.js';

const TAU = Math.PI * 2;
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Trebuchet MS", Arial, sans-serif';
const UI = {
  begin: { x: 80, y: 494, w: 365, h: 64 },
  again: { x: 453, y: 583, w: 374, h: 60 },
  mute: { x: 1112, y: 656, w: 135, h: 40 },
  cards: [230, 518, 806].map(x => ({ x, y: 270, w: 244, h: 287 })),
};
export function hitTarget(x, y, screen) {
  const has = r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  if (has(UI.mute)) return 'mute';
  if (screen === 'title' && has(UI.begin)) return 'begin';
  if (['victory', 'defeat'].includes(screen) && has(UI.again)) return 'begin';
  return screen === 'relic' ? UI.cards.findIndex(has) : null;
}

function text(c, value, x, y, size = 20, color = C.cream, font = SANS, align = 'left') {
  c.font = `${size}px ${font}`;
  c.textAlign = align;
  c.fillStyle = color;
  c.fillText(value, x, y);
}
function tracked(c, value, x, y, size, color, spacing = 3, align = 'left') {
  c.font = `${size}px ${SANS}`;
  const widths = [...value].map(ch => c.measureText(ch).width + spacing);
  const width = widths.reduce((a, b) => a + b, 0) - spacing;
  let cursor = x - (align === 'center' ? width / 2 : align === 'right' ? width : 0);
  [...value].forEach((ch, i) => { text(c, ch, cursor, y, size, color); cursor += widths[i]; });
}
function line(c, x1, y1, x2, y2, color, width = 1) {
  c.strokeStyle = color; c.lineWidth = width;
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}
function ellipse(c, x, y, rx, ry, color, stroke) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (color) { c.fillStyle = color; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
}
function path(c, points, fill, stroke, width = 1) {
  c.beginPath();
  points.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function panel(c, x, y, w, h, fill = '#0a1d20', border = '#46605a') {
  c.fillStyle = fill; c.fillRect(x, y, w, h);
  c.strokeStyle = border; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  const k = 9;
  for (const [px, py, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    line(c, px, py, px + k * sx, py, C.gold);
    line(c, px, py, px, py + k * sy, C.gold);
  }
}
function glow(c, x, y, radius, center, edge = '#f4bd6500') {
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, center); g.addColorStop(1, edge);
  c.fillStyle = g; c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
function diamond(c, x, y, r, color, fill = false) {
  path(c, [[x, y - r], [x + r, y], [x, y + r], [x - r, y]], fill ? color : null, color);
}
function heart(c, x, y, size, full) {
  c.save(); c.translate(x, y); c.scale(size / 24, size / 24);
  c.beginPath(); c.moveTo(0, 10);
  c.bezierCurveTo(-24, -5, -10, -22, 0, -10);
  c.bezierCurveTo(10, -22, 24, -5, 0, 10);
  c.fillStyle = full ? C.red : '#263a3e'; c.fill();
  c.strokeStyle = full ? '#ffc2a1' : '#507071'; c.lineWidth = 1; c.stroke(); c.restore();
}
function star(c, x, y, r, full) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5 - Math.PI / 2, s = i % 2 ? r * 0.44 : r;
    points.push([x + Math.cos(a) * s, y + Math.sin(a) * s]);
  }
  if (full) glow(c, x, y, r * 2, '#f4bd6520');
  path(c, points, full ? C.amber : '#23383a', full ? '#ffe2a6' : '#61706b', 1.5);
}

function drawHarbour(c) {
  const sky = c.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, '#061316'); sky.addColorStop(0.4, '#15393c'); sky.addColorStop(1, '#06191f');
  c.fillStyle = sky; c.fillRect(0, 0, 1280, 720);
  glow(c, 995, 92, 200, '#71867b12', '#71867b00');
  ellipse(c, 1002, 80, 27, 27, '#9caaa337');
  ellipse(c, 1013, 70, 28, 27, '#10272b');
  for (let i = 0; i < 90; i++) {
    const x = noise(i + 4) * 1280, y = noise(i + 451) * 180;
    ellipse(c, x, y, 0.6 + noise(i) * 0.8, 0.6, '#d6ddbd50');
  }
  // Far warehouses and masts, deliberately layered in muted silhouettes.
  for (let layer = 0; layer < 2; layer++) {
    const base = 210 + layer * 22;
    for (let i = 0; i < 28; i++) {
      const x = i * 55 - 25, height = 35 + noise(i + layer * 80) * 65;
      const color = layer ? '#0b2529' : '#173538';
      path(c, [[x, base], [x, base - height], [x + 23, base - height - 15], [x + 48, base - height], [x + 48, base]], color);
      if (i % 3 === 0) {
        c.fillStyle = '#c1a06a40'; c.fillRect(x + 12, base - height + 17, 4, 7);
        c.fillRect(x + 29, base - height + 17, 4, 7);
      }
    }
  }
  // Bell tower above the eastern breakwater.
  path(c, [[1119, 222], [1129, 107], [1160, 107], [1172, 222]], '#0b2025', '#3a5350');
  path(c, [[1120, 107], [1144, 69], [1169, 107]], '#07191f', '#435752');
  c.fillStyle = '#0a1b21'; c.fillRect(1124, 116, 41, 11);
  c.fillStyle = '#c2a265'; c.fillRect(1136, 96, 16, 18);
  glow(c, 1144, 104, 50, '#ebbd5c35');
  line(c, 1144, 69, 1144, 52, '#53716b', 2);
  // A ship beneath the distant town.
  path(c, [[30, 253], [120, 258], [105, 272], [48, 272]], '#06171b');
  line(c, 78, 179, 78, 257, '#102327', 3);
  line(c, 78, 185, 40, 246, '#274346');
  path(c, [[83, 190], [83, 246], [117, 246]], '#284447');
  const sea = c.createLinearGradient(0, 238, 0, 720);
  sea.addColorStop(0, '#173a3c'); sea.addColorStop(1, '#05171d');
  c.fillStyle = sea; c.fillRect(0, 275, 1280, 445);
  for (let i = 0; i < 210; i++) {
    const x = noise(i + 104) * 1280, y = 260 + noise(i + 808) * 460;
    line(c, x, y, x + 8 + noise(i + 30) * 58, y, i % 4 ? '#5c999012' : '#68aaa026');
  }
  // Submerged jetties frame the stone island.
  path(c, [[0, 506], [191, 487], [239, 519], [0, 561]], '#0c2529', '#2a4848');
  path(c, [[1280, 453], [1107, 456], [1069, 483], [1280, 492]], '#0b2429', '#2a4848');
  for (let i = 0; i < 8; i++) {
    const x = 23 + i * 24;
    line(c, x, 507 - i * 2, x - 8, 549 - i * 4, '#334949');
  }
  // Water beneath the quay catches the lanterns.
  for (const x of [161, 1119]) {
    glow(c, x, 562, 94, '#e4b15812');
    for (let i = 0; i < 12; i++) {
      const y = 561 + i * 10, len = 7 + noise(i + x) * 40;
      line(c, x - len / 2, y, x + len / 2, y, `rgba(219,167,87,${0.15 - i * 0.01})`, 2);
    }
  }
}

function drawArena(c) {
  const { cx, cy, rx, ry } = FIELD;
  ellipse(c, cx, cy + 28, rx + 18, ry + 9, '#020c12aa');
  ellipse(c, cx, cy + 18, rx + 10, ry + 8, '#102329', '#375052');
  // Individual blocks on the vertical rim give the island weight.
  for (let i = 0; i < 45; i++) {
    const a = i / 44 * Math.PI;
    const x = cx + Math.cos(a) * (rx + 5), y = cy + Math.sin(a) * (ry + 5);
    line(c, x, y, x, y + 19, '#4c615645', 2);
  }
  const stone = c.createRadialGradient(cx, cy - 70, 40, cx, cy, rx);
  stone.addColorStop(0, '#34504c'); stone.addColorStop(0.6, '#263e3e'); stone.addColorStop(1, '#1c3034');
  ellipse(c, cx, cy, rx, ry, stone, '#74918065');
  c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
  // Circular courses of hand-cut stone, with staggered joints.
  for (let ring = 0; ring < 7; ring++) {
    const radius = rx - ring * 61, count = Math.max(8, Math.round(radius / 15));
    if (radius < 30) continue;
    for (let i = 0; i < count; i++) {
      const a = (i + (ring % 2) / 2) / count * TAU;
      const b = a + TAU / count;
      c.beginPath(); c.arc(0, 0, radius - 2, a + 0.002, b - 0.002);
      c.arc(0, 0, Math.max(4, radius - 58), b - 0.002, a + 0.002, true); c.closePath();
      const n = Math.round(noise(i + ring * 100) * 12);
      c.fillStyle = `rgba(139,164,139,${0.018 + n * 0.003})`; c.fill();
      c.strokeStyle = '#0a202575'; c.lineWidth = 2; c.stroke();
    }
  }
  for (const r of [rx - 12, rx - 27, 315, 307, 135, 125, 44]) {
    ellipse(c, 0, 0, r, r, null, '#8c9c7950');
  }
  // An old compass ward cut into the centre stone.
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    const l = i % 2 ? 91 : 118;
    path(c, [[0, 0], [Math.cos(a - 0.08) * 34, Math.sin(a - 0.08) * 34], [Math.cos(a) * l, Math.sin(a) * l], [Math.cos(a + 0.08) * 34, Math.sin(a + 0.08) * 34]], '#73887517', '#8a9b6c35');
  }
  c.restore();
  // Cracks and tiny salt deposits stay outside the visual hierarchy.
  for (let i = 0; i < 140; i++) {
    const a = noise(i + 67) * TAU, r = Math.sqrt(noise(i + 923)) * 0.96;
    const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
    line(c, x, y, x + noise(i) * 9, y + 2, '#b6bba51a');
  }
  // Brass boundary studs.
  for (let i = 0; i < 24; i++) {
    const a = i * TAU / 24;
    ellipse(c, cx + Math.cos(a) * (rx - 18), cy + Math.sin(a) * (ry - 8), 2, 1.3, '#a4975e');
  }
  for (const [x, y] of [[160, 405], [1120, 405], [376, 197], [904, 197]]) drawBollard(c, x, y);
  // Foreground mooring ropes, framing the view rather than crossing the field.
  c.strokeStyle = '#58706a'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(42, 635); c.quadraticCurveTo(94, 666, 141, 621); c.stroke();
  for (const x of [40, 142, 1140, 1240]) {
    c.fillStyle = '#142d30'; c.fillRect(x - 5, 611, 10, 64);
    ellipse(c, x, 610, 12, 6, '#36514e', '#56726b');
  }
}
function drawBollard(c, x, y) {
  ellipse(c, x, y + 16, 18, 8, '#07171ca0');
  path(c, [[x - 8, y + 12], [x - 6, y - 21], [x + 6, y - 21], [x + 8, y + 12]], '#1b3436', '#6a7a63');
  ellipse(c, x, y - 21, 11, 5, '#8c8056');
  glow(c, x, y - 34, 76, '#f4bd6527');
  lantern(c, x, y - 34, 0.75);
}
function lantern(c, x, y, size = 1) {
  c.save(); c.translate(x, y); c.scale(size, size);
  c.strokeStyle = C.gold; c.lineWidth = 2;
  c.beginPath(); c.arc(0, -14, 5, Math.PI, 0); c.stroke();
  path(c, [[-8, -12], [8, -12], [10, 11], [-10, 11]], '#ffe29a', '#9b713c', 2);
  path(c, [[-11, -12], [0, -18], [11, -12]], '#a77f42');
  line(c, -11, 12, 11, 12, '#a77f42', 3);
  line(c, 0, -11, 0, 10, '#a06c37', 1.4);
  ellipse(c, 4, -1, 2, 7, '#fff7cb'); c.restore();
}

function drawFog(c, time, foreground = false) {
  c.save();
  const bands = foreground ? 3 : 5;
  for (let i = 0; i < bands; i++) {
    const y = (foreground ? 556 : 226) + i * (foreground ? 52 : 29);
    const x = ((time * (4 + i) + i * 283) % 1900) - 350;
    c.save(); c.translate(x, y); c.scale(1, 0.09);
    glow(c, 0, 0, 440, foreground ? '#6b999411' : '#8daea21b', '#8daea200');
    c.restore();
  }
  c.restore();
}
function vignette(c) {
  const g = c.createRadialGradient(640, 355, 230, 640, 355, 740);
  g.addColorStop(0, '#020a1000'); g.addColorStop(0.65, '#020a1020'); g.addColorStop(1, '#020a10d0');
  c.fillStyle = g; c.fillRect(0, 0, 1280, 720);
}

function drawBeam(c, p, upgrades, time) {
  const strong = p.stoking, range = PLAYER.range * (strong ? 1 : 0.52);
  glow(c, p.x, p.y - 7, strong ? 145 : 104, strong ? '#ffcd7450' : '#ffcd742c');
  c.save(); c.translate(p.x, p.y); c.rotate(p.angle);
  const half = strong ? PLAYER.cone * upgrades.cone / 2 : 0.62;
  c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, range, -half, half); c.closePath();
  const g = c.createRadialGradient(0, 0, 9, 0, 0, range);
  g.addColorStop(0, strong ? '#ffdf9a9c' : '#f4bd6533');
  g.addColorStop(0.65, strong ? '#f8c46650' : '#f4bd6512'); g.addColorStop(1, '#e5b55f00');
  c.fillStyle = g; c.fill();
  if (strong) {
    for (const a of [-half, half]) line(c, 9, 0, Math.cos(a) * range, Math.sin(a) * range, '#ffd68a50');
    for (let i = 0; i < 18; i++) {
      const r = ((time * 110 + noise(i) * range) % range);
      const a = (noise(i + 92) - 0.5) * half * 1.6;
      ellipse(c, Math.cos(a) * r, Math.sin(a) * r, 1 + noise(i + 65), 1, '#ffe5a68a');
    }
  }
  c.restore();
}
function drawPlayer(c, p, time, scale = 1) {
  c.save(); c.translate(p.x, p.y); c.scale(scale, scale);
  const flicker = p.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  if (flicker) c.globalAlpha = 0.45;
  ellipse(c, 1, 8, 22, 9, '#010e1690');
  // Long weatherproof coat, brass hem and a pale lamplighter's hood.
  path(c, [[-11, -22], [8, -23], [16, 7], [0, 15], [-17, 7]], '#bdae7c', '#e1c98d', 1.3);
  path(c, [[-6, -19], [7, -19], [12, 7], [-5, 11]], '#385458');
  line(c, -8, 10, -8, 18, '#0b2028', 5); line(c, 7, 10, 8, 18, '#0b2028', 5);
  path(c, [[-13, -24], [-8, -39], [5, -42], [15, -28], [7, -19], [-6, -18]], '#d3bf85', '#ffe0a1');
  path(c, [[-5, -34], [5, -35], [9, -25], [-4, -24]], '#263b3c');
  line(c, -3, -29, 5, -29, '#f5cb7c', 1.5);
  const lx = Math.cos(p.angle) * 22, ly = Math.sin(p.angle) * 10 - 10;
  line(c, p.angle > Math.PI / 2 || p.angle < -Math.PI / 2 ? -10 : 10, -16, lx, ly, '#c5ad75', 5);
  glow(c, lx, ly, 33, '#ffd47760');
  lantern(c, lx, ly, 0.55);
  c.restore();
}
function drawShadow(c, e, time, scale = 1) {
  const r = KINDS[e.kind].radius;
  const bob = Math.sin(time * 4 + e.phase) * 3;
  c.save(); c.translate(e.x, e.y + bob); c.scale(scale, scale);
  glow(c, 0, -8, r * 2.4, e.burning ? '#ffa96a45' : '#9a72df22', '#9066d000');
  ellipse(c, 0, 9 - bob, r * 1.2, r * 0.36, '#030912a0');
  const points = [[-r, 5]];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + i * Math.PI / 8;
    points.push([Math.cos(a) * r, Math.sin(a) * r * 1.3 - 8]);
  }
  points.push([r * 0.82, 8], [r * 0.48, 2], [r * 0.2, 14], [-r * 0.16, 5], [-r * 0.6, 12]);
  path(c, points, e.burning ? '#5b364c' : '#211d38', e.burning ? '#ffcd81' : '#a391c2', 1.5);
  path(c, [[-r * 0.68, -8], [-r * 1.35, 8], [-r * 0.3, 1]], '#302540');
  path(c, [[r * 0.68, -8], [r * 1.35, 8], [r * 0.3, 1]], '#302540');
  const eyes = e.burning ? '#ffe2aa' : '#e1c4ff';
  ellipse(c, -r * 0.3, -10, 2.2, 3, eyes); ellipse(c, r * 0.3, -10, 2.2, 3, eyes);
  if (e.kind === 'splitter') {
    line(c, 0, -31, -4, -17, '#b393d2', 2); line(c, -4, -17, 3, -5, '#b393d2', 2);
    path(c, [[-17, -22], [-23, -38], [-8, -29]], '#554367', '#b393d2');
    path(c, [[17, -22], [23, -38], [8, -29]], '#554367', '#b393d2');
  }
  if (e.kind === 'lurker') {
    path(c, [[-12, -20], [-26, -25], [-15, -9]], '#4f4266', '#8e80aa');
    line(c, -22, 12, -37, 15, '#907baa70', 2);
  }
  c.restore();
}
function drawEmber(c, e, time) {
  const pulse = 0.7 + Math.sin(time * 4 + e.phase) * 0.2;
  glow(c, e.x, e.y, 27, `rgba(244,189,101,${pulse * 0.3})`);
  ellipse(c, e.x, e.y + 5, 9, 3, '#e5ac4c28');
  diamond(c, e.x, e.y - 2 + Math.sin(time * 3 + e.phase) * 2, 5, '#ffe2a0', true);
  ellipse(c, e.x - 2, e.y - 10, 1.1, 1.1, '#f4c975');
}
function drawEffects(c, w) {
  for (const f of w.particles) {
    c.globalAlpha = f.life / f.max;
    c.fillStyle = f.color === 'gold' ? C.amber : C[f.color] || C.cream;
    c.fillRect(f.x - f.size / 2, f.y - f.size / 2, f.size, f.size);
  }
  c.globalAlpha = 1;
  for (const t of w.texts) {
    c.globalAlpha = Math.min(1, t.life * 3);
    c.shadowColor = '#041216'; c.shadowBlur = 4;
    text(c, t.text, t.x, t.y, 20, t.color === 'gold' ? C.amber : C[t.color], SANS, 'center');
  }
  c.globalAlpha = 1; c.shadowBlur = 0;
}
function drawPlayfield(c, w) {
  drawFog(c, w.time);
  if (w.lamp) {
    glow(c, w.lamp.x, w.lamp.y, w.lamp.radius, '#ffce673b');
    ellipse(c, w.lamp.x, w.lamp.y, 29, 14, null, '#c9a96a75');
    lantern(c, w.lamp.x, w.lamp.y - 15, 1.1);
  }
  drawBeam(c, w.player, w.upgrades, w.time);
  for (const e of w.embers) drawEmber(c, e, w.time);
  const entities = [...w.enemies.map(e => ({ y: e.y, e })), { y: w.player.y, player: true }].sort((a, b) => a.y - b.y);
  for (const item of entities) item.player ? drawPlayer(c, w.player, w.time) : drawShadow(c, item.e, w.time);
  drawEffects(c, w);
  drawFog(c, w.time, true);
  vignette(c);
  if (w.flash > 0) {
    c.fillStyle = `rgba(234,95,95,${w.flash * 0.5})`; c.fillRect(0, 0, 1280, 720);
  }
}

function drawHUD(c, w) {
  panel(c, 30, 24, 1220, 99, '#07191dee', '#435e58');
  tracked(c, 'NIGHT', 54, 50, 20, C.muted, 2);
  text(c, `${String(w.night).padStart(2, '0')} / 05`, 54, 88, 32, C.cream, SERIF);
  const progress = w.waveKills / w.waveTotal;
  c.fillStyle = '#2b4142'; c.fillRect(211, 76, 137, 5);
  c.fillStyle = C.gold; c.fillRect(211, 76, 137 * progress, 5);
  text(c, `${w.waveKills} / ${w.waveTotal} burned`, 211, 62, 20, C.muted);
  line(c, 377, 43, 377, 102, '#45605a');
  tracked(c, 'WARDEN', 404, 50, 20, C.muted, 2);
  for (let i = 0; i < 3; i++) heart(c, 419 + i * 37, 82, 23, i < w.player.hearts);
  line(c, 542, 43, 542, 102, '#45605a');
  tracked(c, 'LANTERN OIL', 570, 50, 20, C.muted, 2);
  text(c, `${Math.ceil(w.player.oil)}%`, 879, 50, 21, C.amber, SANS, 'right');
  c.fillStyle = '#172d32'; c.fillRect(570, 68, 309, 21);
  const g = c.createLinearGradient(570, 0, 879, 0); g.addColorStop(0, '#9d6438'); g.addColorStop(1, '#ffda85');
  c.fillStyle = w.player.oil < 20 ? C.red : g; c.fillRect(572, 70, 305 * w.player.oil / 100, 17);
  for (let i = 1; i < 10; i++) line(c, 570 + i * 30.9, 69, 570 + i * 30.9, 87, '#15242865');
  line(c, 914, 43, 914, 102, '#45605a');
  tracked(c, 'SCORE', 1224, 50, 20, C.muted, 2, 'right');
  text(c, w.score.toLocaleString('en-US').padStart(6, '0'), 1224, 91, 35, C.amber, SERIF, 'right');
  const mode = w.player.exhausted ? 'FLAME RESTING' : w.player.stoking ? 'STOKING · BURN' : 'SOFT GLOW · GATHER';
  const modeColor = w.player.stoking ? C.amber : '#b4d1bd';
  panel(c, 470, 135, 340, 36, '#0a1d20d9', '#40574c');
  diamond(c, 489, 153, 4, modeColor, true);
  tracked(c, mode, 642, 160, 18, modeColor, 1.4, 'center');
  panel(c, 30, 637, 1220, 64, '#07191df0', '#3d5552');
  let x = 48;
  if (!w.relics.length) {
    text(c, 'RELICS', x, 675, 18, '#718d87');
    text(c, 'Earn your first at dawn.', x + 88, 675, 20, C.muted);
  } else {
    for (const id of w.relics) {
      const r = RELICS.find(r => r.id === id);
      c.font = `18px ${SANS}`;
      const width = c.measureText(r.name).width + 31;
      panel(c, x, 653, width, 32, '#183033', '#617165');
      text(c, r.name, x + 15, 675, 18, '#d2c7a1');
      x += width + 9;
    }
  }
  if (w.relics.length < 3) text(c, 'Release to gather. Hold to burn.', 1082, 676, 20, C.muted, SANS, 'right');
  drawMute(c, w);
  if (w.banner > 0) {
    c.globalAlpha = Math.min(1, w.banner, (3.2 - w.banner) * 3);
    text(c, WAVES[w.night - 1].label, 640, 216, 28, '#e3dcc0', SERIF, 'center');
    c.globalAlpha = 1;
  }
}
function drawMute(c, w) {
  text(c, w.muted ? 'M  SOUND OFF' : 'M  SOUND ON', 1230, 680, 18, C.muted, SANS, 'right');
}
function button(c, r, label, small, hover = false) {
  panel(c, r.x, r.y, r.w, r.h, hover ? '#3b3a28' : '#242f28', C.gold);
  diamond(c, r.x + 24, r.y + r.h / 2, 4, C.amber, true);
  text(c, label, r.x + r.w / 2 + 8, r.y + r.h / 2 + 8, 24, C.amber, SANS, 'center');
  if (small) text(c, small, r.x + r.w / 2, r.y + r.h + 27, 18, C.muted, SANS, 'center');
}
function isHover(r, aim) { return aim && aim.x >= r.x && aim.x <= r.x + r.w && aim.y >= r.y && aim.y <= r.y + r.h; }
function ornament(c, x, y, width = 110) {
  line(c, x - width, y, x - 13, y, C.gold); line(c, x + 13, y, x + width, y, C.gold);
  diamond(c, x, y, 6, C.amber);
}

function drawTitleScreen(c, w, aim) {
  drawFog(c, 11);
  // The cover illustration uses the same vector actors and lantern as the game.
  const hero = { x: 881, y: 452, angle: -0.23, stoking: true, invulnerable: 0 };
  drawBeam(c, hero, { cone: 1.3 }, 7);
  for (const [x, y, kind, phase] of [[1107, 405, 'splitter', 2], [1177, 490, 'wisp', 3], [1057, 322, 'lurker', 1]]) {
    drawShadow(c, { x, y, kind, phase, burning: false }, 3, 1.35);
  }
  drawPlayer(c, hero, 1, 2.3);
  for (let i = 0; i < 15; i++) drawEmber(c, { x: 750 + noise(i + 7) * 330, y: 470 + noise(i + 77) * 85, phase: i }, 2);
  drawFog(c, 11, true);
  const shade = c.createLinearGradient(0, 0, 980, 0);
  shade.addColorStop(0, '#061518fc'); shade.addColorStop(0.55, '#061518ef'); shade.addColorStop(1, '#06151800');
  c.fillStyle = shade; c.fillRect(0, 0, 1280, 720);
  vignette(c);
  line(c, 80, 73, 1200, 73, '#78877555');
  diamond(c, 88, 43, 7, C.gold);
  tracked(c, 'THE LAST HARBOUR WATCH', 111, 49, 17, C.muted, 2.5);
  tracked(c, 'A NIGHT-WATCH ARCADE', 1200, 49, 16, C.muted, 2, 'right');
  tracked(c, 'KEEP THE DARK AT BAY', 84, 145, 19, C.amber, 3.5);
  text(c, 'LANTERN', 77, 247, 93, C.cream, SERIF);
  text(c, 'WARD', 76, 357, 119, C.cream, SERIF);
  line(c, 85, 386, 148, 386, C.gold, 2);
  diamond(c, 165, 386, 4, C.gold);
  text(c, 'Five nights. One flame.', 84, 429, 28, C.cream, SERIF);
  text(c, 'Burn the shadows. Dim the light. Gather the embers.', 84, 465, 20, C.muted);
  button(c, UI.begin, 'Press Enter to begin', null, isHover(UI.begin, aim));
  // A small field-guide caption anchors the cover illustration.
  line(c, 881, 510, 881, 562, '#c29f6660');
  tracked(c, 'THE LAMPLIGHTER', 881, 586, 17, C.amber, 2.2, 'center');
  text(c, 'The harbour’s last warm thing.', 881, 613, 19, C.muted, SERIF, 'center');
  line(c, 80, 626, 1200, 626, '#78877555');
  const controls = [['WASD / ↑↓←→', 'MOVE'], ['MOUSE', 'AIM'], ['HOLD CLICK / SPACE', 'STOKE'], ['RELEASE', 'HARVEST']];
  controls.forEach(([key, label], i) => {
    const x = 82 + i * 272;
    if (i === 0) tracked(c, key, x, 658, 19, C.cream, 1);
    else text(c, key, x, 658, 19, C.cream);
    tracked(c, label, x, 686, 17, C.muted, 2);
  });
  drawMute(c, w);
  c.strokeStyle = '#71816c50'; c.strokeRect(22.5, 17.5, 1235, 685);
}

function relicIcon(c, kind, x, y) {
  c.save(); c.translate(x, y);
  glow(c, 0, 0, 59, '#f4bd651b');
  diamond(c, 0, 0, 48, '#8f8055');
  diamond(c, 0, 0, 42, '#4b5c4f');
  c.strokeStyle = C.amber; c.lineWidth = 2.5;
  if (kind === 'heart') heart(c, 0, 3, 35, true);
  else if (kind === 'lamp') lantern(c, 0, 1, 1.4);
  else if (kind === 'lens') {
    path(c, [[0, -24], [23, 17], [-23, 17]], '#e8ca7615', C.amber, 2);
    line(c, -32, 0, 0, 0, C.cream, 2); line(c, 0, 0, 32, -11, C.amber, 2); line(c, 0, 0, 32, 11, C.gold, 2);
  } else if (kind === 'boots') {
    path(c, [[-14, -23], [4, -23], [4, 5], [22, 12], [22, 22], [-14, 22]], '#b4965c44', C.amber, 2);
    line(c, -10, -10, 2, -10, C.amber, 2);
  } else if (kind === 'sun') {
    ellipse(c, 0, 0, 14, 14, null, C.amber);
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8;
      line(c, Math.cos(a) * 21, Math.sin(a) * 21, Math.cos(a) * 29, Math.sin(a) * 29, C.amber, 2);
    }
  } else if (kind === 'wick') {
    path(c, [[-11, 24], [-11, -4], [11, -4], [11, 24]], '#e8ca7622', C.amber, 2);
    path(c, [[0, -7], [-8, -17], [0, -32], [7, -18]], '#f4bd6580', C.amber, 2);
  } else {
    path(c, [[-8, -25], [8, -25], [8, -12], [20, 1], [16, 23], [-16, 23], [-20, 1], [-8, -12]], '#e8ca7622', C.amber, 2);
    line(c, -16, 10, 16, 10, C.amber, 2);
    if (kind === 'vessel') diamond(c, 0, 1, 6, C.amber, true);
  }
  c.restore();
}
function drawRelicScreen(c, w, aim) {
  c.fillStyle = '#041214da'; c.fillRect(0, 0, 1280, 720);
  tracked(c, `NIGHT ${String(w.night).padStart(2, '0')} COMPLETE`, 640, 111, 20, C.amber, 4, 'center');
  text(c, 'The harbour holds.', 640, 176, 59, C.cream, SERIF, 'center');
  text(c, 'Take one relic into the next night.', 640, 216, 24, C.muted, SANS, 'center');
  for (let i = 0; i < 3; i++) {
    const r = UI.cards[i], relic = w.choices[i], hover = isHover(r, aim);
    panel(c, r.x, r.y, r.w, r.h, hover ? '#253b35' : '#10272a', hover ? C.amber : '#617362');
    text(c, `0${i + 1}`, r.x + 17, r.y + 32, 18, C.gold);
    relicIcon(c, relic.icon, r.x + r.w / 2, r.y + 93);
    text(c, relic.name, r.x + r.w / 2, r.y + 176, 27, C.cream, SERIF, 'center');
    // Descriptions wrap at words inside the card's fixed width.
    wrap(c, relic.description, r.x + r.w / 2, r.y + 211, 19, 209, 26, C.muted);
    line(c, r.x + 21, r.y + 266, r.x + r.w - 21, r.y + 266, '#7c80554a');
    text(c, `PRESS ${i + 1}`, r.x + r.w / 2, r.y + 313, 18, C.amber, SANS, 'center');
  }
  // Put the mechanical effect below each illustration, where it stays legible.
  w.choices.forEach((r, i) => {
    const x = UI.cards[i].x + UI.cards[i].w / 2;
    wrap(c, r.detail, x, 637, 19, 264, 26, C.amber);
  });
  text(c, 'Choose with 1 · 2 · 3 or click a relic', 640, 694, 20, C.muted, SANS, 'center');
  drawMute(c, w);
}
function wrap(c, value, x, y, size, max, leading, color) {
  c.font = `${size}px ${SANS}`;
  let row = '', index = 0;
  for (const word of value.split(' ')) {
    if (row && c.measureText(`${row} ${word}`).width > max) {
      text(c, row, x, y + index++ * leading, size, color, SANS, 'center'); row = word;
    } else row += `${row ? ' ' : ''}${word}`;
  }
  if (row) text(c, row, x, y + index * leading, size, color, SANS, 'center');
}

function drawEndScreen(c, w, aim) {
  const won = w.screen === 'victory';
  c.fillStyle = '#041214df'; c.fillRect(0, 0, 1280, 720);
  glow(c, 640, 230, 360, won ? '#dda25b18' : '#9d77bb12', '#ddae6200');
  panel(c, 252, 47, 776, 625, '#0c2021b0', '#667461');
  tracked(c, won ? 'ALL FIVE NIGHTS SURVIVED' : 'THE WATCH HAS ENDED', 640, 91, 18, won ? C.amber : C.violet, 3.2, 'center');
  if (won) {
    const stars = starsFor(w);
    for (let i = 0; i < 3; i++) star(c, 568 + i * 72, 145, i === 1 ? 31 : 25, i < stars);
  } else {
    relicIcon(c, 'lamp', 640, 151);
    line(c, 620, 127, 660, 174, '#071719', 5);
  }
  text(c, won ? 'You kept the dawn.' : 'The light went out.', 640, 239, 58, C.cream, SERIF, 'center');
  text(c, won ? 'For one more morning, the harbour is ours.' : 'Even the smallest flame is worth another try.', 640, 277, 22, C.muted, SANS, 'center');
  ornament(c, 640, 307, 286);
  tracked(c, 'FINAL SCORE', 640, 343, 16, C.muted, 3, 'center');
  text(c, w.score.toLocaleString('en-US'), 640, 400, 61, C.amber, SERIF, 'center');
  const stats = [
    ['SHADOWS BURNED', w.kills], ['EMBERS GATHERED', w.gathered],
    ['NIGHTS SURVIVED', `${w.survived} / 5`], ['BEST SCORE', Math.max(w.best, w.score).toLocaleString('en-US')],
  ];
  stats.forEach(([label, value], i) => {
    const x = 392 + (i % 2) * 302, y = 440 + Math.floor(i / 2) * 67;
    tracked(c, label, x, y, 18, C.muted, 1.4);
    text(c, String(value), x, y + 33, 29, C.cream, SERIF);
  });
  line(c, 640, 426, 640, 550, '#4e625346');
  button(c, UI.again, 'Play again  ↵', null, isHover(UI.again, aim));
  text(c, 'LANTERN WARD', 50, 683, 20, '#97aa8a', SERIF);
  text(c, 'Press Enter to begin a new watch', 640, 702, 18, C.muted, SANS, 'center');
  drawMute(c, w);
}
function drawPauseScreen(c) {
  c.fillStyle = '#041214c9'; c.fillRect(0, 0, 1280, 720);
  ornament(c, 640, 281, 190);
  text(c, 'The watch is paused.', 640, 359, 55, C.cream, SERIF, 'center');
  text(c, 'Press P, Escape or Enter to return', 640, 409, 24, C.amber, SANS, 'center');
  text(c, 'The tide can wait a moment.', 640, 452, 23, C.muted, SERIF, 'center');
}

export function createRenderer(canvas) {
  const c = canvas.getContext('2d');
  const backdrop = document.createElement('canvas');
  backdrop.width = FIELD.width; backdrop.height = FIELD.height;
  const bg = backdrop.getContext('2d');
  drawHarbour(bg); drawArena(bg);
  return {
    draw(w, aim) {
      c.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
      c.clearRect(0, 0, FIELD.width, FIELD.height);
      c.drawImage(backdrop, 0, 0);
      if (w.screen === 'title') drawTitleScreen(c, w, aim);
      else {
        drawPlayfield(c, w);
        if (w.screen === 'victory' || w.screen === 'defeat') drawEndScreen(c, w, aim);
        else if (w.screen === 'relic') drawRelicScreen(c, w, aim);
        else { drawHUD(c, w); if (w.screen === 'paused') drawPauseScreen(c); }
        if (w.screen === 'play' && aim) {
          ellipse(c, aim.x, aim.y, 8, 8, null, '#f4d391b0');
          line(c, aim.x - 13, aim.y, aim.x - 5, aim.y, '#f4d391b0');
          line(c, aim.x + 5, aim.y, aim.x + 13, aim.y, '#f4d391b0');
        }
      }
    },
  };
}
