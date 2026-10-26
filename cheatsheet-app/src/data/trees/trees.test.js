import fs from 'fs';
import path from 'path';

// Structural checks on the hand-authored tree data. The rules engine lives in lmg-tree-kit;
// these only catch typos (bad ids, overlapping cells, arrows that skip over a talent).
const read = (file) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, file), 'utf8'));

describe('poe1-3.29.1', () => {
  const tree = read('poe1-3.29.1.tree.json');
  const layout = read('poe1-3.29.1.default.layout.json');
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));

  it('links only nodes that exist, once each', () => {
    const keys = new Set(tree.edges.map((e) => `${e.from}>${e.to}`));
    expect(keys.size).toBe(tree.edges.length);
    for (const e of tree.edges) expect(byId.has(e.from) && byId.has(e.to)).toBe(true);
    for (const key of Object.keys(layout.edges)) expect(keys.has(key)).toBe(true);
  });

  it('places every node on a group, orbit and slot its section knows', () => {
    expect(Object.keys(layout.nodes).sort()).toEqual([...byId.keys()].sort());
    for (const [id, at] of Object.entries(layout.nodes)) {
      const { polar } = layout.sections[byId.get(id).section];
      expect(polar.groups[at.group]).toBeDefined();
      expect(at.slot).toBeLessThan(polar.slots[at.orbit]);
    }
  });

  it('indexes every class start and ascendancy for the URL adapter', () => {
    for (const c of tree.ext.poe1.classes) {
      expect(byId.get(c.start).start).toBe(true);
      for (const a of c.ascendancies) expect(tree.sections.map((s) => s.id)).toContain(a);
    }
  });

  it('keeps each ascendancy to its class', () => {
    for (const c of tree.ext.poe1.classes) {
      for (const a of c.ascendancies) expect(tree.sections.find((s) => s.id === a).req).toEqual({ start: c.start });
    }
  });

  it('opens class starts from the Ascendant instead of linking across the tree', () => {
    const paths = tree.nodes.filter((n) => n.roots);
    expect(paths.map((n) => n.name).sort()).toEqual(['Duelist', 'Marauder', 'Ranger', 'Shadow', 'Templar', 'Witch'].map((c) => `Path of the ${c}`));
    const classStart = new Map(tree.ext.poe1.classes.map((c) => [c.name, c.start]));
    for (const n of paths) expect(n.roots).toEqual([classStart.get(n.name.replace('Path of the ', ''))]);
  });
});

// Shared by every PoE tree: ascendancies hang off their own granted start, never off the main tree.
describe.each(['poe1-3.25.3d', 'poe1-3.29.1', 'poe2-0.5.2'])('%s', (id) => {
  const tree = read(`${id}.tree.json`);
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));

  it('has no link across sections', () => {
    for (const e of tree.edges) expect(byId.get(e.from).section).toBe(byId.get(e.to).section);
  });

  it('names only class starts in roots', () => {
    const starts = new Set(tree.nodes.filter((n) => n.start && !n.granted).map((n) => n.id));
    const paths = tree.nodes.filter((n) => n.roots);
    expect(paths.length).toBeGreaterThan(0);
    for (const n of paths) {
      expect(n.section).not.toBe('main');
      for (const r of n.roots) expect(starts.has(r)).toBe(true);
    }
  });
});

describe('wow-classic-warrior', () => {
  const tree = read('wow-classic-warrior.tree.json');
  const layout = read('wow-classic-warrior.default.layout.json');
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const sections = tree.sections.map((s) => s.id);

  it('has unique node ids in known sections', () => {
    expect(byId.size).toBe(tree.nodes.length);
    for (const n of tree.nodes) expect(sections).toContain(n.section);
  });

  it('puts each talent in its own cell of a 4 x 7 grid', () => {
    const cells = new Set();
    for (const n of tree.nodes) {
      expect(n.tier).toBeGreaterThanOrEqual(1);
      expect(n.tier).toBeLessThanOrEqual(7);
      expect(n.col).toBeGreaterThanOrEqual(1);
      expect(n.col).toBeLessThanOrEqual(4);
      const key = `${n.section}:${n.tier}:${n.col}`;
      expect(cells.has(key)).toBe(false);
      cells.add(key);
    }
  });

  it('draws arrows straight down a column through empty cells', () => {
    const at = new Set(tree.nodes.map((n) => `${n.section}:${n.tier}:${n.col}`));
    for (const e of tree.edges) {
      const from = byId.get(e.from);
      const to = byId.get(e.to);
      expect(from && to).toBeTruthy();
      expect(e.type).toBe('arrow');
      expect(to.section).toBe(from.section);
      expect(to.col).toBe(from.col);
      expect(to.tier).toBeGreaterThan(from.tier);
      for (let t = from.tier + 1; t < to.tier; t++) expect(at.has(`${from.section}:${t}:${from.col}`)).toBe(false);
    }
  });

  it('gives a stat value for every rank', () => {
    for (const n of tree.nodes) {
      for (const s of n.stats) {
        if (!s.values) continue;
        expect(s.values).toHaveLength(n.ranks ?? 1);
        expect(s.text).toContain('{0}');
      }
    }
  });

  it('has one 31-point capstone per tree and 51 points at level 60', () => {
    const [first, perLevel, last] = tree.pools[0].budget.perLevelFrom;
    const at = (level) => Math.max(0, Math.min(level, last) - first + 1) * perLevel;
    expect(at(60)).toBe(51);
    expect(at(40)).toBe(31);
    for (const id of sections) {
      const capstones = tree.nodes.filter((n) => n.section === id && n.tier === 7);
      expect(capstones).toHaveLength(1);
      expect(tree.sections.find((s) => s.id === id).tiers.gate[6]).toBe(30);
    }
    expect(byId.get('mortal-strike').section).toBe('arms');
  });

  it('has a grid layout for every section', () => {
    expect(layout.tree).toBe(tree.id);
    for (const id of sections) expect(layout.sections[id].mode).toBe('grid');
  });
});
