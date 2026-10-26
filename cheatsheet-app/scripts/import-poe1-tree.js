// Converts GGG's official passive tree export (github.com/grindinggear/skilltree-export)
// into lmg-tree-kit files: a tree (what exists) and a polar layout (where it's drawn).
// Run it through scripts/import-poe-trees.js, which pins the version and writes the files.
//
// The export is the one source GGG publishes for third-party tools
// (pathofexile.com/developer/docs/data). Only data.json is read; the assets/ art is not used.

// Levels 2..100 give one point each; quest points are whatever the export's total adds on top.
const LEVEL_POINTS = 99;

// Slot angles in degrees, clockwise from north. The export README gives the 16-slot table;
// the 40-slot table matches Path of Building's. Other orbits are evenly spaced.
const ANGLES_16 = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const ANGLES_40 = [
  0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170,
  180, 190, 200, 210, 220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350,
];

function orbitAngles(skillsPerOrbit) {
  return skillsPerOrbit.map((n) => {
    if (n === 16) return ANGLES_16;
    if (n === 40) return ANGLES_40;
    return Array.from({ length: n }, (_, i) => round((360 * i) / n));
  });
}

// The layout's explicit angle tables, by orbit index: only the unevenly spaced orbits.
// Evenly spaced ones follow from the slot count.
function unevenAngles(skillsPerOrbit) {
  const tables = orbitAngles(skillsPerOrbit);
  return Object.fromEntries(skillsPerOrbit.flatMap((n, i) => (n === 16 || n === 40 ? [[String(i), tables[i]]] : [])));
}

// Node key order from the tree schema, so saves are stable.
const NODE_KEYS = ['id', 'section', 'kind', 'name', 'icon', 'tags', 'stats', 'options', 'granted', 'start', 'noPath', 'roots', 'socket'];

const round = (x) => Math.round(x * 1000) / 1000;
const byNumber = (a, b) => Number(a) - Number(b);
const slug = (s) => s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

// Keyword tags for search and glyphs. Text only; the kit never interprets them.
const TAG_WORDS = [
  ['dmg:fire', /\bfire\b/i],
  ['dmg:cold', /\bcold\b/i],
  ['dmg:lightning', /\blightning\b/i],
  ['dmg:chaos', /\bchaos\b/i],
  ['dmg:physical', /\bphysical\b/i],
  ['role:defence', /\b(maximum life|energy shield|armour|evasion|block|resistances?)\b/i],
];

// "Adds 1 to 3 Fire Damage" -> { id: "Adds # to # Fire Damage", text: "Adds {0} to {1} Fire Damage", values: [[1, 3]] }
// Values are per rank (PoE nodes have one), holding a number per placeholder.
function statLine(line) {
  const nums = [];
  const text = line.replace(/\d+(?:\.\d+)?/g, (m) => `{${nums.push(Number(m)) - 1}}`);
  const stat = { id: text.replace(/\{\d+\}/g, '#'), text };
  if (nums.length) stat.values = [nums.length === 1 ? nums[0] : nums];
  return stat;
}

// Nodes on the drawn tree. Ungrouped nodes are anoint-only or removed; proxies and
// sockets nested inside cluster jewels are cluster templates (milestone 3).
function onTree(id, n) {
  return id !== 'root' && n.group !== undefined && !n.isProxy && !n.isBlighted && !(n.expansionJewel && n.expansionJewel.parent);
}

function convert(data, pin) {
  const treeId = `poe1-${pin.tag}`;
  const sectionOf = new Map(); // ascendancyName -> section id
  const sections = [{ id: 'main', name: 'Passive tree', kind: 'tree', pool: 'passive', connectivity: 'path', active: 'always' }];
  const classStart = new Map(); // classStartIndex -> node id
  for (const [id, n] of Object.entries(data.nodes)) {
    if (n.classStartIndex !== undefined) classStart.set(n.classStartIndex, id);
  }

  const poeClasses = data.classes.map((c, i) => {
    const asc = c.ascendancies.map((a) => {
      const id = slug(a.id);
      sectionOf.set(a.id, id);
      // Only the class whose start this is can pick the ascendancy.
      sections.push({ id, name: a.name, kind: 'ascendancy', pool: 'ascendancy', connectivity: 'path', active: { group: 'ascendancy' }, req: { start: classStart.get(i) }, ports: [classStart.get(i)] });
      return id;
    });
    return { name: c.name, start: classStart.get(i), ascendancies: asc };
  });
  const bloodlines = (data.alternate_ascendancies || []).map((a) => {
    const id = `bloodline-${slug(a.id)}`;
    sectionOf.set(a.id, id);
    sections.push({ id, name: a.name, kind: 'ascendancy', pool: 'ascendancy', connectivity: 'path', active: { group: 'bloodline' } });
    return id;
  });

  const kept = new Map(Object.entries(data.nodes).filter(([id, n]) => onTree(id, n)));
  const ids = [...kept.keys()].sort(byNumber);
  const groups = [
    { id: 'ascendancy', pick: { max: 1 }, members: { sections: poeClasses.flatMap((c) => c.ascendancies) } },
  ];
  if (bloodlines.length) groups.push({ id: 'bloodline', pick: { max: 1 }, members: { sections: bloodlines } });

  // Links that cross into an ascendancy are never pathed or drawn. A class start links to its
  // ascendancy start for the game's own drawing. The Ascendant's "Path of the X" nodes link to the
  // main-tree nodes beside X's class start: in game they let the Scion allocate from that start, so
  // here the node opens that start as a root instead.
  const isClassStart = (x) => x?.classStartIndex !== undefined;
  const adjacent = new Map(); // node id -> linked node ids, read from both ends of every link
  for (const id of ids) {
    for (const other of [...(kept.get(id).out || []), ...(kept.get(id).in || [])]) {
      if (!kept.has(other)) continue;
      (adjacent.get(id) || adjacent.set(id, new Set()).get(id)).add(other);
      (adjacent.get(other) || adjacent.set(other, new Set()).get(other)).add(id);
    }
  }
  const rootsOf = new Map(); // ascendancy node id -> class start ids it opens
  for (const id of ids) {
    const n = kept.get(id);
    if (!n.ascendancyName) continue;
    for (const other of adjacent.get(id) || []) {
      const m = kept.get(other);
      if (m.ascendancyName === n.ascendancyName || isClassStart(m)) continue;
      const starts = m.ascendancyName ? [] : [...(adjacent.get(other) || [])].filter((x) => isClassStart(kept.get(x)));
      if (!starts.length) throw new Error(`Link ${id} > ${other} crosses sections, but ${other} isn't beside a class start`);
      const set = rootsOf.get(id) || new Set();
      for (const s of starts) set.add(s);
      rootsOf.set(id, set);
    }
  }

  const nodes = ids.map((id) => {
    const n = kept.get(id);
    const node = { id, section: n.ascendancyName ? sectionOf.get(n.ascendancyName) : 'main', name: n.name };
    if (!node.section) throw new Error(`Node ${id} has unknown ascendancy ${n.ascendancyName}`);
    const tags = new Set();
    if (n.classStartIndex !== undefined) {
      const c = data.classes[n.classStartIndex];
      // No noPath: the kit closes every start but the build's own, and paths run through that one.
      Object.assign(node, { kind: 'start', name: c.name, start: true });
      tags.add(`class:${slug(c.name)}`);
    } else if (n.isAscendancyStart) {
      Object.assign(node, { kind: 'start', start: true, granted: true });
    } else if (n.isMastery) {
      Object.assign(node, { kind: 'mastery', noPath: true });
      node.options = (n.masteryEffects || []).map((e) => ({ id: String(e.effect), stats: e.stats.map(statLine) }));
      groups.push({ id: `mastery-${id}`, pick: { max: 1 }, unique: true, members: { options: id } });
    } else if (n.isKeystone) node.kind = 'keystone';
    else if (n.isJewelSocket) {
      node.kind = 'socket';
      const accepts = ['jewel'];
      if (n.expansionJewel) accepts.push('cluster-jewel');
      node.socket = { accepts };
    } else if (n.isNotable) node.kind = 'notable';
    node.icon = n.icon;
    if (rootsOf.has(id)) node.roots = [...rootsOf.get(id)].sort(byNumber);

    if (n.grantedStrength) tags.add('attr:str');
    if (n.grantedDexterity) tags.add('attr:dex');
    if (n.grantedIntelligence) tags.add('attr:int');
    if (n.grantedPassivePoints) tags.add('grant:passive-points');
    for (const [tag, re] of TAG_WORDS) if ((n.stats || []).some((s) => re.test(s))) tags.add(tag);
    if (tags.size) node.tags = [...tags].sort();
    if (n.stats && n.stats.length) node.stats = n.stats.map(statLine);

    if (n.isMultipleChoice) {
      const options = n.out.filter((o) => kept.has(o) && data.nodes[o].isMultipleChoiceOption).sort(byNumber);
      groups.push({ id: `choice-${id}`, pick: { max: 1 }, members: { nodes: options } });
    }
    return Object.fromEntries(NODE_KEYS.filter((k) => node[k] !== undefined).map((k) => [k, node[k]]));
  });

  // Links are undirected: one edge per pair, smaller id first. Links across sections are dropped
  // (see rootsOf above).
  const pairs = new Set();
  const edges = [];
  const layoutEdges = {};
  const groupXY = (g) => [round(data.groups[g].x), round(data.groups[g].y)];
  for (const id of ids) {
    const n = kept.get(id);
    for (const other of [...(n.out || []), ...(n.in || [])]) {
      if (!kept.has(other)) continue;
      const m = kept.get(other);
      const [from, to] = [id, other].sort(byNumber);
      const key = `${from}>${to}`;
      if (pairs.has(key)) continue;
      if ((n.ascendancyName || '') !== (m.ascendancyName || '')) continue;
      pairs.add(key);
      edges.push({ from, to, type: 'link' });
      // Mastery links count for allocation but aren't drawn in game.
      if (n.isMastery || m.isMastery) layoutEdges[key] = { hidden: true };
      else if (n.group === m.group && n.orbit === m.orbit && n.orbit > 0) {
        // Arc geometry is in section coordinates, the same space as polar.groups.
        layoutEdges[key] = { path: 'arc', center: groupXY(n.group), radius: data.constants.orbitRadii[n.orbit] };
      }
    }
  }
  edges.sort((a, b) => byNumber(a.from, b.from) || byNumber(a.to, b.to));

  const tree = {
    app: 'lmg-tree',
    v: 1,
    id: treeId,
    name: `Path of Exile ${pin.tag} passive tree`,
    game: 'poe1',
    patch: pin.tag,
    source: `${pin.repo}@${pin.tag}`,
    pools: [
      { id: 'passive', name: 'Passive skill points', budget: { perLevelFrom: [2, 1, 100], bonuses: [{ flag: 'quest:passive-points', points: data.points.totalPoints - LEVEL_POINTS }] } },
      { id: 'ascendancy', name: 'Ascendancy points', budget: { bonuses: [{ flag: 'quest:labyrinths', points: data.points.ascendancyPoints }] } },
    ],
    sections,
    nodes,
    edges,
    groups,
    context: {
      level: { min: 1, max: 100 },
      flags: [
        { id: 'quest:passive-points', name: 'All passive point quests done' },
        { id: 'quest:labyrinths', name: 'All labyrinths done' },
      ],
    },
    // Index tables for the PoE tree URL adapter: the URL stores class and ascendancy as positions.
    // PoE-only, so it goes under the schema's game-data namespace, which is saved with the tree.
    ext: { poe1: { classes: poeClasses, bloodlines } },
  };

  const sectionGroups = new Map(sections.map((s) => [s.id, new Set()]));
  const layoutNodes = {};
  for (const [i, id] of ids.entries()) {
    const n = kept.get(id);
    sectionGroups.get(nodes[i].section).add(n.group);
    layoutNodes[id] = { group: String(n.group), orbit: n.orbit, slot: n.orbitIndex };
  }
  const radii = data.constants.orbitRadii;
  const slots = data.constants.skillsPerOrbit;
  const angles = unevenAngles(slots);
  // Each section carries its own polar tables and only the group centres it uses.
  // Export coordinates are centred on 0; origin moves them into the w x h space.
  const sectionLayout = (id) => {
    const groups = [...sectionGroups.get(id)].sort(byNumber).map((g) => [String(g), groupXY(g)]);
    const polar = { radii, slots, groups: Object.fromEntries(groups) };
    if (Object.keys(angles).length) polar.angles = angles;
    return { mode: 'polar', origin: [-data.min_x, -data.min_y], polar };
  };
  const layout = {
    app: 'lmg-tree-layout',
    v: 1,
    tree: treeId,
    skin: 'default',
    space: { w: data.max_x - data.min_x, h: data.max_y - data.min_y, unit: 'u' },
    sections: Object.fromEntries(sections.map((s) => [s.id, sectionLayout(s.id)])),
    nodes: layoutNodes,
    edges: layoutEdges,
  };

  return { tree, layout };
}

module.exports = { convert, statLine, orbitAngles, unevenAngles };
