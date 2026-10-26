import { createRequire } from 'module';

const { convert, plain } = createRequire(import.meta.url)('./poe2-tree.js');

// A tiny export in GGG's PoE2 data.json shape (synthetic, not GGG data).
const node = (extra) => ({ stats: [], group: 1, orbit: 0, orbitIndex: 0, x: 0, y: 0, out: [], in: [], ...extra });
const data = {
  classes: [
    { name: 'Warrior', ascendancies: [{ id: 'Warrior1', name: 'Titan', overridePairs: [] }, { id: 'Warrior2', name: null }] },
    { name: 'Witch', ascendancies: [{ id: 'Witch1', name: 'Lich' }, { id: 'Witch1b', name: 'Abyssal Lich', overridePairs: { 1: 2 } }] },
    { name: 'Marauder', ascendancies: [] },
  ],
  nodes: {
    root: { out: ['10'] },
    10: node({ name: 'SEVEN', classStartIndex: [0, 2], x: 0, y: 0 }),
    20: node({ name: 'TWO', classStartIndex: [1], x: 500, y: 0 }),
    11: node({ name: 'Attribute', isGenericAttribute: true, stats: ['+5 to any [Attributes|Attribute]'], x: 100, y: 0 }),
    12: node({ name: '[Shock] Chance', isNotable: true, stats: ['15% increased chance to [Shock]', '[Remnant|Remnants] last 2 seconds'], x: 100, y: 100 }),
    13: node({ name: 'Mastery', isMastery: true, x: 120, y: 100 }),
    14: node({ name: 'Hidden', isNotable: true, unlockConstraint: { nodes: [31], ascendancy: 'Warrior1' }, x: 200, y: 100 }),
    15: node({ name: 'Either', unlockConstraint: { nodes: [11, 12] }, x: 200, y: 200 }),
    // Links to 21, which sits beside the Witch start: in game, lets the build allocate from there.
    16: node({ name: 'Path of the Witch', ascendancyId: 'Warrior1', isNotable: true, x: 950, y: 950 }),
    21: node({ name: 'Spell Damage', x: 600, y: 0 }),
    30: node({ name: 'Titan', ascendancyId: 'Warrior1', isAscendancyStart: true, x: 900, y: 900 }),
    31: node({ name: 'Unseen', ascendancyId: 'Warrior1', isNotable: true, isFree: true, hideConnection: true, x: 950, y: 900 }),
    32: node({ name: 'Unreleased', ascendancyId: 'Warrior2', x: 0, y: 900 }),
    33: node({ name: 'Override', ascendancyId: 'Witch1b', x: 0, y: 950 }),
    34: node({ name: 'Anoint', isBlighted: true, isNotable: true }),
    35: node({ x: 300, y: 300 }), // an unnamed, unlinked placeholder (seen in 0.5.0)
  },
  edges: [
    { from: 'root', to: 10 },
    { from: 10, to: 11 },
    { from: 11, to: 10 },
    { from: 11, to: 12, orbit: 2, orbitX: 100, orbitY: 50 },
    { from: 12, to: 13 },
    { from: 12, to: 14 },
    { from: 14, to: 15 },
    { from: 10, to: 30 },
    { from: 30, to: 31 },
    { from: 30, to: 32 },
    { from: 30, to: 16 },
    { from: 16, to: 21 },
    { from: 20, to: 21 },
  ],
  min_x: -100,
  min_y: -100,
  max_x: 1000,
  max_y: 1000,
};

const { tree, layout } = convert(data, { repo: 'grindinggear/poe2-skilltree-export', tag: '9.9.9' });
const byId = (id) => tree.nodes.find((n) => n.id === id);

test('strips stat markup', () => {
  expect(plain('[Remnant|Remnants] can be [Shock|Shocked] by [Fire]')).toBe('Remnants can be Shocked by Fire');
});

test('keeps released nodes only; masteries, anoint-only, unreleased and override ascendancies go', () => {
  expect(tree.nodes.map((n) => n.id)).toEqual(['10', '11', '12', '14', '15', '16', '20', '21', '30', '31']);
  expect(tree.sections.map((s) => s.id)).toEqual(['main', 'titan', 'lich']);
  expect(tree.sections.slice(1).map((s) => s.req)).toEqual([{ start: '10' }, { start: '20' }]);
  expect(tree.sections[0].pool).toEqual(['passive', 'ws1', 'ws2']);
  expect(tree.ext.poe2.classes).toEqual([
    { name: 'Warrior', start: '10', ascendancies: ['titan'], ascendancyIds: ['Warrior1'] },
    { name: 'Witch', start: '20', ascendancies: ['lich'], ascendancyIds: ['Witch1'] },
    { name: 'Marauder', start: '10', ascendancies: [], ascendancyIds: [] },
  ]);
});

test('maps shared starts, attribute choices, free nodes and unlock constraints', () => {
  expect(byId('10')).toMatchObject({ kind: 'start', name: 'Warrior / Marauder', start: true, tags: ['class:marauder', 'class:warrior'] });
  expect(byId('11').options.map((o) => [o.id, o.stats[0].values[0]])).toEqual([['str', 5], ['dex', 5], ['int', 5]]);
  expect(byId('12')).toMatchObject({ name: 'Shock Chance', stats: [{ text: '{0}% increased chance to Shock' }, { text: 'Remnants last {0} seconds' }] });
  expect(byId('31').cost).toBe(0);
  expect(byId('14').req).toEqual({ all: [{ active: 'titan' }, { rank: '31', gte: 1 }] });
  expect(byId('15').req).toEqual({ any: [{ rank: '11', gte: 1 }, { rank: '12', gte: 1 }] });
});

test('a Path of the X node opens that class start as a root instead of linking across the tree', () => {
  expect(byId('16')).toMatchObject({ section: 'titan', kind: 'notable', roots: ['20'] });
  expect(tree.nodes.filter((n) => n.roots)).toHaveLength(1);
  const bad = structuredClone(data);
  bad.edges.push({ from: 16, to: 12 }); // 12 isn't beside a class start
  expect(() => convert(bad, { repo: 'x', tag: '9.9.9' })).toThrow(/16 > 12 crosses sections/);
});

test('links dedupe, drop cross-section links, keep arcs with centre and radius', () => {
  expect(tree.edges.map((e) => `${e.from}>${e.to}`)).toEqual(['10>11', '11>12', '12>14', '14>15', '16>30', '20>21', '30>31']);
  expect(layout.edges).toEqual({ '11>12': { path: 'arc', center: [100, 50], radius: 50 }, '30>31': { hidden: true } });
  expect(layout.nodes['12']).toEqual({ at: [100, 100] });
  expect(layout.sections.main).toEqual({ mode: 'absolute', origin: [100, 100] });
});
