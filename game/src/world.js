import { FIELD, PLAYER, WAVES, KINDS, EMBER, RELICS, FX, RULES, STEP } from './config.js';
import { createRng } from './rng.js';

export function createWorld(seed = 1) {
  const w = { seed: seed >>> 0, best: 0, muted: false };
  resetWorld(w);
  w.screen = 'title';
  return w;
}

export function resetWorld(w) {
  Object.assign(w, {
    rng: createRng(w.seed), screen: 'play', tick: 0, time: 0, night: 1,
    player: { x: FIELD.cx, y: FIELD.cy, angle: -0.6, hearts: PLAYER.hearts, oil: PLAYER.oil, invulnerable: 0, stoking: false, exhausted: false },
    upgrades: { speed: 1, drain: 1, recovery: 1, damage: 1, cone: 1, emberValue: 1, pickup: 0 },
    enemies: [], embers: [], particles: [], texts: [], events: [], relics: [], choices: [], lamp: null,
    score: 0, kills: 0, gathered: 0, scorched: 0, hits: 0, survived: 0,
    pending: 0, spawnTimer: 0, waveTotal: 0, waveKills: 0, flash: 0,
    banner: FX.nightBanner, nextId: 1,
  });
  beginNight(w);
}

function beginNight(w) {
  w.screen = 'play';
  w.pending = WAVES[w.night - 1].count;
  w.waveTotal = w.pending;
  w.waveKills = 0;
  w.spawnTimer = 0.5;
  w.banner = FX.nightBanner;
  w.player.oil = Math.min(PLAYER.oil, w.player.oil + RULES.nightOil);
  w.player.invulnerable = RULES.nightGrace;
}

export function chooseRelic(w, index) {
  if (w.screen !== 'relic' || !w.choices[index]) return false;
  const relic = w.choices[index];
  w.relics.push(relic.id);
  const e = relic.effect;
  for (const key of ['speed', 'drain', 'recovery', 'damage', 'cone', 'emberValue']) {
    if (e[key]) w.upgrades[key] *= e[key];
  }
  if (e.pickup) w.upgrades.pickup += e.pickup;
  if (e.heal) w.player.hearts = PLAYER.hearts;
  if (e.lamp) w.lamp = { x: FIELD.cx, y: FIELD.cy, radius: RULES.lampRadius, damage: RULES.lampDamage };
  burst(w, w.player.x, w.player.y, 'gold', 35);
  floatText(w, w.player.x, w.player.y - 55, relic.name, 'gold');
  w.events.push('relic');
  w.night++;
  beginNight(w);
  return true;
}

function offerRelics(w) {
  const pool = RELICS.filter(r => !w.relics.includes(r.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = w.rng.int(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  w.choices = pool.slice(0, 3);
  w.screen = 'relic';
  w.player.stoking = false;
  w.events.push('clear');
}

function spawnShadow(w, kind, x, y) {
  const spec = KINDS[kind];
  if (x === undefined) {
    const a = w.rng.range(0, Math.PI * 2);
    x = FIELD.cx + Math.cos(a) * FIELD.rx * 0.96;
    y = FIELD.cy + Math.sin(a) * FIELD.ry * 0.96;
  }
  w.enemies.push({ id: w.nextId++, kind, x, y, hp: spec.hp, phase: w.rng.range(0, Math.PI * 2), burning: false, age: 0 });
}

export function inBeam(w, x, y, padding = 0) {
  const p = w.player, dx = x - p.x, dy = y - p.y;
  if (dx * dx + dy * dy > (PLAYER.range + padding) ** 2) return false;
  const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - p.angle), Math.cos(Math.atan2(dy, dx) - p.angle));
  return Math.abs(delta) < PLAYER.cone * w.upgrades.cone / 2 + padding / Math.max(35, Math.hypot(dx, dy));
}

function burst(w, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = w.rng.range(0, Math.PI * 2), speed = w.rng.range(25, 125);
    w.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 25, life: FX.burstLife, max: FX.burstLife, size: w.rng.range(1.5, 4), color });
  }
}

function floatText(w, x, y, text, color = 'gold') {
  w.texts.push({ x, y, text, color, life: FX.textLife });
}

function burnShadow(w, e) {
  const spec = KINDS[e.kind];
  w.kills++;
  w.waveKills++;
  w.score += spec.score;
  burst(w, e.x, e.y, 'violet', 15);
  burst(w, e.x, e.y, 'gold', 7);
  floatText(w, e.x, e.y - 24, `+${spec.score}`);
  w.events.push('kill');
  for (let i = 0; i < spec.ember; i++) {
    w.embers.push({ x: e.x + w.rng.range(-13, 13), y: e.y + w.rng.range(-10, 10), age: 0, phase: w.rng.range(0, Math.PI * 2) });
  }
  if (e.kind === 'splitter') {
    w.waveTotal += 2;
    spawnShadow(w, 'fragment', e.x - 18, e.y + 9);
    spawnShadow(w, 'fragment', e.x + 18, e.y - 9);
  }
}

export function starsFor(w) {
  if (w.survived < WAVES.length) return 0;
  return 1 + Number(w.hits <= RULES.secondStarHits) + Number(w.hits <= RULES.thirdStarHits && w.gathered >= RULES.thirdStarEmbers);
}

// One call advances exactly one 60 Hz tick. Inputs use only logical coordinates.
export function stepWorld(w, input = {}) {
  w.events.length = 0;
  if (w.screen !== 'play') return;
  w.tick++;
  w.time = w.tick * STEP;
  w.flash = Math.max(0, w.flash - STEP);
  w.banner = Math.max(0, w.banner - STEP);
  const p = w.player, u = w.upgrades;
  p.invulnerable = Math.max(0, p.invulnerable - STEP);
  let mx = input.x || 0, my = input.y || 0;
  const mag = Math.hypot(mx, my);
  if (mag > 1) { mx /= mag; my /= mag; }
  p.x += mx * PLAYER.speed * u.speed * STEP;
  p.y += my * PLAYER.speed * u.speed * STEP;
  const edge = Math.hypot((p.x - FIELD.cx) / (FIELD.rx - 28), (p.y - FIELD.cy) / (FIELD.ry - 25));
  if (edge > 1) {
    p.x = FIELD.cx + (p.x - FIELD.cx) / edge;
    p.y = FIELD.cy + (p.y - FIELD.cy) / edge;
  }
  if (Number.isFinite(input.aimX) && Number.isFinite(input.aimY)) p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);
  if (p.oil >= PLAYER.reignite) p.exhausted = false;
  p.stoking = !!input.stoke && !p.exhausted && p.oil > 0;
  p.oil = Math.min(PLAYER.oil, Math.max(0, p.oil + (p.stoking ? -PLAYER.drain * u.drain : PLAYER.recovery * u.recovery) * STEP));
  if (p.oil === 0) { p.exhausted = true; p.stoking = false; }

  const wave = WAVES[w.night - 1];
  w.spawnTimer -= STEP;
  if (w.pending > 0 && w.spawnTimer <= 0) {
    let kind = 'wisp';
    const roll = w.rng.next();
    if (w.night >= 3 && roll < 0.25) kind = 'splitter';
    else if (w.night >= 2 && roll < 0.57) kind = 'lurker';
    if (w.pending === wave.count && w.night === 2) kind = 'lurker';
    if (w.pending === wave.count && w.night === 3) kind = 'splitter';
    spawnShadow(w, kind);
    w.pending--;
    w.spawnTimer += wave.interval;
  }

  // Splitter children begin on the next tick, never in the iteration that creates them.
  const alive = [], enemies = w.enemies;
  w.enemies = [];
  for (const e of enemies) {
    const spec = KINDS[e.kind];
    e.age += STEP;
    e.burning = p.stoking && inBeam(w, e.x, e.y, spec.radius * 0.4);
    if (e.burning) e.hp -= PLAYER.damage * u.damage * STEP;
    let target = p;
    if (w.lamp && Math.hypot(e.x - w.lamp.x, e.y - w.lamp.y) < w.lamp.radius) {
      e.hp -= w.lamp.damage * STEP;
      e.burning = true;
      target = w.lamp;
    }
    if (e.hp <= 0) { burnShadow(w, e); continue; }
    const dx = target.x - e.x, dy = target.y - e.y, dist = Math.hypot(dx, dy) || 1;
    const weave = Math.sin(e.age * 3 + e.phase) * (e.kind === 'lurker' ? 0.6 : 0.18);
    const speed = spec.speed * wave.speed * (e.burning ? RULES.burningSpeed : 1);
    e.x += (dx / dist - dy / dist * weave) * speed * STEP;
    e.y += (dy / dist + dx / dist * weave) * speed * STEP;
    if (Math.hypot(e.x - p.x, e.y - p.y) < PLAYER.radius + spec.radius && p.invulnerable === 0) {
      p.hearts--;
      w.hits++;
      p.invulnerable = PLAYER.invulnerability;
      w.flash = FX.hitFlash;
      burst(w, p.x, p.y, 'red', 24);
      floatText(w, p.x, p.y - 40, '−1 HEART', 'red');
      w.events.push('hit');
      e.x -= dx / dist * RULES.contactKnockback;
      e.y -= dy / dist * RULES.contactKnockback;
    }
    alive.push(e);
  }
  w.enemies.push(...alive);

  w.embers = w.embers.filter(e => {
    e.age += STEP;
    if (e.age > EMBER.life) return false;
    if (p.stoking && e.age > EMBER.grace && inBeam(w, e.x, e.y)) {
      burst(w, e.x, e.y, 'gold', 5);
      floatText(w, e.x, e.y - 12, 'ASH', 'muted');
      w.scorched++;
      w.events.push('ash');
      return false;
    }
    if (!p.stoking && Math.hypot(e.x - p.x, e.y - p.y) < PLAYER.pickup + u.pickup) {
      p.oil = Math.min(PLAYER.oil, p.oil + EMBER.oil);
      w.gathered++;
      w.score += EMBER.score * u.emberValue;
      burst(w, e.x, e.y, 'gold', 10);
      floatText(w, p.x, p.y - 32, `+${EMBER.oil} OIL`);
      w.events.push('pickup');
      return false;
    }
    return true;
  });
  for (const f of w.particles) { f.x += f.vx * STEP; f.y += f.vy * STEP; f.vy += 40 * STEP; f.life -= STEP; }
  w.particles = w.particles.filter(f => f.life > 0);
  for (const t of w.texts) { t.y -= 25 * STEP; t.life -= STEP; }
  w.texts = w.texts.filter(t => t.life > 0);

  if (p.hearts <= 0) {
    w.screen = 'defeat';
    p.stoking = false;
    w.events.push('defeat');
    w.best = Math.max(w.best, w.score);
  } else if (w.pending === 0 && w.enemies.length === 0) {
    w.survived = w.night;
    w.score += RULES.clearScore + p.hearts * RULES.heartBonus;
    if (w.night === WAVES.length) {
      w.screen = 'victory';
      p.stoking = false;
      w.events.push('victory');
      w.best = Math.max(w.best, w.score);
    } else offerRelics(w);
  }
}
