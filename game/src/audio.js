// Tiny instrument bank. No context exists until a trusted physical gesture.
const NOTES = {
  kill: [520, 180, 0.16, 'triangle'], pickup: [660, 1100, 0.19, 'sine'],
  hit: [150, 45, 0.28, 'sawtooth'], relic: [440, 880, 0.45, 'triangle'],
  clear: [330, 660, 0.5, 'sine'], victory: [523, 1046, 0.8, 'triangle'],
  defeat: [220, 55, 0.8, 'triangle'], ash: [240, 75, 0.09, 'sine'],
};
export function createAudio() {
  let context = null, master = null, muted = false;
  return {
    gesture(event) {
      if (!event?.isTrusted || globalThis.navigator?.webdriver) return;
      try {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!context && Audio) {
          context = new Audio();
          master = context.createGain();
          master.gain.value = muted ? 0 : 1;
          master.connect(context.destination);
        }
        if (context?.state === 'suspended') context.resume().catch(() => {});
      } catch { context = null; master = null; }
    },
    mute(value) {
      muted = value;
      try { master?.gain.setValueAtTime(muted ? 0 : 1, context.currentTime); } catch { /* Audio device closed. */ }
    },
    play(event) {
      if (muted || !context || context.state !== 'running') return;
      const note = NOTES[event];
      if (!note) return;
      try {
        const [from, to, length, type] = note;
        const osc = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(from, now);
        osc.frequency.exponentialRampToValueAtTime(to, now + length);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.09, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
        osc.connect(gain).connect(master);
        osc.start(now);
        osc.stop(now + length + 0.02);
      } catch { /* Audio is decorative; a device failure never interrupts play. */ }
    },
  };
}
