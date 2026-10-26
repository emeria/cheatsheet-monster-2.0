import fs from 'fs';
import path from 'path';
import { importPoeBuild } from './poeImport';
import { deflatePobXml, findBuildSite, inflatePobCode } from './pobBuild';
import { encodeTreeUrl } from './poeTreeUrl';
import { pickTree } from './treeVersions';

const dir = path.join(import.meta.dirname, '..', 'data', 'trees');
const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const versions = read('versions.json');
const loadTree = async (id) => read(versions.games[id.split('-')[0]].trees.find((t) => t.id === id).tree);
const poe1 = read(versions.games.poe1.trees.at(-1).tree);
const poe2 = read(versions.games.poe2.trees.at(-1).tree);

// The first few nodes out from a start, along links, in one section.
function walk(tree, start, count) {
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const seen = [start];
  for (let i = 0; seen.length <= count && i < seen.length; i++) {
    for (const e of tree.edges) {
      const other = e.from === seen[i] ? e.to : e.to === seen[i] ? e.from : null;
      if (other && !seen.includes(other) && byId.get(other).section === 'main' && !byId.get(other).start) seen.push(other);
    }
  }
  return seen.slice(1, count + 1);
}

const duelist = poe1.ext.poe1.classes.findIndex((c) => c.name === 'Duelist');
const duelistPath = walk(poe1, poe1.ext.poe1.classes[duelist].start, 6);
const mastery = poe1.nodes.find((n) => n.kind === 'mastery');

const poe1Xml = `<?xml version="1.0" encoding="UTF-8"?>
<PathOfBuilding>
  <Build level="92" className="Duelist" ascendClassName="Slayer"/>
  <Tree activeSpec="2">
    <Spec title="Leveling" treeVersion="3_20" classId="${duelist}" ascendClassId="0" nodes="${poe1.ext.poe1.classes[duelist].start},${duelistPath.slice(0, 2).join(',')}"/>
    <Spec title="Endgame" treeVersion="3_29" classId="${duelist}" ascendClassId="1" secondaryAscendClassId="2"
      nodes="${[poe1.ext.poe1.classes[duelist].start, ...duelistPath, mastery.id, 65600, 1].join(',')}"
      masteryEffects="{${mastery.id},${mastery.options[0].id}},{${mastery.id},99999}">
      <URL>https://www.pathofexile.com/passive-skill-tree/AAAA</URL>
      <Sockets><Socket nodeId="26725" itemId="3"/><Socket nodeId="36634" itemId="0"/></Sockets>
    </Spec>
  </Tree>
</PathOfBuilding>`;

test('a PoB code round-trips through deflate and inflate', async () => {
  expect(await inflatePobCode(await deflatePobXml(poe1Xml))).toBe(poe1Xml);
  await expect(inflatePobCode('not a code!')).rejects.toThrow('not base64');
  await expect(inflatePobCode('AAAA')).rejects.toThrow('does not unpack');
});

test('imports every PoE1 tree set from a PoB code, on the right tree version', async () => {
  const result = await importPoeBuild(await deflatePobXml(poe1Xml), { versions, loadTree });
  expect(result).toMatchObject({ game: 'poe1', source: 'Path of Building', active: 1 });
  const [leveling, endgame] = result.builds;
  expect(leveling.build).toMatchObject({ name: 'Leveling', tree: poe1.id, ranks: Object.fromEntries(duelistPath.slice(0, 2).map((id) => [id, 1])) });
  expect(leveling.build.picks).toBeUndefined();
  expect(leveling.warnings[0]).toContain('No poe1 3_20 tree is imported');

  const { build, warnings } = endgame;
  expect(build).toMatchObject({
    app: 'lmg-tree-build',
    name: 'Endgame',
    context: { level: 92 },
    start: poe1.ext.poe1.classes[duelist].start,
    picks: { ascendancy: 'slayer', bloodline: poe1.ext.poe1.bloodlines[1] },
    options: { [mastery.id]: mastery.options[0].id },
    ext: { poe1: { clusterNodes: ['65600'] } },
  });
  expect(Object.keys(build.ranks).sort()).toEqual([...duelistPath, mastery.id].sort());
  expect(warnings).toEqual([
    'Dropped node ids not on this tree: 1.',
    '1 cluster jewel nodes are kept but not shown yet.',
    '1 socketed jewels are not imported (only the tree is).',
    `Dropped mastery effect 99999 on node ${mastery.id}.`,
  ]);
});

test('reads a PoB build file as XML, and PoE2 trees with ascendancy, attributes and weapon sets', async () => {
  const monk = poe2.ext.poe2.classes.findIndex((c) => c.name === 'Monk');
  const cls = poe2.ext.poe2.classes[monk];
  const steps = walk(poe2, cls.start, 8);
  const attribute = poe2.nodes.find((n) => n.kind === 'attribute');
  const xml = `<PathOfBuilding2><Build level="70" className="Monk"/><Tree activeSpec="1">
    <Spec title="Main" treeVersion="0_5" classId="${monk}" ascendClassId="3" ascendancyInternalId="${cls.ascendancyIds[2]}"
      nodes="${[cls.start, ...steps, attribute.id].join(',')}">
      <WeaponSet1 nodes="${steps[6]}"/><WeaponSet2 nodes="${steps[7]}"/>
      <Overrides><AttributeOverride strNodes="" dexNodes="${attribute.id}" intNodes=""/></Overrides>
    </Spec></Tree></PathOfBuilding2>`;
  const { game, builds } = await importPoeBuild(xml, { versions, loadTree });
  expect(game).toBe('poe2');
  expect(builds[0].warnings).toEqual([]);
  expect(builds[0].build).toMatchObject({
    tree: poe2.id,
    start: cls.start,
    picks: { ascendancy: cls.ascendancies[2] },
    options: { [attribute.id]: 'dex' },
    paidFrom: { [steps[6]]: 'ws1', [steps[7]]: 'ws2' },
  });
});

test('build-site links download the code; blocked downloads say what to do instead', async () => {
  const code = await deflatePobXml(poe1Xml);
  const fetchFn = vi.fn(async () => ({ ok: true, text: async () => `${code}\n` }));
  const result = await importPoeBuild('https://pobb.in/Ab12-cd', { versions, loadTree, fetchFn });
  expect(fetchFn).toHaveBeenCalledWith('https://pobb.in/pob/Ab12-cd');
  expect(result.source).toBe('pobb.in');
  expect(result.builds).toHaveLength(2);

  const blocked = vi.fn(async () => {
    throw new TypeError('Failed to fetch');
  });
  await expect(importPoeBuild('https://poe.ninja/poe1/pob/xyz', { versions, loadTree, fetchFn: blocked })).rejects.toThrow('paste it here instead');
  await expect(importPoeBuild('https://example.com/build', { versions, loadTree })).rejects.toThrow("isn't one this tool reads");
});

test('knows the raw code URL for every build site PoB imports from', () => {
  const cases = {
    'https://pobb.in/abc': 'https://pobb.in/pob/abc',
    'https://poe.ninja/pob/abc': 'https://poe.ninja/poe1/pob/raw/abc',
    'https://poe.ninja/poe2/pob/abc': 'https://poe.ninja/poe2/pob/raw/abc',
    'https://maxroll.gg/poe/pob/abc': 'https://maxroll.gg/poe/api/pob/abc',
    'https://maxroll.gg/poe2/pob/abc': 'https://maxroll.gg/poe2/api/pob/abc',
    'https://pob.codes/b/abc': 'https://api.pob.codes/abc/raw',
    'https://poedb.tw/pob/abc': 'https://poedb.tw/pob/abc/raw',
    'https://poe2db.tw/pob/abc': 'https://poe2db.tw/pob/abc/raw',
    'https://pastebin.com/abc': 'https://pastebin.com/raw/abc',
    'https://rentry.co/abc': 'https://rentry.co/paste/abc/raw',
  };
  for (const [link, raw] of Object.entries(cases)) expect(findBuildSite(link)?.rawUrl).toBe(raw);
});

test('official tree links pick the tree by the patch in the link', async () => {
  const build = { start: poe1.ext.poe1.classes[duelist].start, ranks: Object.fromEntries(duelistPath.map((id) => [id, 1])) };
  const url = encodeTreeUrl(build, poe1, { prefix: `https://www.pathofexile.com/passive-skill-tree/${poe1.patch}/` });
  const result = await importPoeBuild(url, { versions, loadTree });
  expect(result.builds[0].warnings).toEqual([]);
  expect(result.builds[0].build).toMatchObject({ tree: poe1.id, ...build });
  const old = await importPoeBuild(url.replace(poe1.patch, '3.10.0'), { versions, loadTree });
  expect(old.builds[0].warnings[0]).toContain('No poe1 3.10.0 tree is imported');
});

test('poeplanner links decode onto the latest tree', async () => {
  const le16 = (n) => [n & 255, n >> 8];
  const nodes = duelistPath.slice(0, 3).map(Number);
  const bytes = [
    ...le16(1), 0, 0, // serialization version, build type, isPoE2
    ...le16(1), ...le16(42), duelist, 1, 0, // tree: serialization, planner tree version, class, ascendancy, bandit
    ...le16(nodes.length), ...nodes.flatMap(le16),
    ...le16(0), // cluster nodes
    ...le16(1), ...le16(Number(poe1.nodes.find((n) => n.section === 'slayer' && !n.start).id)),
    ...le16(1), ...le16(Number(mastery.id)), ...le16(Number(mastery.options[0].id)),
  ];
  const url = `https://poeplanner.com/${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_')}`;
  const { game, builds } = await importPoeBuild(url, { versions, loadTree });
  expect(game).toBe('poe1');
  expect(builds[0].warnings).toEqual([`poeplanner tree version 42 can't be matched to a patch; using ${poe1.patch}.`]);
  expect(builds[0].build).toMatchObject({ picks: { ascendancy: 'slayer' }, options: { [mastery.id]: mastery.options[0].id } });
  expect(Object.keys(builds[0].build.ranks)).toHaveLength(5);
});

test('picks a tree by patch: exact, same minor, then latest with a warning', () => {
  const v = { games: { poe1: { latest: 'poe1-3.29.1', trees: [{ id: 'poe1-3.28.0', patch: '3.28.0' }, { id: 'poe1-3.29.0', patch: '3.29.0' }, { id: 'poe1-3.29.1', patch: '3.29.1' }] } } };
  expect(pickTree(v, 'poe1', '3.29.0')).toMatchObject({ id: 'poe1-3.29.0', warnings: [] });
  expect(pickTree(v, 'poe1', '3_29')).toMatchObject({ id: 'poe1-3.29.1', warnings: [] });
  expect(pickTree(v, 'poe1', '3_28')).toMatchObject({ id: 'poe1-3.28.0', warnings: [] });
  expect(pickTree(v, 'poe1', '3_29_ruthless').warnings[0]).toContain('ruthless tree');
  expect(pickTree(v, 'poe1', '3_20').warnings[0]).toContain('using 3.29.1');
  expect(pickTree(v, 'poe1').warnings[0]).toContain('No tree version given');
  expect(() => pickTree(v, 'poe2', '0_5')).toThrow('No poe2 trees');
});

test('Maxroll PoE2 planner JSON replays history with respecs, one build per variant', async () => {
  const cls = poe2.ext.poe2.classes.find((c) => c.name === 'Monk');
  const steps = walk(poe2, cls.start, 6);
  const attribute = poe2.nodes.find((n) => n.kind === 'attribute');
  const profile = {
    game: 'poe2',
    data: JSON.stringify({
      activeProfile: 0,
      profiles: [
        {
          name: 'Leveling',
          ascendancy: cls.ascendancyIds[0],
          level: 40,
          passives: {
            variants: [
              { name: 'Act 1', history: [...steps.slice(0, 4).map(Number), { add: [Number(steps[4]), Number(attribute.id)], remove: [Number(steps[3])] }], attributes: { [attribute.id]: 1 }, jewels: {} },
              { name: 'Act 2', history: steps.slice(0, 2).map(Number), attributes: {} },
            ],
          },
        },
      ],
    }),
  };
  const { game, source, builds } = await importPoeBuild(JSON.stringify(profile), { versions, loadTree });
  expect([game, source]).toEqual(['poe2', 'Maxroll']);
  expect(builds.map((b) => b.build.name)).toEqual(['Leveling: Act 1', 'Leveling: Act 2']);
  expect(builds[0].build).toMatchObject({ start: cls.start, picks: { ascendancy: cls.ascendancies[0] }, context: { level: 40 }, options: { [attribute.id]: 'dex' } });
  expect(builds[0].build.steps.map((s) => s.node)).toEqual([steps[0], steps[1], steps[2], steps[4], attribute.id]);

  const blocked = vi.fn(async () => {
    throw new TypeError('Failed to fetch');
  });
  await expect(importPoeBuild('https://maxroll.gg/poe2/planner/abc123', { versions, loadTree, fetchFn: blocked })).rejects.toThrow(
    'https://planners.maxroll.gg/profiles/poe2/abc123',
  );
});

test('Maxroll PoE1 planner JSON: class from charClass, ascendancy embed, mastery positions', async () => {
  const ranger = poe1.ext.poe1.classes.findIndex((c) => c.name === 'Ranger');
  const cls = poe1.ext.poe1.classes[ranger];
  const steps = walk(poe1, cls.start, 4);
  const pathfinder = poe1.sections.find((s) => s.name === 'Pathfinder');
  const ascNode = poe1.nodes.find((n) => n.section === pathfinder.id && !n.start);
  const profile = {
    game: 'poe',
    data: JSON.stringify({
      embeds: [
        { type: 'ascendancy', ascendancy: 'Pathfinder', steps: [[], [Number(ascNode.id)]] },
        {
          type: 'passives',
          name: 'Tree',
          charClass: 'Dex',
          variants: [{ name: 'End Game', history: [...steps.map(Number), Number(mastery.id)], masteries: { [mastery.id]: 1, 12345: 0 }, jewels: {} }],
        },
      ],
    }),
  };
  const { game, builds } = await importPoeBuild(JSON.stringify(profile), { versions, loadTree });
  expect(game).toBe('poe1');
  expect(builds[0].warnings).toEqual([]);
  expect(builds[0].build).toMatchObject({
    name: 'Tree: End Game',
    start: cls.start,
    picks: { ascendancy: pathfinder.id },
    ranks: Object.fromEntries([...steps, mastery.id, ascNode.id].map((id) => [id, 1])),
    options: { [mastery.id]: mastery.options[1].id },
  });
  expect(builds[0].build.steps.map((s) => s.node)).toEqual([...steps, mastery.id]);
});

test('PoB2 builds find their class by ascendancy id, since PoB2 renumbers classId between versions', async () => {
  const merc = poe2.ext.poe2.classes.find((c) => c.name === 'Mercenary');
  const xml = `<PathOfBuilding2><Build level="80" className="Mercenary"/><Tree activeSpec="1">
    <Spec treeVersion="0_4" classId="0" ascendClassId="2" ascendancyInternalId="${merc.ascendancyIds[1]}" nodes="${merc.start}"/>
  </Tree></PathOfBuilding2>`;
  const { builds } = await importPoeBuild(xml, { versions, loadTree });
  expect(builds[0].build).toMatchObject({ start: merc.start, picks: { ascendancy: merc.ascendancies[1] } });
});
