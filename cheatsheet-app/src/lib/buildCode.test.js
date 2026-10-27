import { decodeBuild, encodeBuild } from './buildCode';

const tree = { id: 't1', context: { level: { min: 1, max: 60 }, flags: [{ id: 'quest:a' }] } };

test('a build survives the share code, with the tree flags filled in', () => {
  const build = { tree: 't1', start: 's', picks: { asc: 'x' }, ranks: { a: 2, 'b/c': 1 }, options: { m: 'o1' }, context: { level: 40, flags: [] } };
  const code = encodeBuild(build);
  expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(decodeBuild(code, tree)).toEqual({
    app: 'lmg-tree-build',
    v: 1,
    tree: 't1',
    start: 's',
    picks: { asc: 'x' },
    ranks: { a: 2, 'b/c': 1 },
    options: { m: 'o1' },
    context: { level: 40, flags: ['quest:a'] },
  });
});

test('empty parts are left out and the level defaults to the max', () => {
  const code = encodeBuild({ tree: 't1', ranks: {}, picks: {} });
  expect(JSON.parse(atob(code))).toEqual({ t: 't1' });
  expect(decodeBuild(code, tree)).toMatchObject({ ranks: {}, context: { level: 60 } });
});

test('a code for another tree or a broken code gives null', () => {
  expect(decodeBuild(encodeBuild({ tree: 'other', ranks: { a: 1 } }), tree)).toBeNull();
  expect(decodeBuild('%%%', tree)).toBeNull();
  expect(decodeBuild('bm90IGpzb24', tree)).toBeNull();
});
