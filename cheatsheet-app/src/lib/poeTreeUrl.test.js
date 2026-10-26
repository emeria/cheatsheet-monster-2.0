import { decodeTreeUrl, encodeTreeUrl, DEFAULT_PREFIX } from './poeTreeUrl';
import poe1 from '../data/trees/poe1-3.29.1.tree.json';

// A tiny tree in the importer's output shape.
const tree = {
  id: 'poe1-test',
  nodes: [
    { id: '100', kind: 'start', start: true, noPath: true },
    { id: '200', kind: 'start', start: true, noPath: true },
    { id: '300', kind: 'start', start: true, granted: true },
    { id: '1' },
    { id: '258' },
    { id: '65535' },
    { id: '700', kind: 'mastery', noPath: true, options: [{ id: '4660' }, { id: '17' }] },
  ],
  ext: {
    poe1: {
      classes: [
        { name: 'Scion', start: '100', ascendancies: ['ascendant'] },
        { name: 'Marauder', start: '200', ascendancies: ['juggernaut', 'berserker', 'chieftain'] },
      ],
      bloodlines: ['bloodline-a', 'bloodline-b', 'bloodline-c', 'bloodline-d', 'bloodline-e'],
    },
  },
};

const code = (bytes, padded = false) => {
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_');
  return padded ? b64 : b64.replace(/=+$/, '');
};

// v6 Marauder, Berserker + bloodline 5, nodes in a non-sorted order, one cluster node, one mastery.
const v6 = [0, 0, 0, 6, 1, (5 << 2) | 2, 4, 0x01, 0x02, 0x00, 0x01, 0x02, 0xbc, 0xff, 0xff, 1, 0x00, 0x09, 1, 0x12, 0x34, 0x02, 0xbc];

test('decodes class, ascendancy, bloodline, nodes, clusters and masteries', () => {
  const { build, warnings } = decodeTreeUrl(`${DEFAULT_PREFIX}${code(v6)}`, tree);
  expect(warnings).toEqual([]);
  expect(build).toMatchObject({
    app: 'lmg-tree-build',
    tree: 'poe1-test',
    start: '200',
    picks: { ascendancy: 'berserker', bloodline: 'bloodline-e' },
    ranks: { 1: 1, 258: 1, 700: 1, 65535: 1 },
    options: { 700: '4660' },
    ext: { poe1: { clusterNodes: ['65545'] } },
  });
});

test('encodes an unchanged build back to the same URL, byte for byte', () => {
  for (const url of [
    `${DEFAULT_PREFIX}${code(v6)}`,
    `${DEFAULT_PREFIX}${code(v6, true)}`,
    `https://www.pathofexile.com/fullscreen-passive-skill-tree/3.29.1/${code(v6)}?accountName=a&characterName=b`,
  ]) {
    expect(encodeTreeUrl(decodeTreeUrl(url, tree).build, tree)).toBe(url);
  }
});

test('round-trips v4 and v5 links in their own version', () => {
  const v4 = [0, 0, 0, 4, 0, 1, 1, 0x00, 0x01, 0x01, 0x02];
  const v5 = [0, 0, 0, 5, 0, 0, 2, 0x01, 0x02, 0x00, 0x01, 0];
  for (const bytes of [v4, v5]) {
    const url = `${DEFAULT_PREFIX}${code(bytes)}`;
    expect(encodeTreeUrl(decodeTreeUrl(url, tree).build, tree)).toBe(url);
  }
  expect(decodeTreeUrl(`${DEFAULT_PREFIX}${code(v4)}`, tree).build.picks).toEqual({ ascendancy: 'ascendant' });
});

test('a new build encodes as v6 in ascending order and decodes back', () => {
  const build = { start: '100', picks: { ascendancy: 'ascendant' }, ranks: { 258: 1, 1: 1, 100: 1, 300: 1, 700: 1 }, options: { 700: '17' } };
  const url = encodeTreeUrl(build, tree);
  expect(url.startsWith(DEFAULT_PREFIX)).toBe(true);
  const back = decodeTreeUrl(url, tree).build;
  expect(back._url.order).toEqual(['1', '258', '700']);
  expect(back).toMatchObject({ start: '100', picks: { ascendancy: 'ascendant' }, ranks: { 1: 1, 258: 1, 700: 1 }, options: { 700: '17' } });
});

test('drops unknown ids with a warning listing them', () => {
  const bytes = [0, 0, 0, 6, 0, 0, 2, 0x00, 0x01, 0x00, 0x02, 0, 1, 0x00, 0x05, 0x02, 0xbc];
  const { build, warnings } = decodeTreeUrl(`${DEFAULT_PREFIX}${code(bytes)}`, tree);
  expect(build.ranks).toEqual({ 1: 1 });
  expect(build.options).toBeUndefined();
  expect(warnings).toEqual(['Dropped unknown node ids: 2.', 'Dropped unknown mastery effect 5 on node 700.']);
});

test('round-trips every class and ascendancy on the imported PoE1 tree', () => {
  const mastery = poe1.nodes.find((n) => n.kind === 'mastery' && n.options?.length);
  const small = poe1.nodes.filter((n) => n.section === 'main' && !n.kind).slice(0, 40).map((n) => n.id);
  for (const cls of poe1.ext.poe1.classes) {
    for (const ascendancy of cls.ascendancies) {
      const build = {
        start: cls.start,
        picks: { ascendancy, bloodline: poe1.ext.poe1.bloodlines.at(-1) },
        ranks: Object.fromEntries([...small, mastery.id].map((id) => [id, 1])),
        options: { [mastery.id]: mastery.options[0].id },
      };
      const { build: back, warnings } = decodeTreeUrl(encodeTreeUrl(build, poe1), poe1);
      expect(warnings).toEqual([]);
      expect(back).toMatchObject({ tree: poe1.id, ...build });
    }
  }
});

test('refuses bad links and builds it cannot encode', () => {
  expect(() => decodeTreeUrl(`${DEFAULT_PREFIX}${code([0, 0, 0, 7, 0, 0, 0])}`, tree)).toThrow('version 7');
  expect(() => decodeTreeUrl(`${DEFAULT_PREFIX}${code([0, 0, 0, 6, 9, 0, 0])}`, tree)).toThrow('unknown class 9');
  expect(() => decodeTreeUrl(`${DEFAULT_PREFIX}${code([0, 0, 0, 6, 0, 0, 3, 0, 1])}`, tree)).toThrow('cut short');
  expect(() => decodeTreeUrl(`${DEFAULT_PREFIX}%%%`, tree)).toThrow('not base64');
  expect(() => encodeTreeUrl({ start: '1', ranks: {} }, tree)).toThrow('not a class start');
  expect(() => encodeTreeUrl({ start: '100', picks: { ascendancy: 'slayer' }, ranks: {} }, tree)).toThrow('not a Scion ascendancy');
  expect(() => encodeTreeUrl({ start: '100', ranks: {}, options: { 700: '17' } }, tree, { version: 5 })).toThrow("can't hold");
});
