import fs from 'fs';
import path from 'path';
import { decodeWowheadTalents, encodeWowheadTalents } from './wowheadTalents';

const tree = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../data/trees/wow-classic-warrior.tree.json'), 'utf8'));

// Max ranks in link order, from Wowhead's own Classic talent data (talents-classic, trees 161/164/163).
const WOWHEAD_RANKS = [
  '353253213525155531',
  '55553135525512251',
  '55255133533221251',
];

test('talent order matches Wowhead Classic data', () => {
  const max = { ranks: Object.fromEntries(tree.nodes.map((n) => [n.id, n.ranks ?? 1])) };
  const link = encodeWowheadTalents(max, tree);
  expect(link).toBe(`https://www.wowhead.com/classic/talent-calc/warrior/${WOWHEAD_RANKS.join('-')}`);
});

// 17/34/0: Deep Wounds + Impale in Arms, Flurry + Bloodthirst in Fury.
const LINK = 'https://www.wowhead.com/classic/talent-calc/warrior/30305001302-05050005525010051';

test('decodes a Classic build', () => {
  const { build, warnings } = decodeWowheadTalents(LINK, tree);
  expect(warnings).toEqual([]);
  expect(build.ranks).toEqual({
    'improved-heroic-strike': 3,
    'improved-rend': 3,
    'tactical-mastery': 5,
    'anger-management': 1,
    'deep-wounds': 3,
    impale: 2,
    cruelty: 5,
    'unbridled-wrath': 5,
    'improved-battle-shout': 5,
    'dual-wield-specialization': 5,
    'improved-execute': 2,
    enrage: 5,
    'death-wish': 1,
    flurry: 5,
    bloodthirst: 1,
  });
  expect(Object.values(build.ranks).reduce((a, b) => a + b)).toBe(51);
});

test('encodes back to the same link', () => {
  expect(encodeWowheadTalents(decodeWowheadTalents(LINK, tree).build, tree)).toBe(LINK);
});

test('reads the level extra and reports the others', () => {
  const { build, warnings } = decodeWowheadTalents(`${LINK}_l40_r1`, tree);
  expect(build.context).toEqual({ level: 40 });
  expect(warnings).toEqual(['Ignored link extra "r1".']);
  expect(encodeWowheadTalents(build, tree, { level: true })).toBe(`${LINK}_l40`);
});

test('accepts a bare code and an empty build', () => {
  expect(decodeWowheadTalents('-5', tree).build.ranks).toEqual({ 'booming-voice': 5 });
  expect(encodeWowheadTalents({ ranks: {} }, tree)).toBe('https://www.wowhead.com/classic/talent-calc/warrior');
});

test('refuses other classes and bad points', () => {
  expect(() => decodeWowheadTalents('https://www.wowhead.com/classic/talent-calc/mage/05', tree)).toThrow('mage build');
  expect(() => decodeWowheadTalents('1-2-3-4', tree)).toThrow('4 trees');
  expect(decodeWowheadTalents('9', tree).warnings).toEqual(['Improved Heroic Strike has 9 points; it has 3 ranks.']);
  expect(() => encodeWowheadTalents({ ranks: { fireball: 1 } }, tree)).toThrow('Not warrior talents');
});
