// Reputation maths for the WoW TBC calculators, kept apart from the UI so it can be tested.

export const LEVELS = [
  { name: 'neutral', label: 'Neutral', points: 0 },
  { name: 'friendly', label: 'Friendly', points: 3000 },
  { name: 'honored', label: 'Honored', points: 9000 },
  { name: 'revered', label: 'Revered', points: 21000 },
  { name: 'exalted', label: 'Exalted', points: 42000 },
];
export const EXALTED = 42000;

const levelIndex = (name) => LEVELS.findIndex((l) => l.name === name);

export const ALDOR_TOKENS = [
  {
    key: 't1',
    name: "Mark of Kil'jaeden / Firewing Signet",
    points: 25,
    maxTier: 'honored',
    icons: ['kiljaeden', 'firewing'],
    contribution: '250 (10 Tokens)',
  },
  {
    key: 't2',
    name: 'Mark of Sargeras / Sunfury Signet',
    points: 25,
    maxTier: 'exalted',
    icons: ['sargeras', 'sunfury'],
    contribution: '250 (10 Tokens)',
  },
  {
    key: 't3',
    name: 'Fel Armament / Arcane Tome',
    points: 350,
    maxTier: 'exalted',
    icons: ['fel-armament', 'arcane-tome'],
    contribution: '350 (1 Token)',
  },
];
export const EITHER = 'Mark of Sargeras / Sunfury Signet OR Fel Armament / Arcane Tome';

// Tokens still to farm for Aldor/Scryer, per rank and in total, after spending the ones you own.
// Kil'jaeden/Firewing only count up to Honored. Sargeras/Sunfury and Fel Armament/Arcane Tome
// are alternatives, so each rank shows how many of either you would need.
export function aldorScryer({ level, points, owned, double, skipFirstTier }) {
  const start = LEVELS[levelIndex(level)].points + points;
  if (start >= EXALTED) return { exalted: true };

  const mult = double ? 2 : 1;
  const left = { ...owned };
  const totals = { t1: 0, t2: 0, t3: 0 };
  const ranks = [];
  let current = start;

  for (let i = levelIndex(level); i < LEVELS.length - 1 && current < EXALTED; i++) {
    const next = LEVELS[i + 1];
    let remaining = next.points - current;
    const lines = [];
    const either = {};

    for (const token of ALDOR_TOKENS) {
      if (token.key === 't1' && (skipFirstTier || levelIndex(next.name) > levelIndex(token.maxTier))) continue;

      const value = token.points * mult;
      const needed = Math.max(0, Math.ceil(remaining / value));
      const fromOwned = Math.min(needed, left[token.key]);
      left[token.key] -= fromOwned;
      const toFarm = needed - fromOwned;

      if (token.key === 't1') {
        remaining -= needed * value;
        totals.t1 += toFarm;
        lines.push([token.name, toFarm]);
      } else {
        either[token.key] = toFarm;
      }
    }

    if (either.t2 > 0 || either.t3 > 0) {
      totals.t2 += either.t2;
      totals.t3 += either.t3;
      lines.push([EITHER, `${either.t2} Marks/Signet OR ${either.t3} Armament/Tome`]);
    } else {
      lines.push([EITHER, 'Not needed']);
    }

    ranks.push({ rank: next.label, lines });
    current = next.points;
  }

  return {
    start,
    needed: EXALTED - start,
    totals: ALDOR_TOKENS.filter((t) => t.key !== 't1' || (!skipFirstTier && start < 9000)).map((t) => [
      t.name,
      totals[t.key],
    ]),
    ranks,
  };
}

// Cenarion Expedition: Unidentified Plant Parts (25 rep) up to Friendly, then Coilfang Armaments (75 rep).
export const CENARION_TOKENS = [
  { key: 'plantParts', name: 'Unidentified Plant Parts', points: 25, contribution: '250 (10 Tokens)', maxTier: 'Friendly' },
  { key: 'coilfang', name: 'Coilfang Armaments', points: 75, contribution: '75 (1 Token)', maxTier: 'Exalted' },
];

export function cenarion({ level, points, owned }) {
  const start = LEVELS[levelIndex(level)].points + points;
  const left = { ...owned };
  const totals = { plantParts: 0, coilfang: 0 };
  const ranks = [];
  let current = start;

  for (const next of LEVELS.slice(1)) {
    if (current >= next.points) continue;
    const token = next.name === 'friendly' ? CENARION_TOKENS[0] : CENARION_TOKENS[1];
    const needed = Math.ceil((next.points - current) / token.points);
    const fromOwned = Math.min(needed, left[token.key]);
    left[token.key] -= fromOwned;
    totals[token.key] += needed - fromOwned;
    ranks.push({ rank: next.label, lines: [[token.name, needed - fromOwned]] });
    current = next.points;
  }

  return {
    start,
    needed: Math.max(0, EXALTED - start),
    totals: CENARION_TOKENS.map((t) => [t.name, totals[t.key]]),
    ranks,
  };
}
