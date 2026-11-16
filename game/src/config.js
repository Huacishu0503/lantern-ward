// Logical units and seconds. Rendering never changes simulation coordinates.
export const FIELD = { width: 1280, height: 720, cx: 640, cy: 389, rx: 501, ry: 225 };
export const STEP = 1 / 60;
export const MAX_FRAME = 0.25;
export const BEST_KEY = 'lantern-ward-best-v1';
export const COLORS = {
  sky: '#071719', water: '#0b292d', teal: '#397574', stone: '#294444',
  ink: '#071316', cream: '#ece7ce', muted: '#99b2ac', amber: '#f4bd65',
  gold: '#c9934e', violet: '#a28bdc', shadow: '#241d3e', red: '#ee8c7b',
};
export const PLAYER = {
  speed: 207, radius: 14, hearts: 3, invulnerability: 1.8,
  oil: 100, drain: 21, recovery: 9.5, reignite: 16,
  range: 270, cone: 0.65, damage: 105, pickup: 31,
};
export const WAVES = [
  { count: 12, interval: 1.15, speed: 1.00, label: 'The tide brings company' },
  { count: 17, interval: 1.00, speed: 1.10, label: 'Lurkers move fast. Keep moving.' },
  { count: 22, interval: 0.88, speed: 1.18, label: 'Splitters leave two hungry fragments.' },
  { count: 28, interval: 0.78, speed: 1.27, label: 'No safe harbour' },
  { count: 34, interval: 0.67, speed: 1.35, label: 'Hold until the dawn' },
];
export const KINDS = {
  wisp: { hp: 32, speed: 51, radius: 17, score: 100, ember: 1 },
  lurker: { hp: 26, speed: 89, radius: 13, score: 150, ember: 1 },
  splitter: { hp: 57, speed: 40, radius: 23, score: 200, ember: 2 },
  fragment: { hp: 16, speed: 73, radius: 10, score: 50, ember: 1 },
};
export const EMBER = { oil: 22, score: 60, life: 23, grace: 0.48 };
export const RELICS = [
  { id: 'lens', name: 'Prism lens', icon: 'lens', description: 'A wider beam. Catch more in the light.', detail: '+35% cone width', effect: { cone: 1.35 } },
  { id: 'wick', name: 'Patient wick', icon: 'wick', description: 'Make every last drop of oil count.', detail: '25% less oil used', effect: { drain: 0.75 } },
  { id: 'boots', name: 'Tide boots', icon: 'boots', description: 'Outrun what crawls in from the water.', detail: '+22% movement speed', effect: { speed: 1.22 } },
  { id: 'vessel', name: 'Ember vessel', icon: 'vessel', description: 'Gather fallen light from farther away.', detail: 'Double ember score · +20 reach', effect: { emberValue: 2, pickup: 20 } },
  { id: 'heart', name: 'Warmth charm', icon: 'heart', description: 'A little warmth to keep you here.', detail: 'Restore all three hearts', effect: { heal: true } },
  { id: 'lamp', name: 'Watch lamp', icon: 'lamp', description: 'A second flame guards the stone circle.', detail: 'A permanent burning lamp', effect: { lamp: true } },
  { id: 'mantle', name: 'Sun mantle', icon: 'sun', description: 'Carry a sharper piece of the dawn.', detail: '+40% burn damage', effect: { damage: 1.4 } },
  { id: 'flask', name: 'Brass flask', icon: 'flask', description: 'The quiet flame recovers more quickly.', detail: '+45% oil recovery', effect: { recovery: 1.45 } },
];
export const FX = { burstLife: 0.65, textLife: 1.15, hitFlash: 0.32, nightBanner: 3.2 };

export const RULES = {
  nightOil: 30, nightGrace: 1, clearScore: 500, heartBonus: 100,
  contactKnockback: 65, burningSpeed: 0.55,
  lampRadius: 108, lampDamage: 34,
  secondStarHits: 5, thirdStarHits: 2, thirdStarEmbers: 22,
};
