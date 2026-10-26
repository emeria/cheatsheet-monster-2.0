import fs from 'fs';
import path from 'path';
import { inflatePobCode, parsePobXml, specToBuild } from './pobBuild';
import { buildToPobXml, encodePobCode } from './pobCode';

const tree = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../data/trees/poe1-3.29.1.tree.json'), 'utf8'));
// Maxroll's Boneshatter Juggernaut guide build, from https://pobb.in/4IE2ysIuCdPP/raw.
const realCode = fs.readFileSync(path.join(import.meta.dirname, 'fixtures/pobbin-4IE2ysIuCdPP.txt'), 'utf8');

const importCode = async (code) => {
  const pob = parsePobXml(await inflatePobCode(code));
  return specToBuild(pob, pob.specs[pob.activeSpec], tree);
};

test('a real pobb.in build survives export and re-import', async () => {
  const { build } = await importCode(realCode);
  expect(build.picks.ascendancy).toBe('juggernaut');
  expect(Object.keys(build.ranks).length).toBeGreaterThan(80);
  expect(build.options['64128']).toBe('34383');

  const { code } = await encodePobCode(build, tree);
  const again = await importCode(code);
  expect(again.build.start).toBe(build.start);
  expect(again.build.picks).toEqual(build.picks);
  expect(again.build.ranks).toEqual(build.ranks);
  expect(again.build.options).toEqual(build.options);
  expect(again.build.context).toEqual(build.context);
});

test('writes the Spec the way PoB saves it', () => {
  const marauder = tree.ext.poe1.classes.findIndex((c) => c.name === 'Marauder');
  const build = {
    start: tree.ext.poe1.classes[marauder].start,
    picks: { ascendancy: 'berserker' },
    context: { level: 90 },
    ranks: { 64128: 1, 23471: 1, 999999: 0 },
    options: { 64128: '34383' },
  };
  const { xml } = buildToPobXml(build, tree, { title: 'A & B' });
  expect(xml).toContain('<Build level="90" targetVersion="3_0" className="Marauder" ascendClassName="Berserker" viewMode="TREE"/>');
  expect(xml).toContain(
    `<Spec title="A &amp; B" treeVersion="3_29" classId="${marauder}" ascendClassId="2" secondaryAscendClassId="0" nodes="23471,64128" masteryEffects="{64128,34383}"/>`,
  );
});

test('refuses builds the tree link numbering cannot express', () => {
  const start = tree.ext.poe1.classes[0].start;
  expect(() => buildToPobXml({ start: 'nope', ranks: {} }, tree)).toThrow('not a class start');
  expect(() => buildToPobXml({ start, picks: { ascendancy: 'juggernaut' }, ranks: {} }, tree)).toThrow('not a Scion ascendancy');
});

test('warns that cluster nodes are left out', () => {
  const start = tree.ext.poe1.classes[0].start;
  const { warnings } = buildToPobXml({ start, ranks: {}, ext: { poe1: { clusterNodes: ['65600'] } } }, tree);
  expect(warnings).toEqual(['Cluster jewel nodes are not exported.']);
});
