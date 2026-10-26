// The lmg-tree engine (Phase A): budgets, spending, allocation, refunds, paths,
// validation and totals over a tree and a build, following docs/rules.md.
// One dependency-free ES module, so it runs in Node, browsers and game tools.
//
// Every function takes a tree (raw JSON or the result of load) and a build
// (plain JSON). Builds are never mutated: allocate, refund and pick return a
// new one.

const ID_KEYS = ['node', 'section', 'pool', 'group', 'slot', 'id'];

const push = (map, key, value) => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};
const byId = (items) => new Map((items || []).map((x) => [x.id, x]));
const poolList = (p) => (p === undefined ? [] : [].concat(p));
const clone = (x) => JSON.parse(JSON.stringify(x));

function matches(m, item, defaultKind) {
  return (m.kind === undefined || (item.kind ?? defaultKind) === m.kind)
    && (m.tag === undefined || !!item.tags?.includes(m.tag))
    && (m.ids === undefined || m.ids.includes(item.id));
}

// The structural mistakes the engine can't run with, each with its JSON path.
// Full shape checks are the schema's job (schemas/tree.schema.json).
function treeErrors(json) {
  const errors = [];
  const bad = (path, message) => errors.push(`${path} ${message}`);
  if (!Array.isArray(json.sections) || !json.sections.length) bad('/sections', 'must list at least one section');
  if (!Array.isArray(json.nodes)) bad('/nodes', 'must be an array');
  // The lists below are read only where they are arrays of objects, so a bad
  // shape is reported with its path instead of crashing the checks.
  const list = (key) => {
    if (json[key] === undefined) return [];
    if (!Array.isArray(json[key])) {
      if (key !== 'sections' && key !== 'nodes') bad(`/${key}`, 'must be an array');
      return [];
    }
    return json[key];
  };
  const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const items = (key) => list(key).map((x, i) => [x, i]).filter(([x]) => isObject(x));
  const ids = {};
  for (const key of ['pools', 'sections', 'nodes', 'groups', 'slots']) {
    ids[key] = new Set();
    list(key).forEach((x, i) => {
      if (!isObject(x)) bad(`/${key}/${i}`, 'must be an object');
      else if (typeof x.id !== 'string') bad(`/${key}/${i}/id`, 'must be a string');
      else if (ids[key].has(x.id)) bad(`/${key}/${i}/id`, `duplicates ${x.id}`);
      else ids[key].add(x.id);
    });
  }
  const pools = (path, p) => poolList(p).forEach((id, j) => ids.pools.has(id) || bad(Array.isArray(p) ? `${path}/${j}` : path, `names unknown pool ${id}`));
  const node = (path, id) => ids.nodes.has(id) || bad(path, `names unknown node ${id}`);
  items('sections').forEach(([s, i]) => {
    pools(`/sections/${i}/pool`, s.pool);
    (s.ports || []).forEach((id, j) => node(`/sections/${i}/ports/${j}`, id));
  });
  const starts = new Set(items('nodes').filter(([n]) => n.start === true).map(([n]) => n.id));
  items('nodes').forEach(([n, i]) => {
    if (!ids.sections.has(n.section)) bad(`/nodes/${i}/section`, `names unknown section ${n.section}`);
    pools(`/nodes/${i}/pool`, n.pool);
    // A noPath start conducts nothing, so a build could never path out of it.
    if (n.start === true && n.noPath === true) bad(`/nodes/${i}/noPath`, 'must not be set on a start node');
    // Only a start can be opened as a root: anything else is reached by linking to it.
    (Array.isArray(n.roots) ? n.roots : []).forEach((id, j) => {
      if (!ids.nodes.has(id)) bad(`/nodes/${i}/roots/${j}`, `names unknown node ${id}`);
      else if (!starts.has(id)) bad(`/nodes/${i}/roots/${j}`, `must name a start node, not ${id}`);
    });
  });
  list('edges').forEach((e, i) => {
    if (!isObject(e)) return bad(`/edges/${i}`, 'must be an object');
    node(`/edges/${i}/from`, e.from);
    node(`/edges/${i}/to`, e.to);
  });
  items('slots').forEach(([s, i]) => {
    if (!isObject(s.accepts) || (!isObject(s.accepts.nodes) && !isObject(s.accepts.sections))) bad(`/slots/${i}/accepts`, 'must have nodes or sections');
  });
  items('groups').forEach(([g, i]) => {
    if (!isObject(g.members)) bad(`/groups/${i}/members`, 'must be an object');
    const m = isObject(g.members) ? g.members : {};
    (m.nodes || []).forEach((id, j) => node(`/groups/${i}/members/nodes/${j}`, id));
    (m.sections || []).forEach((id, j) => ids.sections.has(id) || bad(`/groups/${i}/members/sections/${j}`, `names unknown section ${id}`));
    if (m.options !== undefined) node(`/groups/${i}/members/options`, m.options);
  });
  return errors;
}

class Tree {
  constructor(json) {
    if (!json || json.app !== 'lmg-tree') throw new TypeError('not an lmg-tree tree');
    const errors = treeErrors(json);
    if (errors.length) throw new TypeError(`invalid tree ${json.id ?? ''}:\n${errors.join('\n')}`);
    // The raw JSON is kept whole, so unknown keys from a newer writer survive.
    this.json = json;
    this.id = json.id;
    this.pools = byId(json.pools);
    this.sections = byId(json.sections);
    this.nodes = byId(json.nodes);
    this.groups = byId(json.groups);
    this.slots = byId(json.slots);
    this.links = new Map();
    this.arrowsIn = new Map();
    for (const e of json.edges || []) {
      if ((e.type ?? 'link') === 'arrow') push(this.arrowsIn, e.to, e);
      else {
        push(this.links, e.from, e.to);
        push(this.links, e.to, e.from);
      }
    }
    this.sectionNodes = new Map();
    for (const n of json.nodes) push(this.sectionNodes, n.section, n.id);
    // Node order in the file: results that list nodes keep it, however they were found.
    this.order = new Map(json.nodes.map((n, i) => [n.id, i]));
    this.grantedIds = json.nodes.filter((n) => n.granted).map((n) => n.id);
    this.nodePools = new Map(json.nodes.map((n) => [n.id, poolList(n.pool ?? this.sections.get(n.section)?.pool)]));

    // What each node needs for its first rank, besides arrows: its req, its
    // tier gate and tier level, and the unlock of any group it belongs to.
    this.reqs = new Map();
    for (const n of json.nodes) {
      const reqs = n.req ? [n.req] : [];
      const tiers = this.sections.get(n.section)?.tiers;
      if (tiers && n.tier) {
        const gate = tiers.gate ? tiers.gate[n.tier - 1] : tiers.step !== undefined ? tiers.step * (n.tier - 1) : undefined;
        if (gate) reqs.push({ spent: { section: n.section, tierBelow: n.tier }, gte: gate });
        const level = tiers.levels?.[n.tier - 1];
        if (level) reqs.push({ level });
      }
      this.reqs.set(n.id, reqs);
    }
    this.nodeGroups = new Map();
    for (const g of json.groups || []) {
      const m = g.members;
      for (const id of m.nodes || []) push(this.nodeGroups, id, g);
      if (!g.unlock) continue;
      const members = m.nodes || (m.options ? [m.options] : (m.sections || []).flatMap((s) => this.sectionNodes.get(s) || []));
      for (const id of members) this.reqs.get(id)?.push(g.unlock);
    }

    // Nodes a slot accepts are taken only by slotting them.
    this.slotOf = new Map();
    for (const s of json.slots || []) {
      if (!s.accepts.nodes) continue;
      for (const n of json.nodes) if (!this.slotOf.has(n.id) && matches(s.accepts.nodes, n, 'small')) this.slotOf.set(n.id, s);
    }
    this.instances = new Map();
  }

  accepts(slot, id) {
    const a = slot.accepts;
    if (a.sections) return this.sections.has(id) && matches(a.sections, this.sections.get(id));
    return this.nodes.has(id) && matches(a.nodes, this.nodes.get(id), 'small');
  }
}

const loaded = new WeakMap();

/** Index a tree for the engine. Raw trees passed to the other functions are loaded (once) for you. */
export function load(json) {
  if (json instanceof Tree) return json;
  let tree = loaded.get(json);
  if (!tree) loaded.set(json, (tree = new Tree(json)));
  return tree;
}

// The groups wholly inside a template: node groups whose members are all in
// it, and options groups on one of its nodes. Each instance gets its own copy.
const groupsInside = (tree, ids) => (tree.json.groups || []).filter((g) => (g.members.nodes
  ? g.members.nodes.length && g.members.nodes.every((id) => ids.has(id))
  : g.members.options !== undefined && ids.has(g.members.options)));

// A requirement copied into an instance: ids that point inside the template
// (its nodes, its own section id, its groups) get the instance's names.
function renameReq(req, I) {
  if (!req || typeof req !== 'object') return req;
  const out = { ...req };
  for (const k of ['all', 'any']) if (req[k]) out[k] = req[k].map((r) => renameReq(r, I));
  if (req.not) out.not = renameReq(req.not, I);
  if (req.rank !== undefined) out.rank = I.node(req.rank);
  if (req.start !== undefined) out.start = Array.isArray(req.start) ? req.start.map(I.node) : I.node(req.start);
  for (const k of ['spent', 'spentExcept']) if (req[k]?.section !== undefined) out[k] = { ...req[k], section: I.section(req[k].section) };
  if (req.active !== undefined) out.active = I.section(req.active);
  if (req.group !== undefined && I.groups.has(req.group)) {
    out.group = `${I.as}/${req.group}`;
    if (I.groups.get(req.group).members.nodes) out.picked = I.node(req.picked);
  }
  return out;
}

const NO_ATTACH = { use: [], bad: [] };

// The build's attaches the engine can use, and the ones it ignores: an `as`
// already used by an earlier attach, or whose section, node or group ids
// would clash with ids the tree has. Those are `attach` problems.
function attaches(tree, build) {
  if (!build.attach?.length) return NO_ATTACH;
  const out = { use: [], bad: [] };
  const seen = new Set();
  for (const a of build.attach) {
    if (a.as && tree.sections.has(a.section)) {
      const ids = new Set(tree.sectionNodes.get(a.section) || []);
      const clash = seen.has(a.as) || tree.sections.has(a.as)
        || [...ids].some((id) => tree.nodes.has(`${a.as}/${id}`))
        || groupsInside(tree, ids).some((g) => tree.groups.has(`${a.as}/${g.id}`));
      seen.add(a.as);
      if (clash) {
        out.bad.push(a);
        continue;
      }
    }
    out.use.push(a);
  }
  return out;
}

// A template attached with `as` becomes a section of that id whose nodes are
// `<as>/<nodeId>`. The instanced tree is cached per set of instances.
function effective(tree, build) {
  const inst = attaches(tree, build).use.filter((a) => a.as && tree.sections.has(a.section));
  if (!inst.length) return tree;
  const key = JSON.stringify(inst.map((a) => [a.as, a.section]));
  let out = tree.instances.get(key);
  if (out) return out;
  const json = { ...tree.json, sections: [...tree.json.sections], nodes: [...tree.json.nodes], edges: [...(tree.json.edges || [])], groups: [...(tree.json.groups || [])] };
  for (const a of inst) {
    const ids = new Set(tree.sectionNodes.get(a.section) || []);
    const I = {
      as: a.as,
      node: (id) => (ids.has(id) ? `${a.as}/${id}` : id),
      section: (id) => (id === a.section ? a.as : id),
      groups: new Map(groupsInside(tree, ids).map((g) => [g.id, g])),
    };
    const s = tree.sections.get(a.section);
    json.sections.push({ ...s, id: a.as, template: false, ...(s.ports && { ports: s.ports.map(I.node) }), ...(s.req && { req: renameReq(s.req, I) }) });
    for (const n of tree.json.nodes) {
      if (!ids.has(n.id)) continue;
      const copy = { ...n, id: I.node(n.id), section: a.as };
      if (n.req) copy.req = renameReq(n.req, I);
      if (n.options) copy.options = n.options.map((o) => (o.req ? { ...o, req: renameReq(o.req, I) } : o));
      if (n.synergy) copy.synergy = n.synergy.map((x) => ({ ...x, from: I.node(x.from) }));
      json.nodes.push(copy);
    }
    for (const e of tree.json.edges || []) if (ids.has(e.from) && ids.has(e.to)) json.edges.push({ ...e, from: I.node(e.from), to: I.node(e.to) });
    for (const g of I.groups.values()) {
      const m = g.members;
      json.groups.push({ ...g, id: `${a.as}/${g.id}`, members: m.nodes ? { nodes: m.nodes.map(I.node) } : { options: I.node(m.options) }, ...(g.unlock && { unlock: renameReq(g.unlock, I) }) });
    }
  }
  tree.instances.set(key, (out = new Tree(json)));
  return out;
}

// Everything the rules read about one build, worked out once.
function state(tree, build) {
  const base = load(tree);
  const T = effective(base, build);
  const ctx = build.context || {};
  const S = {
    base, T, build,
    level: ctx.level ?? T.json.context?.level?.min ?? 1,
    flags: new Set(ctx.flags || []),
    values: ctx.values || {},
    skills: ctx.skills || {},
    picks: build.picks || {},
    ranks: build.ranks || {},
    attached: new Map(),
    active: new Map(),
    slotted: new Set(),
    filled: [],
    taken: new Map(),
  };
  for (const a of attaches(base, build).use) {
    const sid = a.as ?? a.section;
    const s = T.sections.get(sid);
    if (!s?.active?.port || !T.nodes.has(a.at)) continue;
    const via = viaOf(T, a);
    if (via) push(S.attached, sid, [a.at, via]);
  }
  for (const s of T.json.sections) {
    const a = s.active ?? 'always';
    S.active.set(s.id, a === 'always' || (a.group !== undefined ? S.picks[a.group] === s.id : !!a.port && S.attached.has(s.id)));
  }
  fillTaken(S);
  // Slot unlocks are read before slotted sections count, so they can't depend on themselves.
  for (const slot of T.json.slots || []) {
    (build.slots?.[slot.id] || []).forEach((e, i) => {
      if (e === null || i >= (slot.count ?? 1) || !T.accepts(slot, e) || !holds(slot.unlock?.[i], S)) return;
      S.filled.push([slot.id, i, e]);
      if (slot.accepts.sections) {
        if (T.sections.get(e).active?.slot === slot.id) S.active.set(e, true);
      } else S.slotted.add(e);
    });
  }
  fillTaken(S);
  reach(S);
  return S;
}

function viaOf(T, a) {
  const sid = a.as ?? a.section;
  return [a.as && a.via && `${a.as}/${a.via}`, a.via, T.sections.get(sid)?.ports?.[0]]
    .find((v) => v && T.nodes.get(v)?.section === sid);
}

// Hard ranks of every node that counts as taken: listed ranks, granted nodes,
// the build's start and slotted nodes, in active sections only.
function fillTaken(S) {
  const { T } = S;
  S.taken.clear();
  // Only these can be taken, so a big tree with a small build stays cheap. File order is kept.
  const ids = new Set([...T.grantedIds, ...Object.keys(S.ranks), ...S.slotted]);
  if (S.build.start !== undefined) ids.add(S.build.start);
  const known = [...ids].filter((id) => T.order.has(id)).sort((a, b) => T.order.get(a) - T.order.get(b));
  for (const id of known) {
    const n = T.nodes.get(id);
    if (!S.active.get(n.section)) continue;
    let r;
    if (n.granted || n.id === S.build.start || S.slotted.has(n.id)) r = 1;
    else r = T.slotOf.has(n.id) ? 0 : S.ranks[n.id] ?? 0;
    if (r > 0) S.taken.set(n.id, r);
  }
  // Starts that a taken node opens through `roots` are taken too, free, like granted starts.
  S.grantedRoots = new Set();
  for (const id of [...S.taken.keys()]) {
    for (const r of T.nodes.get(id).roots || []) {
      const m = T.nodes.get(r);
      if (!m || !S.active.get(m.section)) continue;
      S.grantedRoots.add(r);
      if (!S.taken.has(r)) S.taken.set(r, 1);
    }
  }
  // What each taken node pays, worked out once: spend checks read it per node.
  S.paid = new Map();
  for (const [id, r] of S.taken) {
    const n = S.T.nodes.get(id);
    S.paid.set(id, { pool: poolOf(S, n), cost: costOf(S, n, r) });
  }
  S.memo = new Map();
}

const rank = (S, id) => S.taken.get(id) ?? 0;
const free = (S, n) => !!(n.granted || n.id === S.build.start || S.slotted.has(n.id) || S.grantedRoots.has(n.id));
const isPath = (S, n) => S.T.sections.get(n.section)?.connectivity === 'path';
const NONE = [];
// Links, plus the port links of attached sections. Callers only read the list.
function neighbours(S, id) {
  const links = S.T.links.get(id) || NONE;
  const extra = S.extra.get(id);
  return extra ? [...links, ...extra] : links;
}

function reach(S) {
  const { T } = S;
  S.extra = new Map();
  for (const pairs of S.attached.values()) {
    for (const [at, via] of pairs) {
      push(S.extra, at, via);
      push(S.extra, via, at);
    }
  }
  S.roots = new Set([...S.taken.keys()].filter((id) => id === S.build.start || (T.nodes.get(id).start && T.nodes.get(id).granted)));
  S.reached = new Set();
  const queue = [];
  // Reaching a node also opens the taken starts it names in `roots`, so a start opened by an
  // unreached node conducts nothing.
  const enter = (id) => {
    S.reached.add(id);
    const n = T.nodes.get(id);
    if (!n.noPath) queue.push(id);
    for (const r of n.roots || []) {
      if (!S.taken.has(r) || S.reached.has(r)) continue;
      S.roots.add(r);
      enter(r);
    }
  };
  for (const id of [...S.roots]) if (!S.reached.has(id)) enter(id);
  while (queue.length) {
    for (const v of neighbours(S, queue.pop())) {
      if (S.reached.has(v) || !S.taken.has(v)) continue;
      if (T.nodes.get(v).start && !S.roots.has(v)) continue;
      enter(v);
    }
  }
}

const conducts = (S, id) => S.reached.has(id) && !S.T.nodes.get(id).noPath;

const poolsOf = (S, n) => S.T.nodePools.get(n.id);

function poolOf(S, n) {
  const list = poolsOf(S, n);
  if (!list.length) return null;
  const p = S.build.paidFrom?.[n.id];
  return list.includes(p) ? p : list[0];
}

function rankCost(n, k) {
  const c = n.cost ?? 1;
  return Array.isArray(c) ? c[k - 1] ?? c[c.length - 1] ?? 0 : c;
}

function costOf(S, n, ranks) {
  if (free(S, n) || !poolOf(S, n)) return 0;
  let sum = 0;
  for (let k = 1; k <= ranks; k++) sum += rankCost(n, k);
  return sum;
}

function spentIn(S, target, exclude) {
  let sum = 0;
  for (const [id, paid] of S.paid) {
    if (id === exclude) continue;
    const n = S.T.nodes.get(id);
    if (target.section !== undefined && n.section !== target.section) continue;
    if (target.pool !== undefined && paid.pool !== target.pool) continue;
    if (target.tag !== undefined && !n.tags?.includes(target.tag)) continue;
    if (target.tierBelow !== undefined && !(n.tier < target.tierBelow)) continue;
    sum += paid.cost;
  }
  return sum;
}

function spentExcept(S, target, exclude) {
  const inTarget = (n) => (target.section !== undefined ? n.section === target.section
    : target.pool !== undefined ? poolOf(S, n) === target.pool : !!n.tags?.includes(target.tag));
  const pools = new Set(target.pool !== undefined ? [target.pool]
    : target.section !== undefined ? poolList(S.T.sections.get(target.section)?.pool)
      : [...S.taken.keys()].map((id) => S.T.nodes.get(id)).filter(inTarget).map((n) => poolOf(S, n)));
  let sum = 0;
  for (const [id, paid] of S.paid) {
    if (id !== exclude && pools.has(paid.pool) && !inTarget(S.T.nodes.get(id))) sum += paid.cost;
  }
  return sum;
}

function budgetOf(S, poolId, sectionId) {
  const p = S.T.pools.get(poolId);
  if (!p) return 0;
  if (p.perSkillLevel) {
    if (sectionId !== undefined) return S.skills[sectionId] ?? 0;
    return S.T.json.sections
      .filter((s) => S.active.get(s.id) && poolList(s.pool).includes(poolId))
      .reduce((sum, s) => sum + (S.skills[s.id] ?? 0), 0);
  }
  const b = p.budget || {};
  const x = !b.of || b.of === 'level' ? S.level : S.values[b.of] ?? 0;
  let total = 0;
  if (b.byLevel) {
    let points = 0;
    for (const [level, pts] of b.byLevel) if (level <= x) points = pts;
    total += points;
  }
  if (b.perLevelFrom) {
    const [first, per, last] = b.perLevelFrom;
    total += per * Math.max(0, Math.min(x, last) - first + 1);
  }
  for (const bonus of b.bonuses || []) if (S.flags.has(bonus.flag)) total += bonus.points;
  return total;
}

function room(S, n, pool, cost) {
  const section = S.T.pools.get(pool)?.perSkillLevel ? n.section : undefined;
  const key = `${pool}\n${section ?? ''}`;
  let left = S.memo.get(key);
  if (left === undefined) S.memo.set(key, (left = budgetOf(S, pool, section) - spentIn(S, { pool, section })));
  return cost <= left + 1e-9;
}

function picked(S, groupId, id) {
  const g = S.T.groups.get(groupId);
  if (!g) return false;
  const m = g.members;
  if (m.sections) return S.picks[groupId] === id;
  if (m.nodes) return m.nodes.includes(id) && rank(S, id) > 0;
  return rank(S, m.options) > 0 && S.build.options?.[m.options] === id;
}

// `exclude` is a node whose own points don't count: a node's req is checked as
// it was before its first rank.
function holds(req, S, exclude) {
  if (!req) return true;
  if (req.all) return req.all.every((r) => holds(r, S, exclude));
  if (req.any) return req.any.some((r) => holds(r, S, exclude));
  if (req.not) return !holds(req.not, S, exclude);
  if (req.level !== undefined) return S.level >= req.level;
  if (req.value !== undefined) return (S.values[req.value] ?? 0) >= req.gte;
  if (req.rank !== undefined) return (req.rank === exclude ? 0 : rank(S, req.rank)) >= req.gte;
  if (req.spent) {
    const v = spentIn(S, req.spent, exclude);
    return (req.gte === undefined || v >= req.gte) && (req.lte === undefined || v <= req.lte);
  }
  if (req.spentExcept) return spentExcept(S, req.spentExcept, exclude) <= req.lte;
  if (req.group !== undefined) return picked(S, req.group, req.picked);
  if (req.active !== undefined) return !!S.active.get(req.active);
  if (req.flag !== undefined) return S.flags.has(req.flag);
  if (req.start !== undefined) return S.build.start !== undefined && [].concat(req.start).includes(S.build.start);
  return false; // An atom this engine doesn't know fails closed.
}

function arrowsHold(S, n) {
  const arrows = S.T.arrowsIn.get(n.id);
  if (!arrows) return true;
  const ok = (e) => rank(S, e.from) >= (e.minRank === 'max' ? S.T.nodes.get(e.from)?.ranks ?? 1 : e.minRank ?? 1);
  return n.needs === 'any' ? arrows.some(ok) : arrows.every(ok);
}

const firstRankHolds = (S, n) => arrowsHold(S, n) && S.T.reqs.get(n.id).every((r) => holds(r, S, n.id));
const sectionHolds = (S, sid) => holds(S.T.sections.get(sid)?.req, S);

// The pools a next rank could be paid from; empty when it's free.
function payPools(S, n, r) {
  if (free(S, n)) return [];
  const list = poolsOf(S, n);
  if (r > 0 || list.includes(S.build.paidFrom?.[n.id])) return list.length ? [poolOf(S, n)] : [];
  return list;
}

function allocCodes(S, id) {
  const { T } = S;
  const n = T.nodes.get(id);
  if (!n) return ['unknown-id'];
  if (T.slotOf.has(id)) return ['slot'];
  if (!S.active.get(n.section)) return ['inactive'];
  // Granted nodes and the start are rank 1 whatever their ranks, and take no more.
  if (free(S, n)) return ['granted'];
  const r = rank(S, id);
  if (r >= (n.ranks ?? 1)) return ['rank'];
  const codes = new Set();
  if (r === 0) {
    if (n.start || (isPath(S, n) && !neighbours(S, id).some((v) => conducts(S, v)))) codes.add('connectivity');
    if (!firstRankHolds(S, n) || !sectionHolds(S, n.section)) codes.add('requirement');
    for (const g of T.nodeGroups.get(id) || []) {
      if (g.pick?.max !== undefined && g.members.nodes.filter((m) => rank(S, m) > 0).length >= g.pick.max) codes.add('exclusive');
    }
  }
  const pools = payPools(S, n, r);
  if (pools.length && !pools.some((p) => room(S, n, p, rankCost(n, r + 1)))) codes.add('budget');
  return [...codes];
}

/** Can one more rank of the node be taken? `{ ok, codes }`. */
export function canAllocate(tree, build, nodeId) {
  const codes = allocCodes(state(tree, build), nodeId);
  return { ok: !codes.length, codes };
}

/** Take one more rank. `{ ok, codes, build }`: the new build, or the old one when refused. */
export function allocate(tree, build, nodeId) {
  const S = state(tree, build);
  const codes = allocCodes(S, nodeId);
  if (codes.length) return { ok: false, codes, build };
  const n = S.T.nodes.get(nodeId);
  const r = rank(S, nodeId);
  const out = clone(build);
  (out.ranks ||= {})[nodeId] = r + 1;
  const pools = payPools(S, n, r);
  const pool = pools.find((p) => room(S, n, p, rankCost(n, 1)));
  if (r === 0 && pools.length > 1 && pool !== pools[0]) (out.paidFrom ||= {})[nodeId] = pool;
  return { ok: true, codes: [], build: out };
}

// Taken nodes (listed in ranks, or slotted) that fail an arrow, gate, req,
// unlock, section req or path, with the codes they fail.
function broken(S) {
  const out = new Map();
  for (const id of S.taken.keys()) {
    const n = S.T.nodes.get(id);
    if (free(S, n) && !S.slotted.has(id)) continue;
    const codes = new Set();
    if (!firstRankHolds(S, n) || !sectionHolds(S, n.section)) codes.add('requirement');
    if (isPath(S, n) && !S.reached.has(id)) codes.add('connectivity');
    if (codes.size) out.set(id, codes);
  }
  return out;
}

// What one rank off would break. Besides `{ ok, codes, cascade }` it returns
// `next`, the build with the rank and the cascade taken off, or null when the
// refund is refused outright.
function refundCheck(tree, build, nodeId) {
  const S = state(tree, build);
  const n = S.T.nodes.get(nodeId);
  const refuse = (code) => ({ ok: false, codes: [code], cascade: [], next: null });
  if (!n) return refuse('unknown-id');
  if ((n.granted && S.taken.has(nodeId)) || nodeId === build.start) return refuse('granted');
  if (S.slotted.has(nodeId)) return refuse('slot');
  if (!S.ranks[nodeId]) return refuse('rank');
  const before = broken(S);
  const next = clone(build);
  next.ranks[nodeId] -= 1;
  if (!next.ranks[nodeId]) delete next.ranks[nodeId];
  const slotKey = (slot, i) => `${slot}#${i}`;
  const filled = new Set(S.filled.map(([slot, i]) => slotKey(slot, i)));
  const empty = (slot, i) => {
    next.slots[slot][i] = null;
    filled.delete(slotKey(slot, i));
  };
  // Whatever breaks is taken off too, until nothing else does: nodes failing
  // their requirements, slot indexes whose unlock stops holding (with the node
  // slotted there), and nodes left in a section that is no longer active.
  const cascade = new Map();
  let locked = false;
  for (;;) {
    const after = state(S.base, next);
    const fresh = new Map([...broken(after)].filter(([id]) => id !== nodeId && !before.has(id) && !cascade.has(id)));
    const still = new Set(after.filled.map(([slot, i]) => slotKey(slot, i)));
    const lost = S.filled.filter(([slot, i]) => filled.has(slotKey(slot, i)) && !still.has(slotKey(slot, i)));
    for (const [slot, i, e] of lost) {
      empty(slot, i);
      locked = true;
      if (S.slotted.has(e) && !cascade.has(e)) fresh.set(e, new Set(['slot']));
    }
    for (const id of S.taken.keys()) {
      if (id !== nodeId && next.ranks[id] && !after.taken.has(id) && !before.has(id) && !cascade.has(id) && !fresh.has(id)) fresh.set(id, new Set(['inactive']));
    }
    if (!fresh.size && !lost.length) break;
    for (const [id, codes] of fresh) {
      cascade.set(id, codes);
      if (S.slotted.has(id)) {
        for (const [slot, i, e] of S.filled) if (e === id && filled.has(slotKey(slot, i))) empty(slot, i);
      } else delete next.ranks[id];
      if (next.options) delete next.options[id];
      if (next.paidFrom) delete next.paidFrom[id];
    }
  }
  const codes = new Set([...cascade.values()].flatMap((c) => [...c]));
  if (locked) codes.add('slot');
  if (!next.ranks[nodeId]) {
    if (next.options) delete next.options[nodeId];
    if (next.paidFrom) delete next.paidFrom[nodeId];
  }
  return { ok: !cascade.size && !locked, codes: [...codes], cascade: [...cascade.keys()], next };
}

/** Can one rank come off? `{ ok, codes, cascade }`: cascade is every other node that would break. */
export function canRefund(tree, build, nodeId) {
  const { next, ...res } = refundCheck(tree, build, nodeId);
  return res;
}

/**
 * Take one rank off. `{ ok, codes, cascade, build }`. With `{ cascade: true }`
 * a refund that breaks other nodes or slot indexes takes them off too (PoE);
 * without it, it's refused (WoW).
 */
export function refund(tree, build, nodeId, { cascade: apply = false } = {}) {
  const { next, ...res } = refundCheck(tree, build, nodeId);
  if (!next || (!res.ok && !apply)) return { ...res, build };
  return { ...res, ok: true, build: next };
}

/**
 * Make a choice: a section in a section group (`pick(t, b, 'ascendancy', 'slayer')`),
 * an option on a node (`pick(t, b, 'mast', 'life')`), or the build's start
 * (`pick(t, b, 'start-a')`). A null value clears a group or option pick.
 * `{ ok, codes, build }`. Nodes in a section that is no longer picked stay in
 * the build; validate reports them as inactive.
 */
export function pick(tree, build, id, value) {
  const T = effective(load(tree), build);
  const fail = (code) => ({ ok: false, codes: [code], build });
  const out = clone(build);
  const set = (key) => {
    if (value === null || value === undefined) {
      if (out[key]) delete out[key][id];
    } else (out[key] ||= {})[id] = value;
  };
  const g = T.groups.get(id);
  if (g?.members.sections) {
    if (value != null && !g.members.sections.includes(value)) return fail('unknown-id');
    set('picks');
  } else {
    const n = T.nodes.get(id);
    if (!n) return fail('unknown-id');
    if (n.start) {
      // A granted start (an ascendancy's) is allocated by its section, never chosen as the build's start.
      if (n.granted) return fail('granted');
      out.start = id;
    } else if (n.options) {
      if (value != null && !n.options.some((o) => o.id === value)) return fail('option');
      set('options');
    } else return fail('option');
  }
  return { ok: true, codes: [], build: out };
}

/** Points available in a pool. A perSkillLevel pool is counted per section. */
export function budget(tree, build, poolId, sectionId) {
  return budgetOf(state(tree, build), poolId, sectionId);
}

/** Points spent: `target` is `{ pool | section | tag, tierBelow? }` (pool and section may be combined). */
export function spent(tree, build, target) {
  return spentIn(state(tree, build), target);
}

/** Every node that can take one more rank now. */
export function frontier(tree, build) {
  const S = state(tree, build);
  const { T } = S;
  // In a path section an untaken node needs a conducting neighbour, so only those, the nodes of
  // other sections and taken nodes with ranks left can pass. Same result as checking every node.
  const candidates = new Set();
  for (const n of T.json.nodes) if (S.active.get(n.section) && !isPath(S, n)) candidates.add(n.id);
  for (const id of S.taken.keys()) candidates.add(id);
  for (const id of S.reached) if (conducts(S, id)) for (const v of neighbours(S, id)) candidates.add(v);
  return [...candidates]
    .filter((id) => !allocCodes(S, id).length)
    .sort((a, b) => T.order.get(a) - T.order.get(b));
}

/**
 * The cheapest unallocated nodes, nearest first, that connect a node to the
 * allocated set: `{ path, cost }`, or null when nothing does.
 */
export function pathTo(tree, build, nodeId) {
  const S = state(tree, build);
  const { T } = S;
  const n = T.nodes.get(nodeId);
  if (!n || !S.active.get(n.section) || T.slotOf.has(nodeId)) return null;
  if (S.taken.has(nodeId)) return { path: [], cost: 0 };
  if (n.start) return null;
  const step = (id) => {
    const m = T.nodes.get(id);
    return payPools(S, m, 0).length ? rankCost(m, 1) : 0;
  };
  if (!isPath(S, n)) return { path: [nodeId], cost: step(nodeId) };

  const order = new Map(T.json.nodes.map((m, i) => [m.id, i]));
  const passable = (id) => {
    const m = T.nodes.get(id);
    return m && !S.taken.has(id) && S.active.get(m.section) && !m.start && !T.slotOf.has(id) && (id === nodeId || !m.noPath);
  };
  const best = new Map();
  const open = new Set();
  const better = (a, b) => a.cost < b.cost - 1e-12 || (Math.abs(a.cost - b.cost) <= 1e-12 && a.hops < b.hops);
  const relax = (id, prev, cost, hops) => {
    if (!passable(id)) return;
    const b = best.get(id);
    if (!b || better({ cost, hops }, b)) {
      best.set(id, { cost, hops, prev });
      open.add(id);
    }
  };
  for (const u of S.reached) if (conducts(S, u)) for (const v of neighbours(S, u)) relax(v, null, step(v), 1);
  while (open.size) {
    let u;
    for (const v of open) {
      if (u === undefined || better(best.get(v), best.get(u)) || (!better(best.get(u), best.get(v)) && order.get(v) < order.get(u))) u = v;
    }
    open.delete(u);
    if (u === nodeId) break;
    const b = best.get(u);
    for (const v of neighbours(S, u)) relax(v, u, b.cost + step(v), b.hops + 1);
  }
  if (!best.has(nodeId)) return null;
  const path = [];
  for (let id = nodeId; id !== null; id = best.get(id).prev) path.push(id);
  return { path: path.reverse(), cost: best.get(nodeId).cost };
}

// A problem's identity: its code and the ids it names, never its message.
const problemKey = (p) => [p.code, ...ID_KEYS.map((k) => p[k] ?? '')].join('|');

class Problems {
  constructor() {
    this.list = [];
    this.keys = new Set();
  }

  add(code, ids = {}, message = code) {
    const key = problemKey({ code, ...ids });
    if (this.keys.has(key)) return;
    this.keys.add(key);
    this.list.push({ code, ...ids, message });
  }
}

function unknownIds(S, out) {
  const { T, build } = S;
  const ctx = build.context || {};
  const unknown = (id, what) => out.add('unknown-id', { id }, `unknown ${what} ${id}`);
  if (build.tree !== T.id) unknown(build.tree, 'tree');
  const flags = new Set((T.json.context?.flags || []).map((f) => f.id));
  const values = new Set((T.json.context?.values || []).map((v) => v.id));
  for (const f of ctx.flags || []) if (!flags.has(f)) unknown(f, 'flag');
  for (const v of Object.keys(ctx.values || {})) if (!values.has(v)) unknown(v, 'context value');
  for (const s of Object.keys(ctx.skills || {})) if (!T.sections.has(s)) unknown(s, 'section');
  if (build.start !== undefined) {
    const s = T.nodes.get(build.start);
    if (!s?.start) unknown(build.start, 'start node');
    else if (s.granted) out.add('granted', { node: build.start }, `${build.start} is a granted start, so it can't be the build's start`);
  }
  for (const [g, s] of Object.entries(build.picks || {})) {
    const group = T.groups.get(g);
    if (!group?.members.sections) unknown(g, 'section group');
    else if (!group.members.sections.includes(s)) unknown(s, `member of ${g}`);
  }
  for (const map of ['ranks', 'bonusRanks', 'options', 'paidFrom', 'sockets']) {
    for (const id of Object.keys(build[map] || {})) if (!T.nodes.has(id)) unknown(id, 'node');
  }
  for (const [id, p] of Object.entries(build.paidFrom || {})) {
    const n = T.nodes.get(id);
    if (n && !poolsOf(S, n).includes(p)) unknown(p, `pool for ${id}`);
  }
  for (const s of Object.keys(build.slots || {})) if (!T.slots.has(s)) unknown(s, 'slot');
  for (const a of attaches(S.base, build).bad) out.add('attach', { id: a.as }, `${a.as} clashes with an earlier attach or a tree id, so this attach is ignored`);
  for (const a of attaches(S.base, build).use) {
    if (!T.sections.has(a.section)) unknown(a.section, 'section');
    else if (a.via !== undefined && !viaOf(T, a)) unknown(a.via, 'port node');
    if (!T.nodes.has(a.at)) unknown(a.at, 'node');
  }
  for (const st of build.steps || []) if (!T.nodes.has(st.node)) unknown(st.node, 'node');
}

function errorsOf(S) {
  const { T, build } = S;
  const out = new Problems();
  const range = T.json.context?.level;
  if (range && (S.level < (range.min ?? -Infinity) || S.level > (range.max ?? Infinity))) {
    out.add('level', {}, `level ${S.level} is outside ${range.min ?? ''}..${range.max ?? ''}`);
  }
  unknownIds(S, out);

  // Section reqs are checked for every section with points in it, and for every picked section
  // even before it has points: a pick the build's start doesn't allow is wrong on its own.
  const sections = new Set(Object.values(S.picks).filter((sid) => T.sections.has(sid)));
  for (const id of new Set([...Object.keys(S.ranks), ...S.slotted])) {
    const n = T.nodes.get(id);
    if (!n) continue;
    if (!S.active.get(n.section)) {
      out.add('inactive', { node: id }, `${n.section} isn't active`);
      continue;
    }
    if (T.slotOf.has(id) && !S.slotted.has(id)) {
      out.add('slot', { slot: T.slotOf.get(id).id }, `${id} is taken by slotting it`);
      continue;
    }
    if (free(S, n) && !S.slotted.has(id)) {
      out.add('granted', { node: id }, `${id} is granted, so it isn't listed in ranks`);
      continue;
    }
    if ((S.ranks[id] ?? 0) > (n.ranks ?? 1)) out.add('rank', { node: id }, `${id} has at most ${n.ranks ?? 1} ranks`);
    sections.add(n.section);
    if (!firstRankHolds(S, n)) out.add('requirement', { node: id }, `${id}'s requirements aren't met`);
    if (isPath(S, n) && !S.reached.has(id)) out.add('connectivity', { node: id }, `${id} isn't connected to a start`);
    const choice = build.options?.[id];
    if (n.options) {
      const o = n.options.find((x) => x.id === choice);
      if (choice === undefined ? !n.optionsOptional : !o || !holds(o.req, S, id)) out.add('option', { node: id }, `${id} needs a valid option`);
    } else if (choice !== undefined) out.add('option', { node: id }, `${id} has no options`);
  }
  for (const sid of sections) if (!sectionHolds(S, sid)) out.add('requirement', { section: sid }, `${sid}'s requirements aren't met`);

  // Taken nodes by the id an options group names: the node itself, or `<as>/<id>` in an instance.
  // Built once, so trees with hundreds of unique groups (PoE masteries) don't rescan per group.
  const takenAs = new Map();
  for (const id of S.taken.keys()) {
    push(takenAs, id, id);
    for (let i = id.indexOf('/'); i >= 0; i = id.indexOf('/', i + 1)) push(takenAs, id.slice(i + 1), id);
  }

  for (const g of T.json.groups || []) {
    const m = g.members;
    if (m.nodes && g.pick?.max !== undefined && m.nodes.filter((id) => rank(S, id) > 0).length > g.pick.max) {
      out.add('exclusive', { group: g.id }, `at most ${g.pick.max} of ${g.id}`);
    }
    if (m.options && g.unique) {
      const seen = new Set();
      for (const id of takenAs.get(m.options) || NONE) {
        const choice = build.options?.[id];
        if (choice !== undefined && seen.has(choice)) out.add('option', { node: id }, `${choice} is already picked`);
        seen.add(choice);
      }
    }
  }

  for (const p of T.json.pools || []) {
    const over = (section) => spentIn(S, { pool: p.id, section }) > budgetOf(S, p.id, section) + 1e-9;
    const bad = p.perSkillLevel
      ? [...new Set([...S.taken.keys()].map((id) => T.nodes.get(id)).filter((n) => poolOf(S, n) === p.id).map((n) => n.section))].some(over)
      : over(undefined);
    if (bad) out.add('budget', { pool: p.id }, `${p.id} is over budget`);
  }

  for (const [sid, entries] of Object.entries(build.slots || {})) {
    const slot = T.slots.get(sid);
    if (!slot) continue;
    const seen = new Set();
    entries.forEach((e, i) => {
      if (e === null) return;
      if (i >= (slot.count ?? 1) || !holds(slot.unlock?.[i], S) || !T.accepts(slot, e) || (slot.unique !== false && seen.has(e))) {
        out.add('slot', { slot: sid }, `${sid}[${i}]: ${e} can't go here`);
      }
      seen.add(e);
    });
  }
  return out.list;
}

/** Check a whole build: `{ ok, errors, warnings }`. */
export function validate(tree, build) {
  const S = state(tree, build);
  const errors = errorsOf(S);
  // A step is early only for errors the whole build doesn't have.
  const known = new Set(errors.map(problemKey));
  const warnings = new Problems();
  const ranks = {};
  for (const st of build.steps || []) {
    if (!S.T.nodes.has(st.node)) continue;
    ranks[st.node] = st.rank ?? (ranks[st.node] ?? 0) + 1;
    const prefix = { ...build, ranks: { ...ranks }, steps: undefined, context: { ...build.context, level: st.level ?? S.level } };
    if (errorsOf(state(S.base, prefix)).some((p) => !known.has(problemKey(p)))) warnings.add('order', { node: st.node }, `${st.node} is taken too early`);
  }
  return { ok: !errors.length, errors, warnings: warnings.list };
}

/** Stat totals by stat id: node and option stats at rank (hard plus bonus), plus synergies. */
export function totals(tree, build) {
  const S = state(tree, build);
  const out = {};
  const add = (id, v) => {
    if (Array.isArray(v)) {
      const cur = Array.isArray(out[id]) ? out[id] : [];
      out[id] = v.map((x, i) => (cur[i] ?? 0) + x);
    } else out[id] = (out[id] ?? 0) + v;
  };
  const addStats = (stats, r) => {
    for (const st of stats || []) if (st.values?.length) add(st.id, st.values[Math.min(r, st.values.length) - 1]);
  };
  for (const [id, hard] of S.taken) {
    const n = S.T.nodes.get(id);
    const r = hard + (build.bonusRanks?.[id] ?? 0);
    addStats(n.stats, r);
    addStats(n.options?.find((o) => o.id === build.options?.[id])?.stats, r);
    for (const syn of n.synergy || []) add(syn.stat, syn.perRank * rank(S, syn.from));
  }
  return out;
}
