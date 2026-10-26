import fs from 'fs';
import path from 'path';
import { inflatePobCode, parsePobXml, specToBuild } from './pobBuild';
import { buildToPobXml, encodePobCode } from './pobCode';

const tree = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '../data/trees/poe1-3.29.1.tree.json'), 'utf8'));

const importCode = async (code) => {
  const pob = parsePobXml(await inflatePobCode(code));
  return specToBuild(pob, pob.specs[pob.activeSpec], tree);
};

// A full-size Juggernaut: 89 main-tree nodes outward from the Marauder start, one mastery with
// its first effect, and the ascendancy. Real builds are checked by link in liveBuilds.
function juggernaut() {
  const cls = tree.ext.poe1.classes.find((c) => c.name === 'Marauder');
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const taken = [cls.start];
  for (let i = 0; taken.length <= 90 && i < taken.length; i++) {
    for (const e of tree.edges) {
      const other = e.from === taken[i] ? e.to : e.to === taken[i] ? e.from : null;
      if (other && !taken.includes(other) && byId.get(other).section === 'main' && !byId.get(other).start) taken.push(other);
    }
  }
  const nodes = taken.slice(1, 90);
  // Masteries sit off the path, so take the first one beside a taken notable.
  const near = new Set(nodes);
  const mastery = tree.edges
    .map((e) => (near.has(e.from) ? e.to : near.has(e.to) ? e.from : null))
    .find((id) => id && byId.get(id).kind === 'mastery');
  nodes.push(mastery);
  const options = { [mastery]: byId.get(mastery).options[0].id };
  return { start: cls.start, picks: { ascendancy: 'juggernaut' }, context: { level: 92 }, ranks: Object.fromEntries(nodes.map((id) => [id, 1])), options };
}

test('a full-size build survives export and re-import', async () => {
  const build = juggernaut();
  expect(Object.keys(build.ranks)).toHaveLength(90);
  expect(Object.keys(build.options).length).toBeGreaterThan(0);

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
