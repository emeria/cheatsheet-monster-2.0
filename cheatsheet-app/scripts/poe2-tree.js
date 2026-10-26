// Converts GGG's PoE2 passive tree export (github.com/grindinggear/poe2-skilltree-export)
// into lmg-tree-kit files. Run it through scripts/import-poe-trees.js, which pins the version.
//
// Differences from the PoE1 export that shape this file:
// - Nodes carry absolute x/y, so the layout is `absolute`; arcs come with their centre.
// - Attribute nodes ("+5 to any Attribute") are a choice of str, dex or int.
// - Weapon set points: main-tree nodes can be paid from the passive pool or either set's pool.
// - Some nodes only unlock with an ascendancy picked and another node taken (unlockConstraint).
// - Masteries have no effects; they are decoration and are left out.
// Not converted yet: skillOverrides (alternate ascendancies that rewrite nodes, e.g. Abyssal Lich),
// and ascendancies the export lists without a name or under a class with none (unreleased).
const { statLine: plainStatLine } = require('./import-poe1-tree');

// Point totals aren't in this export. Community sources: 24 quest points, 24 weapon set
// points per set and 8 ascendancy points. Check these against the game each patch.
const QUEST_POINTS = 24;
const WEAPON_SET_POINTS = 24;
const ASCENDANCY_POINTS = 8;

const NODE_KEYS = ['id', 'section', 'kind', 'name', 'icon', 'cost', 'tags', 'stats', 'req', 'options', 'granted', 'start', 'noPath', 'roots', 'socket'];

const round = (x) => Math.round(x * 1000) / 1000;
const byNumber = (a, b) => Number(a) - Number(b);
const slug = (s) => s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// "[Remnant|Remnants] you create" -> "Remnants you create"; "[Shock]" -> "Shock".
const plain = (line) => line.replace(/\[(?:[^\]|]*\|)?([^\]]*)\]/g, '$1');
const statLine = (line) => plainStatLine(plain(line));

const TAG_WORDS = [
  ['dmg:fire', /\bfire\b/i],
  ['dmg:cold', /\bcold\b/i],
  ['dmg:lightning', /\blightning\b/i],
  ['dmg:chaos', /\bchaos\b/i],
  ['dmg:physical', /\bphysical\b/i],
  ['role:defence', /\b(maximum life|energy shield|armour|evasion|block|resistances?)\b/i],
];

const ATTRIBUTES = [
  ['str', 'Strength'],
  ['dex', 'Dexterity'],
  ['int', 'Intelligence'],
];

function convert(data, pin) {
  const treeId = `poe2-${pin.tag}`;
  const sections = [{ id: 'main', name: 'Passive tree', kind: 'tree', pool: ['passive', 'ws1', 'ws2'], connectivity: 'path', active: 'always' }];
  const sectionOf = new Map(); // ascendancyId -> section id

  const starts = new Map(); // class index -> start node id
  const ascStart = new Map(); // ascendancyId -> its start node id
  for (const [id, n] of Object.entries(data.nodes)) {
    for (const i of [].concat(n.classStartIndex ?? [])) starts.set(i, id);
    if (n.isAscendancyStart && n.ascendancyId && n.x !== undefined) ascStart.set(n.ascendancyId, id);
  }
  const poeClasses = data.classes.map((c, i) => {
    const asc = (c.ascendancies || [])
      .filter((a) => a.name && !a.overridePairs?.length && !Object.keys(a.overridePairs || {}).length)
      .map((a) => {
        const id = slug(a.name);
        sectionOf.set(a.id, id);
        // Only a class whose start this is can pick the ascendancy. The port is the ascendancy's
        // own start: the kit (viaOf) only honours a port that sits inside the section.
        const section = { id, name: a.name, kind: 'ascendancy', pool: 'ascendancy', connectivity: 'path', active: { group: 'ascendancy' }, req: { start: starts.get(i) } };
        if (ascStart.has(a.id)) section.ports = [ascStart.get(a.id)];
        sections.push(section);
        return { id, source: a.id };
      });
    return { name: c.name, start: starts.get(i), ascendancies: asc.map((a) => a.id), ascendancyIds: asc.map((a) => a.source) };
  });

  const onTree = (id, n) =>
    id !== 'root' && n.x !== undefined && !n.isMastery && !n.isBlighted && (!n.ascendancyId || sectionOf.has(n.ascendancyId));
  const kept = new Map(Object.entries(data.nodes).filter(([id, n]) => onTree(id, n)));
  const ids = [...kept.keys()].sort(byNumber);
  const groups = [{ id: 'ascendancy', pick: { max: 1 }, members: { sections: poeClasses.flatMap((c) => c.ascendancies) } }];

  // Links that cross into an ascendancy are never pathed or drawn. A class start links to its
  // ascendancy start for the game's own drawing. "Path of the X" nodes (the Pathfinder's) link to
  // the main-tree nodes beside X's class start: in game they let the build allocate from that start,
  // so here the node opens that start as a root instead.
  const isClassStart = (x) => x?.classStartIndex !== undefined;
  const adjacent = new Map(); // node id -> linked node ids, both ways
  for (const e of data.edges) {
    const a = String(e.from);
    const b = String(e.to);
    (adjacent.get(a) || adjacent.set(a, new Set()).get(a)).add(b);
    (adjacent.get(b) || adjacent.set(b, new Set()).get(b)).add(a);
  }
  const rootsOf = new Map(); // ascendancy node id -> class start ids it opens
  for (const id of ids) {
    const n = kept.get(id);
    if (!n.ascendancyId) continue;
    for (const other of adjacent.get(id) || []) {
      const m = kept.get(other);
      if (!m || m.ascendancyId === n.ascendancyId || isClassStart(m)) continue;
      const classStarts = m.ascendancyId ? [] : [...(adjacent.get(other) || [])].filter((x) => isClassStart(kept.get(x)));
      if (!classStarts.length) throw new Error(`Link ${id} > ${other} crosses sections, but ${other} isn't beside a class start`);
      const set = rootsOf.get(id) || new Set();
      for (const s of classStarts) set.add(s);
      rootsOf.set(id, set);
    }
  }

  const nodes = ids.map((id) => {
    const n = kept.get(id);
    const node = { id, section: n.ascendancyId ? sectionOf.get(n.ascendancyId) : 'main', name: plain(n.name || '') };
    const tags = new Set();
    const classIdx = [].concat(n.classStartIndex ?? []);
    if (classIdx.length) {
      const names = classIdx.map((i) => data.classes[i].name);
      // No noPath: the kit closes every start but the build's own, and paths run through that one.
      Object.assign(node, { kind: 'start', name: names.join(' / '), start: true });
      for (const name of names) tags.add(`class:${slug(name)}`);
    } else if (n.isAscendancyStart) {
      Object.assign(node, { kind: 'start', start: true, granted: true });
    } else if (n.isGenericAttribute) {
      node.kind = 'attribute';
      const amount = Number((plain(n.stats[0] || '').match(/\d+/) || [5])[0]);
      node.options = ATTRIBUTES.map(([key, name]) => ({ id: key, name, stats: [{ id: `attr:${key}`, text: `+{0} to ${name}`, values: [amount] }] }));
    } else if (n.isKeystone) node.kind = 'keystone';
    else if (n.isJewelSocket) {
      node.kind = 'socket';
      node.socket = { accepts: ['jewel'] };
    } else if (n.isNotable) node.kind = 'notable';
    node.icon = n.icon;
    if (n.isFree) node.cost = 0;
    if (rootsOf.has(id)) node.roots = [...rootsOf.get(id)].sort(byNumber);

    if (n.grantedStrength) tags.add('attr:str');
    if (n.grantedDexterity) tags.add('attr:dex');
    if (n.grantedIntelligence) tags.add('attr:int');
    if (n.grantedPassivePoints || n.passivePointsGranted) tags.add('grant:passive-points');
    if (n.weaponPassivePointsGranted) tags.add('grant:weapon-set-points');
    if (n.grantedSkill) tags.add('grant:skill');
    const stats = (n.stats || []).map(plain);
    for (const [tag, re] of TAG_WORDS) if (stats.some((s) => re.test(s))) tags.add(tag);
    if (tags.size) node.tags = [...tags].sort();
    if (stats.length) node.stats = n.stats.map(statLine);

    const uc = n.unlockConstraint;
    if (uc) {
      // The export doesn't say whether several unlock nodes mean any or all; any is the lenient reading.
      const takes = (uc.nodes || []).map((u) => ({ rank: String(u), gte: 1 }));
      const atoms = [];
      if (uc.ascendancy && sectionOf.has(uc.ascendancy)) atoms.push({ active: sectionOf.get(uc.ascendancy) });
      if (takes.length) atoms.push(takes.length === 1 ? takes[0] : { any: takes });
      if (atoms.length) node.req = atoms.length === 1 ? atoms[0] : { all: atoms };
    }
    if (n.isMultipleChoice) {
      const options = (n.out || []).filter((o) => kept.has(o) && data.nodes[o].isMultipleChoiceOption).sort(byNumber);
      groups.push({ id: `choice-${id}`, pick: { max: 1 }, members: { nodes: options } });
    }
    return Object.fromEntries(NODE_KEYS.filter((k) => node[k] !== undefined).map((k) => [k, node[k]]));
  });

  // One link per pair, smaller id first. Links across sections are dropped (see rootsOf above).
  const pairs = new Set();
  const edges = [];
  const layoutEdges = {};
  for (const e of data.edges) {
    const a = String(e.from);
    const b = String(e.to);
    if (!kept.has(a) || !kept.has(b)) continue;
    const [from, to] = [a, b].sort(byNumber);
    const key = `${from}>${to}`;
    if (pairs.has(key)) continue;
    const n = kept.get(a);
    const m = kept.get(b);
    if ((n.ascendancyId || '') !== (m.ascendancyId || '')) continue;
    pairs.add(key);
    edges.push({ from, to, type: 'link' });
    if (n.hideConnection || m.hideConnection) layoutEdges[key] = { hidden: true };
    else if (e.orbitX !== undefined) {
      const center = [round(e.orbitX), round(e.orbitY)];
      layoutEdges[key] = { path: 'arc', center, radius: round(Math.hypot(n.x - e.orbitX, n.y - e.orbitY)) };
    }
  }
  edges.sort((x, y) => byNumber(x.from, y.from) || byNumber(x.to, y.to));
  // Some exports (0.5.0) hold unnamed placeholder nodes with no links; they aren't on the tree.
  const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
  const shown = nodes.filter((n) => n.start || linked.has(n.id));

  const tree = {
    app: 'lmg-tree',
    v: 1,
    id: treeId,
    name: `Path of Exile 2 ${pin.tag} passive tree`,
    game: 'poe2',
    patch: pin.tag,
    source: `${pin.repo}@${pin.tag}`,
    pools: [
      { id: 'passive', name: 'Passive skill points', budget: { perLevelFrom: [2, 1, 100], bonuses: [{ flag: 'quest:passive-points', points: QUEST_POINTS }] } },
      { id: 'ws1', name: 'Weapon set 1 points', budget: { bonuses: [{ flag: 'quest:weapon-set-points', points: WEAPON_SET_POINTS }] } },
      { id: 'ws2', name: 'Weapon set 2 points', budget: { bonuses: [{ flag: 'quest:weapon-set-points', points: WEAPON_SET_POINTS }] } },
      { id: 'ascendancy', name: 'Ascendancy points', budget: { bonuses: [{ flag: 'quest:trials', points: ASCENDANCY_POINTS }] } },
    ],
    sections,
    nodes: shown,
    edges,
    groups,
    context: {
      level: { min: 1, max: 100 },
      flags: [
        { id: 'quest:passive-points', name: 'All passive point quests done' },
        { id: 'quest:weapon-set-points', name: 'All weapon set point quests done' },
        { id: 'quest:trials', name: 'All ascendancy trials done' },
      ],
    },
    // Index tables for build imports: PoB2 stores class and ascendancy as positions or export ids.
    ext: { poe2: { classes: poeClasses } },
  };

  const layoutNodes = {};
  for (const { id } of shown) {
    const n = kept.get(id);
    layoutNodes[id] = { at: [round(n.x), round(n.y)] };
  }
  const sectionLayout = { mode: 'absolute', origin: [-data.min_x, -data.min_y] };
  const layout = {
    app: 'lmg-tree-layout',
    v: 1,
    tree: treeId,
    skin: 'default',
    space: { w: data.max_x - data.min_x, h: data.max_y - data.min_y, unit: 'u' },
    sections: Object.fromEntries(sections.map((s) => [s.id, sectionLayout])),
    nodes: layoutNodes,
    edges: layoutEdges,
  };
  return { tree, layout };
}

module.exports = { convert, plain };
