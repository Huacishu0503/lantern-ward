# Lantern Ward

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Huacishu0503/lantern-ward/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Huacishu0503/lantern-ward/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An entry in [make.fun's “Make the best game” bounty](https://make.fun/bounty/best-game-01).

You are the last lamplighter on a drowned harbour. Hold a hard cone of lantern light against five nights of violet shadows, then dim the flame to gather the embers they leave behind. Stoking consumes oil and destroys fallen embers; a soft glow lets you harvest their oil and score. Three hearts, fast lurkers, dividing splitters, and eight possible relics make each watch a balance of pressure and restraint. Everything is drawn with Canvas 2D; sound is synthesized locally. No assets, fonts, packages, or network access are needed.

Run with Node 22 or later:

```sh
node serve.ts
```

Open localhost on port 8080. There is no install or build step. The logical field is always 1280 × 720 and scales to fit the window.

| Control | Action |
| --- | --- |
| WASD / arrow keys | Move |
| Mouse | Aim lantern |
| Hold left mouse / Space | Stoke: burn shadows, consume oil |
| Release | Soft glow: recover oil, collect embers |
| 1 / 2 / 3 or click | Choose a relic between nights |
| Enter | Begin / play again |
| P / Escape | Pause / resume |
| M | Toggle sound |

A finished watch earns one star. Five or fewer hits earns a second. Two or fewer hits and at least 22 gathered embers earns a third. Best score persists when browser storage is available; restarting resets the entire run and keeps only the seed, best score, and sound preference.

## File map

| Path | Job |
| --- | --- |
| `game/index.html` | Canvas, responsive CSS, accessible status line |
| `game/src/config.js` | Palette, logical field, tuning, waves, eight relics |
| `game/src/rng.js` | Seeded Mulberry32 generator and decorative noise |
| `game/src/input.js` | Keyboard, pointer, logical coordinate mapping |
| `game/src/world.js` | Fixed 60 Hz simulation, enemies, oil, collisions, waves, relics, scoring |
| `game/src/render.js` | Vector harbour artwork, lighting, actors, HUD, all screens, UI hit areas |
| `game/src/audio.js` | Lazy, guarded WebAudio instrument bank and mute |
| `game/src/shots.js` | Deterministic controller and real-rule screenshot scenes |
| `game/src/main.js` | Startup, accumulator loop, state transitions, storage, shot dispatch |
| `tests/verify.mjs` | Dependency-free simulation, determinism, scene, and reset checks |
| `tests/browser.mjs` | Existing headless Chrome: four scenes, console errors, local requests, repeated pixel checks |
| `serve.ts` | Supplied static server; unchanged |
| `main.ts` | Supplied hand-in program; unchanged |
| `vendor/makefun-game.ts` | Supplied dossier library; unchanged |
| `shots.json` | Supplied screenshot URL map; unchanged |
| `LICENSE` | MIT license; unchanged |

## Reproducible scenes

Append `?shot=start&seed=1`, `?shot=play&seed=1`, `?shot=win&seed=1`, or `?shot=end&seed=1` to the game URL. An additional `?shot=relic&seed=1` captures the first relic choice. Rendering starts without a gesture and freezes at `window.__shotReady === true`. The action scene selects an actual simulated frame; victory uses the real controller through all five waves, and defeat stops fighting in night three. No health, kill, score, or wave values are fabricated. Shot mode ignores stored best scores and never creates an audio context.

Use `?seed=N` for a reproducible interactive run. Gameplay depends only on its seed and the input supplied to each fixed tick; drawing never advances random state. Headless browsers remain silent. Switching tabs pauses an interactive watch.

Run the source and simulation checks:

```sh
for file in game/src/*.js; do node --check "$file" || exit 1; done
node tests/verify.mjs
```

With an existing Chrome installation and permission to open loopback sockets, verify the four scenes in the browser:

```sh
node tests/browser.mjs /path/to/chrome
```

This uses only Node’s standard library and Chrome’s debugging pipe. It starts the supplied server, checks for runtime/console errors and external asset requests, compares repeated screenshots pixel for pixel, and saves PNGs under the system temporary directory.
