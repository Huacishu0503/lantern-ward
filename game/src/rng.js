// Mulberry32: reproducible unsigned 32-bit state, independent of the wall clock.
export function createRng(seed) {
  let state = seed >>> 0;
  return {
    get state() { return state; },
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) { return min + this.next() * (max - min); },
    int(max) { return Math.floor(this.next() * max); },
  };
}
// Stateless noise for decoration; drawing never consumes simulation randomness.
export function noise(n) {
  const t = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return t - Math.floor(t);
}
