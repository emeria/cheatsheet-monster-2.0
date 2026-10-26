import { migrateBuild } from './treeMigrate';

const from = {
  id: 'poe1-1.0',
  name: 'PoE 1.0',
  patch: '1.0',
  game: 'poe1',
  pools: [{ id: 'passive' }],
  sections: [{ id: 'main' }, { id: 'slayer' }, { id: 'old-asc' }],
  nodes: [{ id: '1', start: true }, { id: '10' }, { id: '11' }, { id: '12', options: [{ id: 'a' }, { id: 'b' }] }, { id: '13' }],
  ext: { poe1: { classes: [{ name: 'Duelist', start: '1' }] } },
};
const to = {
  id: 'poe1-2.0',
  name: 'PoE 2.0',
  patch: '2.0',
  game: 'poe1',
  pools: [{ id: 'passive' }],
  sections: [{ id: 'main' }, { id: 'slayer' }],
  nodes: [{ id: '5', start: true }, { id: '10' }, { id: '21' }, { id: '12', options: [{ id: 'a' }] }],
  renames: { 11: '21' },
  ext: { poe1: { classes: [{ name: 'Duelist', start: '5' }] } },
};

test('moves a build onto a newer tree: class by name, renames, and every drop listed', () => {
  const build = {
    app: 'lmg-tree-build',
    v: 1,
    tree: 'poe1-1.0',
    start: '1',
    picks: { ascendancy: 'slayer', bloodline: 'old-asc' },
    ranks: { 10: 1, 11: 1, 12: 1, 13: 1 },
    options: { 12: 'b' },
    steps: [{ node: '13' }, { node: '11' }],
    _url: { version: 6 },
  };
  const { build: out, warnings } = migrateBuild(build, from, to);
  expect(out).toEqual({
    app: 'lmg-tree-build',
    v: 1,
    tree: 'poe1-2.0',
    start: '5',
    picks: { ascendancy: 'slayer' },
    ranks: { 10: 1, 12: 1, 21: 1 },
    steps: [{ node: '21' }],
  });
  expect(warnings).toEqual([
    "Dropped bloodline old-asc: it isn't on PoE 2.0.",
    'Dropped nodes not on PoE 2.0: 13.',
    'Dropped choice b on 12: that option is gone.',
  ]);
});

test('says to check the tree even when nothing was dropped, and refuses other games', () => {
  const { warnings } = migrateBuild({ tree: 'poe1-1.0', start: '1', ranks: { 10: 1 } }, from, to);
  expect(warnings).toEqual(['Moved from 1.0 to 2.0; check the tree, since nodes may have changed.']);
  expect(() => migrateBuild({ start: '1' }, from, { ...to, game: 'poe2' })).toThrow("Can't move a poe1 build");
  expect(() => migrateBuild({ start: '1' }, from, { ...to, ext: { poe1: { classes: [] } }, nodes: [] })).toThrow('(Duelist) isn');
});
