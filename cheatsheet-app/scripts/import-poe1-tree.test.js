import { createRequire } from 'module';

const { convert, statLine, orbitAngles, unevenAngles } =createRequire(import.meta.url)('./import-poe1-tree.js');

// A tiny export in GGG's data.json shape (synthetic, not GGG data).
const data = {
  classes: [
    { name: 'Scion', ascendancies: [{ id: 'Ascendant', name: 'Ascendant' }] },
    { name: 'Marauder', ascendancies: [{ id: 'Juggernaut', name: 'Juggernaut' }] },
  ],
  alternate_ascendancies: [{ id: 'KingInTheMists', name: 'Bloodline of the King' }],
  groups: { 1: { x: 0, y: 0 }, 2: { x: 100.1234, y: -50 }, 3: { x: 500, y: 500 } },
  nodes: {
    root: { group: 0, out: ['10', '20'], in: [] },
    10: { name: 'SEVEN', classStartIndex: 0, group: 1, orbit: 0, orbitIndex: 0, out: ['11', '30'], in: [] },
    20: { name: 'ONE', classStartIndex: 1, group: 2, orbit: 0, orbitIndex: 0, out: ['21'], in: [] },
    11: { name: 'Strength', grantedStrength: 10, stats: ['+10 to Strength'], group: 1, orbit: 2, orbitIndex: 1, out: ['12'], in: [] },
    12: { name: 'Hot', isNotable: true, stats: ['Adds 1 to 3 Fire Damage'], group: 1, orbit: 2, orbitIndex: 2, out: ['13', '14'], in: [] },
    13: { name: 'Fire Mastery', isMastery: true, masteryEffects: [{ effect: 501, stats: ['10% increased Fire Damage'] }], group: 1, orbit: 0, orbitIndex: 0, out: [], in: ['12'] },
    14: { name: 'Big', isKeystone: true, stats: ['Life cannot be Recovered'], group: 2, orbit: 1, orbitIndex: 3, out: ['21'], in: [] },
    21: { name: 'Socket', isJewelSocket: true, expansionJewel: { size: 2, index: 0, proxy: '90' }, group: 2, orbit: 2, orbitIndex: 0, out: ['90'], in: [] },
    30: { name: 'Ascendant', ascendancyName: 'Ascendant', isAscendancyStart: true, group: 3, orbit: 0, orbitIndex: 0, out: ['31', '33'], in: [] },
    31: { name: 'Pick', ascendancyName: 'Ascendant', isNotable: true, isMultipleChoice: true, group: 3, orbit: 2, orbitIndex: 0, out: ['32'], in: [] },
    32: { name: 'Option', ascendancyName: 'Ascendant', isMultipleChoiceOption: true, grantedPassivePoints: 1, stats: ['Grants 1 Passive Skill Point'], group: 3, orbit: 2, orbitIndex: 1, out: [], in: [] },
    // Links to 21, which sits beside the Marauder start: in game, lets the Scion allocate from there.
    33: { name: 'Path of the Marauder', ascendancyName: 'Ascendant', isNotable: true, group: 3, orbit: 2, orbitIndex: 2, out: ['21'], in: ['30'] },
    40: { name: 'King', ascendancyName: 'KingInTheMists', isBloodline: true, isAscendancyStart: true, group: 3, orbit: 0, orbitIndex: 0, out: [], in: [] },
    90: { name: 'Position Proxy', isProxy: true, group: 2, orbit: 1, orbitIndex: 0, out: [], in: [] },
    91: { name: 'Anoint only', isBlighted: true, isNotable: true, group: 2, orbit: 1, orbitIndex: 1, out: [], in: [] },
    92: { name: 'Removed', isNotable: true, out: [], in: [] },
    93: { name: 'Nested socket', isJewelSocket: true, expansionJewel: { size: 0, index: 0, proxy: '90', parent: '21' }, group: 2, orbit: 1, orbitIndex: 2, out: [], in: [] },
  },
  min_x: -100,
  min_y: -200,
  max_x: 900,
  max_y: 800,
  constants: { skillsPerOrbit: [1, 6, 16, 16, 40, 72, 72], orbitRadii: [0, 82, 162, 335, 493, 662, 846] },
  points: { totalPoints: 123, ascendancyPoints: 8 },
};

const pin = { repo: 'grindinggear/skilltree-export', tag: '9.9.9' };
const { tree, layout } = convert(data, pin);
const node = (id) => tree.nodes.find((n) => n.id === id);

test('keeps tree nodes only, sorted by id, in schema key order', () => {
  expect(tree.nodes.map((n) => n.id)).toEqual(['10', '11', '12', '13', '14', '20', '21', '30', '31', '32', '33', '40']);
  expect(Object.keys(node('12'))).toEqual(['id', 'section', 'kind', 'name', 'tags', 'stats']);
  expect(tree).toMatchObject({ id: 'poe1-9.9.9', source: 'grindinggear/skilltree-export@9.9.9', game: 'poe1', patch: '9.9.9' });
});

test('maps node kinds, starts, masteries, sockets and tags', () => {
  expect(node('10')).toMatchObject({ kind: 'start', name: 'Scion', start: true, tags: ['class:scion'] });
  expect(node('10').noPath).toBeUndefined();
  expect(node('11')).toMatchObject({ tags: ['attr:str'], stats: [{ id: '+# to Strength', text: '+{0} to Strength', values: [10] }] });
  expect(node('12')).toMatchObject({ kind: 'notable', tags: ['dmg:fire'] });
  expect(node('13')).toMatchObject({ kind: 'mastery', noPath: true, options: [{ id: '501' }] });
  expect(node('14').kind).toBe('keystone');
  expect(node('21')).toMatchObject({ kind: 'socket', socket: { accepts: ['jewel', 'cluster-jewel'] } });
  expect(node('30')).toMatchObject({ section: 'ascendant', kind: 'start', start: true, granted: true });
  expect(node('32').tags).toEqual(['grant:passive-points']);
  expect(node('40').section).toBe('bloodline-king-in-the-mists');
});

test('a Path of the X node opens that class start as a root instead of linking across the tree', () => {
  expect(node('33')).toMatchObject({ section: 'ascendant', kind: 'notable', roots: ['20'] });
  expect(Object.keys(node('33'))).toEqual(['id', 'section', 'kind', 'name', 'roots']);
  expect(tree.nodes.filter((n) => n.roots)).toHaveLength(1);
  const bad = structuredClone(data);
  bad.nodes[33].out = ['12']; // 12 isn't beside a class start
  expect(() => convert(bad, pin)).toThrow(/33 > 12 crosses sections/);
});

test('sections, groups, pools and URL index tables', () => {
  expect(tree.sections.map((s) => s.id)).toEqual(['main', 'ascendant', 'juggernaut', 'bloodline-king-in-the-mists']);
  // The port is the ascendancy's own start (30), not the class start (10).
  expect(tree.sections[1]).toMatchObject({ pool: 'ascendancy', active: { group: 'ascendancy' }, req: { start: '10' }, ports: ['30'] });
  expect(tree.sections[2].req).toEqual({ start: '20' });
  expect(tree.sections[2].ports).toBeUndefined(); // no Juggernaut nodes in this export
  expect(tree.sections[3].req).toBeUndefined();
  expect(tree.groups).toEqual([
    { id: 'ascendancy', pick: { max: 1 }, members: { sections: ['ascendant', 'juggernaut'] } },
    { id: 'bloodline', pick: { max: 1 }, members: { sections: ['bloodline-king-in-the-mists'] } },
    { id: 'mastery-13', pick: { max: 1 }, unique: true, members: { options: '13' } },
    { id: 'choice-31', pick: { max: 1 }, members: { nodes: ['32'] } },
  ]);
  expect(tree.pools[0].budget).toEqual({ perLevelFrom: [2, 1, 100], bonuses: [{ flag: 'quest:passive-points', points: 24 }] });
  expect(tree.ext.poe1).toEqual({
    classes: [
      { name: 'Scion', start: '10', ascendancies: ['ascendant'] },
      { name: 'Marauder', start: '20', ascendancies: ['juggernaut'] },
    ],
    bloodlines: ['bloodline-king-in-the-mists'],
  });
});

test('links are deduped; cross-section and dropped-node links removed', () => {
  expect(tree.edges.map((e) => `${e.from}>${e.to}`)).toEqual(['10>11', '11>12', '12>13', '12>14', '14>21', '20>21', '30>31', '30>33', '31>32']);
});

test('polar layout with arcs, hidden mastery links and orbit tables', () => {
  expect(layout).toMatchObject({ app: 'lmg-tree-layout', tree: 'poe1-9.9.9', skin: 'default', space: { w: 1000, h: 1000, unit: 'u' } });
  expect(layout.nodes['12']).toEqual({ group: '1', orbit: 2, slot: 2 });
  expect(layout.edges).toEqual({
    '11>12': { path: 'arc', center: [0, 0], radius: 162 },
    '12>13': { hidden: true },
    '31>32': { path: 'arc', center: [500, 500], radius: 162 },
  });
  expect(layout.sections.main).toEqual({
    mode: 'polar',
    origin: [100, 200],
    polar: {
      radii: data.constants.orbitRadii,
      slots: data.constants.skillsPerOrbit,
      groups: { 1: [0, 0], 2: [100.123, -50] },
      angles: unevenAngles(data.constants.skillsPerOrbit),
    },
  });
  expect(layout.sections.ascendant.polar.groups).toEqual({ 3: [500, 500] });
  expect(Object.keys(unevenAngles(data.constants.skillsPerOrbit))).toEqual(['2', '3', '4']);
  const angles = orbitAngles(data.constants.skillsPerOrbit);
  expect(angles.map((a) => a.length)).toEqual([1, 6, 16, 16, 40, 72, 72]);
  expect(angles[2][2]).toBe(45);
  expect(angles[4][5]).toBe(45);
  expect(angles[5][1]).toBe(5);
});

test('stat lines keep text and pull out numbers per rank', () => {
  expect(statLine('Adds 1 to 3.5 Fire Damage')).toEqual({ id: 'Adds # to # Fire Damage', text: 'Adds {0} to {1} Fire Damage', values: [[1, 3.5]] });
  expect(statLine('Life cannot be Recovered')).toEqual({ id: 'Life cannot be Recovered', text: 'Life cannot be Recovered' });
});
