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
  items('nodes').forEach(([n, i]) => {
    if (!ids.sections.has(n.section)) bad(`/nodes/${i}/section`, `names unknown section ${n.section}`);
    pools(`/nodes/${i}/pool`, n.pool);
    // A noPath start conducts nothing, so a build could never path out of it.
    if (n.start === true && n.noPath === true) bad(`/nodes/${i}/noPath`, 'must not be set on a start node');
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

// A template attached with `as` becomes a section of that id whose nodes are
// `<as>/<nodeId>`. The instanced tree is cached per set of instances.
function effective(tree, build) {
  const inst = (build.attach || []).filter((a) => a.as && tree.sections.has(a.section));
  if (!inst.length) return tree;
  const key = JSON.stringify(inst.map((a) => [a.as, a.section]));
  let out = tree.instances.get(key);
  if (out) return out;
  const json = { ...tree.json, sections: [...tree.json.sections], nodes: [...tree.json.nodes], edges: [...(tree.json.edges || [])] };
  for (const a of inst) {
    const ids = new Set(tree.sectionNodes.get(a.section) || []);
    const re = (id) => (ids.has(id) ? `${a.as}/${id}` : id);
    const s = tree.sections.get(a.section);
    json.sections.push({ ...s, id: a.as, template: false, ...(s.ports && { ports: s.ports.map(re) }) });
    for (const n of tree.json.nodes) if (ids.has(n.id)) json.nodes.push({ ...n, id: re(n.id), section: a.as });
    for (const e of tree.json.edges || []) if (ids.has(e.from) && ids.has(e.to)) json.edges.push({ ...e, from: re(e.from), to: re(e.to) });
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
    taken: new Map(),
  };
  for (const a of build.attach || []) {
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
  S.taken.clear();
  for (const n of S.T.json.nodes) {
    if (!S.active.get(n.section)) continue;
    let r;
    if (n.granted || n.id === S.build.start || S.slotted.has(n.id)) r = 1;
    else r = S.T.slotOf.has(n.id) ? 0 : S.ranks[n.id] ?? 0;
    if (r > 0) S.taken.set(n.id, r);
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
const free = (S, n) => !!(n.granted || n.id === S.build.start || S.slotted.has(n.id));
const isPath = (S, n) => S.T.sections.get(n.section)?.connectivity === 'path';
const neighbours = (S, id) => [...(S.T.links.get(id) || []), ...(S.extra.get(id) || [])];

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
  S.reached = new Set(S.roots);
  const queue = [...S.roots];
  while (queue.length) {
    for (const v of neighbours(S, queue.pop())) {
      if (S.reached.has(v) || !S.taken.has(v)) continue;
      const n = T.nodes.get(v);
      if (n.start && !S.roots.has(v)) continue;
      S.reached.add(v);
      if (!n.noPath) queue.push(v);
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

// Taken nodes (listed in ranks) that fail an arrow, gate, req, unlock,
// section req or path, with the codes they fail.
function broken(S) {
  const out = new Map();
  for (const id of S.taken.keys()) {
    const n = S.T.nodes.get(id);
    if (free(S, n)) continue;
    const codes = new Set();
    if (!firstRankHolds(S, n) || !sectionHolds(S, n.section)) codes.add('requirement');
    if (isPath(S, n) && !S.reached.has(id)) codes.add('connectivity');
    if (codes.size) out.set(id, codes);
  }
  return out;
}

function refundCheck(tree, build, nodeId) {
  const S = state(tree, build);
  const n = S.T.nodes.get(nodeId);
  if (!n) return { ok: false, codes: ['unknown-id'], cascade: [] };
  if ((n.granted && S.taken.has(nodeId)) || nodeId === build.start) return { ok: false, codes: ['granted'], cascade: [] };
  if (S.slotted.has(nodeId)) return { ok: false, codes: ['slot'], cascade: [] };
  if (!S.ranks[nodeId]) return { ok: false, codes: ['rank'], cascade: [] };
  const before = broken(S);
  const ranks = { ...S.ranks, [nodeId]: S.ranks[nodeId] - 1 };
  if (!ranks[nodeId]) delete ranks[nodeId];
  // Whatever breaks is taken off too, until nothing else does.
  const cascade = new Map();
  for (;;) {
    const fresh = [...broken(state(S.base, { ...build, ranks }))]
      .filter(([id]) => id !== nodeId && !before.has(id) && !cascade.has(id));
    if (!fresh.length) break;
    for (const [id, codes] of fresh) {
      cascade.set(id, codes);
      delete ranks[id];
    }
  }
  const codes = [...new Set([...cascade.values()].flatMap((c) => [...c]))];
  return { ok: !cascade.size, codes, cascade: [...cascade.keys()] };
}

/** Can one rank come off? `{ ok, codes, cascade }`: cascade is every other node that would break. */
export function canRefund(tree, build, nodeId) {
  return refundCheck(tree, build, nodeId);
}

/**
 * Take one rank off. `{ ok, codes, cascade, build }`. With `{ cascade: true }`
 * a refund that breaks other nodes takes them off too (PoE); without it, it's refused (WoW).
 */
export function refund(tree, build, nodeId, { cascade: apply = false } = {}) {
  const res = refundCheck(tree, build, nodeId);
  const cascades = res.cascade.length && res.codes.every((c) => c === 'requirement' || c === 'connectivity');
  if (!res.ok && !(apply && cascades)) return { ...res, build };
  const out = clone(build);
  const drop = (id) => {
    delete out.ranks[id];
    if (out.options) delete out.options[id];
    if (out.paidFrom) delete out.paidFrom[id];
  };
  out.ranks[nodeId] -= 1;
  if (!out.ranks[nodeId]) drop(nodeId);
  res.cascade.forEach(drop);
  return { ...res, ok: true, build: out };
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
    if (n.start) out.start = id;
    else if (n.options) {
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
  return S.T.json.nodes.map((n) => n.id).filter((id) => !allocCodes(S, id).length);
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

class Problems {
  constructor() {
    this.list = [];
    this.keys = new Set();
  }

  add(code, ids = {}, message = code) {
    const key = [code, ...ID_KEYS.map((k) => ids[k] ?? '')].join('|');
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
  if (build.start !== undefined && !T.nodes.has(build.start)) unknown(build.start, 'node');
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
  for (const a of build.attach || []) {
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

  const sections = new Set();
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
    if ((S.ranks[id] ?? 0) > (n.ranks ?? 1)) out.add('rank', { node: id }, `${id} has at most ${n.ranks ?? 1} ranks`);
    if (free(S, n) && !S.slotted.has(id)) continue;
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

  for (const g of T.json.groups || []) {
    const m = g.members;
    if (m.nodes && g.pick?.max !== undefined && m.nodes.filter((id) => rank(S, id) > 0).length > g.pick.max) {
      out.add('exclusive', { group: g.id }, `at most ${g.pick.max} of ${g.id}`);
    }
    if (m.options && g.unique) {
      const seen = new Set();
      for (const id of S.taken.keys()) {
        if (id !== m.options && !id.endsWith(`/${m.options}`)) continue;
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
  const warnings = new Problems();
  const ranks = {};
  for (const st of build.steps || []) {
    if (!S.T.nodes.has(st.node)) continue;
    ranks[st.node] = st.rank ?? (ranks[st.node] ?? 0) + 1;
    const prefix = { ...build, ranks: { ...ranks }, steps: undefined, context: { ...build.context, level: st.level ?? S.level } };
    if (errorsOf(state(S.base, prefix)).length) warnings.add('order', { node: st.node }, `${st.node} is taken too early`);
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
