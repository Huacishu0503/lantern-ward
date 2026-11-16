// Standard library only. Run from the repository root with node tests/verify.mjs.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FIELD, PLAYER, RELICS } from '../game/src/config.js';
import { createWorld, resetWorld, stepWorld, chooseRelic, starsFor } from '../game/src/world.js';
import { stageShot, autopilot, pilotRelic } from '../game/src/shots.js';
import { hitTarget } from '../game/src/render.js';
import { createAudio } from '../game/src/audio.js';
import { createRng } from '../game/src/rng.js';

const hash = w => createHash('sha256').update(JSON.stringify(w)).digest('hex');
function scene(name, seed = 1) { const w = createWorld(seed); stageShot(name, w); return w; }
for (const [name, screen] of [['start', 'title'], ['play', 'play'], ['win', 'victory'], ['end', 'defeat'], ['relic', 'relic']]) {
  const a = scene(name), b = scene(name);
  assert.equal(a.screen, screen);
  assert.equal(hash(a), hash(b), `${name}: identical complete state for identical seed`);
  console.log(`${name}: ${screen}, night ${a.night}, ${a.kills} burned, ${a.gathered} gathered, score ${a.score}`);
}
const play = scene('play');
assert.ok(play.enemies.length >= 3 && play.embers.length >= 2);
assert.ok(play.player.oil > 20 && play.player.oil < 85);
assert.ok(play.relics.length >= 1 && play.score > 1000);
assert.equal(starsFor(scene('win')), 3);
assert.equal(scene('end').player.hearts, 0);

for (const seed of [0, 1, 2, 3, 7, 19, 42, 100, 1897, 65535, 2147483647, 4294967295]) {
  const a = scene('win', seed);
  assert.equal(a.screen, 'victory', `controller can win seed ${seed}`);
  assert.equal(a.survived, 5);
  assert.equal(a.relics.length, 4);
  assert.ok(a.gathered > 0 && a.kills > 100);
  assert.equal(scene('end', seed).screen, 'defeat');
  const p = scene('play', seed);
  assert.equal(p.screen, 'play');
  assert.ok(p.enemies.length >= 3 && p.embers.length >= 1, `action scene populated for seed ${seed}`);
}

// Replaying the same tick inputs produces identical outcomes, with rendering absent.
const a = createWorld(42), b = createWorld(42);
resetWorld(a); resetWorld(b);
for (let tick = 0; tick < 1400; tick++) {
  if (a.screen === 'relic') { pilotRelic(a); pilotRelic(b); }
  const input = autopilot(a);
  stepWorld(a, input); stepWorld(b, input);
  assert.equal(hash(a), hash(b));
}
const reset = scene('win');
reset.best = 50000; reset.muted = true;
resetWorld(reset);
const fresh = createWorld(1); resetWorld(fresh); fresh.best = 50000; fresh.muted = true;
assert.equal(hash(reset), hash(fresh), 'restart clears all run state');

// Soft mode gathers; hard mode destroys the same ember and consumes oil.
for (const hard of [false, true]) {
  const w = createWorld(3); resetWorld(w);
  w.player.oil = 50;
  w.embers.push({ x: FIELD.cx + 20, y: FIELD.cy, age: 1, phase: 0 });
  stepWorld(w, { aimX: FIELD.cx + 100, aimY: FIELD.cy, stoke: hard });
  assert.equal(w.embers.length, 0);
  assert.equal(w.gathered, hard ? 0 : 1);
  assert.equal(w.scorched, hard ? 1 : 0);
  assert.ok(hard ? w.player.oil < 50 : w.player.oil > 50);
}

// Contact respects the invulnerability window.
const contact = createWorld(1); resetWorld(contact); contact.player.invulnerable = 0;
contact.enemies.push({ id: 99, kind: 'wisp', hp: 32, x: FIELD.cx, y: FIELD.cy, age: 0, phase: 0 });
stepWorld(contact);
assert.equal(contact.player.hearts, PLAYER.hearts - 1);
for (let i = 0; i < 30; i++) stepWorld(contact);
assert.equal(contact.player.hearts, PLAYER.hearts - 1);

// Every relic has a mechanical effect and is selectable exactly once at a choice.
for (const r of RELICS) {
  const w = createWorld(1); resetWorld(w);
  w.screen = 'relic'; w.choices = [r]; w.player.hearts = 1;
  assert.ok(chooseRelic(w, 0));
  assert.equal(w.night, 2); assert.equal(w.screen, 'play');
  assert.deepEqual(w.relics, [r.id]);
  const effect = r.effect;
  if (effect.heal) assert.equal(w.player.hearts, 3);
  if (effect.lamp) assert.ok(w.lamp);
  for (const key of Object.keys(effect).filter(k => !['heal', 'lamp'].includes(k))) assert.equal(w.upgrades[key], effect[key]);
  assert.equal(chooseRelic(w, 0), false);
}
assert.equal(hitTarget(250, 520, 'relic'), 0, 'lower first card receives clicks');
assert.equal(hitTarget(700, 610, 'victory'), 'begin');
assert.equal(hitTarget(700, 610, 'play'), null);

const rng = createRng(1); rng.next(); const clone = createRng(rng.state);
assert.equal(rng.next(), clone.next());
const audio = createAudio(); audio.gesture({ isTrusted: false });
audio.play('hit'); audio.mute(true); audio.play('victory');

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = `${dir}/${name}`, stat = lstatSync(path);
    assert.ok(!stat.isSymbolicLink(), `plain file: ${path}`);
    return stat.isDirectory() ? files(path) : [path];
  });
}
const gameFiles = files('game');
assert.ok(gameFiles.length < 993);
assert.ok(gameFiles.reduce((n, path) => n + lstatSync(path).size, 0) < 48 * 1024 * 1024);
for (const path of gameFiles) {
  const source = readFileSync(path, 'utf8');
  assert.ok(!/https?:\/\/|Math\.random\s*\(/.test(source), `offline deterministic source: ${path}`);
  assert.ok(!path.endsWith('.ts'));
}
console.log('Passed: seeded replay, all screens, 12 win/defeat/action seeds, oil/ember rules, hits, 8 relics, restart, UI hit areas, silent audio guards, offline/file limits.');
