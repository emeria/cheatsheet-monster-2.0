// The lmg-tree layout resolver (Phase C): turns a layout file's placement
// modes, section transforms and edge paths into absolute node positions and
// drawable edge paths. See docs/layout.md and the Layouts section of
// docs/rules.md. One dependency-free ES module, like tree-core.js.
//
// Matrices are [a, b, c, d, e, f], the same as a layout's calibration and
// Canvas2D's setTransform: x' = a x + c y + e, y' = b x + d y + f.

const DEG = Math.PI / 180;

/** The identity matrix. */
export const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);

/** Apply a matrix to a point. */
export function apply(m, [x, y]) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** `outer` after `inner`: apply(multiply(outer, inner), p) = apply(outer, apply(inner, p)). */
export function multiply(outer, inner) {
  const [a, b, c, d, e, f] = outer;
  const [A, B, C, D, E, F] = inner;
  return [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
}

/** The inverse matrix. Throws on a singular one. */
export function invert(m) {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  if (!det || !Number.isFinite(det)) throw new RangeError('matrix is not invertible');
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

/** Rotation by degrees (clockwise on screen, where y points down) about a point. */
export function rotation(deg, [cx, cy] = [0, 0]) {
  const cos = Math.cos(deg * DEG);
  const sin = Math.sin(deg * DEG);
  // Snap the quarter turns, so 90 degrees gives exact grid positions.
  const r = (v) => (Math.abs(v - Math.round(v)) < 1e-12 ? Math.round(v) : v);
  const [C, S] = [r(cos), r(sin)];
  return [C, S, -S, C, cx - C * cx + S * cy, cy - S * cx - C * cy];
}

/** A section's transform: scale, then rotate (about the section's 0, 0), then translate by origin. */
export function sectionMatrix(section = {}) {
  const s = section.scale ?? 1;
  const r = rotation(section.rotate ?? 0);
  const [ox, oy] = section.origin ?? [0, 0];
  const m = multiply(r, [s, 0, 0, s, 0, 0]);
  m[4] += ox;
  m[5] += oy;
  return m;
}

/** The uniform scale of a similarity matrix (for radii). */
const scaleOf = (m) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

/**
 * Default node diameters by kind, in px. Spaces in source units (`"unit": "u"`,
 * PoE) use twice these. A layout node's `size` wins; `options.sizes` overrides
 * the table.
 */
export const SIZES = Object.freeze({
  small: 24, attribute: 24, notable: 36, keystone: 48, start: 40, mastery: 32,
  socket: 32, gate: 32, talent: 32, capstone: 40, skill: 36, rune: 24,
});

/** Where a polar node sits in its section: clockwise from north, as in the PoE export. */
export function polarPoint(polar, group, orbit, slot) {
  const centre = polar.groups?.[group];
  if (!centre) return null;
  const r = polar.radii?.[orbit];
  if (r === undefined) return null;
  const table = polar.angles?.[orbit] ?? polar.angles?.[String(orbit)];
  const count = polar.slots?.[orbit] ?? 1;
  const deg = table ? table[slot] : (360 * slot) / count;
  if (deg === undefined) return null;
  return [centre[0] + r * Math.sin(deg * DEG), centre[1] - r * Math.cos(deg * DEG)];
}

/** Where a grid node sits in its section: [col, row or tier - 1] x cell. */
export function gridPoint(cell, node) {
  const [cw, ch] = cell ?? [1, 1];
  const row = node.row ?? (node.tier !== undefined ? node.tier - 1 : 0);
  return [(node.col ?? 0) * cw, row * ch];
}

const idOf = (key) => {
  const i = key.indexOf('>');
  return [key.slice(0, i), key.slice(i + 1)];
};

// The tree as the build sees it: attachments with `as` add instanced
// sections whose nodes and edges are `<as>/<id>`, as in the engine.
function instances(tree, build) {
  const sections = [...tree.sections];
  const nodes = tree.nodes.map((n) => ({ node: n, from: n.id }));
  const edges = (tree.edges || []).map((e) => ({ edge: e, key: `${e.from}>${e.to}` }));
  const seen = new Set(sections.map((s) => s.id));
  for (const a of build?.attach || []) {
    if (!a.as || seen.has(a.as)) continue;
    const s = tree.sections.find((x) => x.id === a.section);
    if (!s) continue;
    seen.add(a.as);
    const ids = new Set(tree.nodes.filter((n) => n.section === a.section).map((n) => n.id));
    const re = (id) => (ids.has(id) ? `${a.as}/${id}` : id);
    sections.push({ ...s, id: a.as, template: false, layoutOf: a.section });
    for (const n of tree.nodes) if (ids.has(n.id)) nodes.push({ node: { ...n, id: re(n.id), section: a.as }, from: n.id });
    for (const e of tree.edges || []) {
      if (ids.has(e.from) && ids.has(e.to)) edges.push({ edge: { ...e, from: re(e.from), to: re(e.to) }, key: `${e.from}>${e.to}` });
    }
  }
  return { sections, nodes, edges };
}

/**
 * Resolve a layout against a tree (and optionally a build, for `attach`).
 *
 * Returns `{ nodes, list, edges, sections, bounds, problems }`:
 * - `nodes[id]`: `{ id, section, kind, at: [x, y], r, frame?, icon?, manual? }`, in layout space
 *   (whole pixels when the layout's space is `pixelArt`);
 * - `list`: the placed nodes in tree order;
 * - `edges[]`: `{ from, to, type, hidden, attach?, path }` (`attach` marks the link an attachment adds), where `path` is one of
 *   `{ kind: 'line', points: [a, b] }`, `{ kind: 'poly', points }`,
 *   `{ kind: 'curve', from, control, to }` (quadratic) or
 *   `{ kind: 'arc', center, radius, start, end, anticlockwise, from, to }` (Canvas2D angles);
 * - `sections[id]`: `{ mode, m, attached, template }`, `m` mapping section to layout space;
 * - `bounds`: `{ x, y, w, h }` around every placed node and its radius;
 * - `problems[]`: `{ code, node | section | edge }`: `unplaced`, `unknown-node`,
 *   `unknown-group`, `mode` (a mode this resolver doesn't place, i.e. `auto`).
 */
export function resolve(tree, layout, options = {}) {
  const json = tree?.json ?? tree;
  const { build, sizes } = options;
  const L = layout || {};
  const unitScale = L.space?.unit === 'u' ? 2 : 1;
  const sizeTable = { ...SIZES, ...sizes };
  const { sections, nodes, edges } = instances(json, build);
  const problems = [];
  const sectionLayout = (s) => L.sections?.[s.id] ?? (s.layoutOf && L.sections?.[s.layoutOf]) ?? { mode: 'absolute' };
  const sectionById = new Map(sections.map((s) => [s.id, s]));

  // Section matrices, before attachments.
  const out = { nodes: {}, list: [], edges: [], sections: {}, bounds: { x: 0, y: 0, w: 0, h: 0 }, problems };
  for (const s of sections) {
    const sl = sectionLayout(s);
    out.sections[s.id] = { mode: sl.mode, m: sectionMatrix(sl), attached: false, template: !!s.template };
    if (sl.mode === 'auto') problems.push({ code: 'mode', section: s.id });
  }

  // Placement in section coordinates.
  const local = new Map();
  const treeIds = new Set(nodes.map((x) => x.node.id));
  for (const { node: n, from } of nodes) {
    const s = sectionById.get(n.section);
    const sl = s ? sectionLayout(s) : { mode: 'absolute' };
    const ln = L.nodes?.[n.id] ?? L.nodes?.[from] ?? {};
    let p = ln.at ?? null;
    if (!p && sl.mode === 'grid') p = gridPoint(sl.cell, n);
    if (!p && sl.mode === 'polar' && ln.group !== undefined) {
      p = polarPoint(sl.polar || {}, ln.group, ln.orbit ?? 0, ln.slot ?? 0);
      if (!p && !sl.polar?.groups?.[ln.group]) problems.push({ code: 'unknown-group', node: n.id });
    }
    if (!p) {
      problems.push({ code: 'unplaced', node: n.id });
      continue;
    }
    local.set(n.id, { n, ln, p });
  }
  for (const id of Object.keys(L.nodes || {})) if (!treeIds.has(id)) problems.push({ code: 'unknown-node', node: id });

  // Attachments: rotate by attach.rotate and move the section so its via
  // node sits one link-step past the at node.
  const joins = [];
  const place = (id) => {
    const x = local.get(id);
    return x && apply(out.sections[x.n.section].m, x.p);
  };
  for (const a of build?.attach || []) {
    const sid = a.as ?? a.section;
    const sec = out.sections[sid];
    const host = local.get(a.at);
    if (!sec || !host) continue;
    const ports = sectionById.get(sid)?.ports || [];
    const via = [a.as && a.via && `${a.as}/${a.via}`, a.via, ports[0]].find((v) => v && local.get(v)?.n.section === sid);
    if (!via) continue;
    const target = place(a.at);
    const step = attachStep(json, local, out.sections, a.at, host.n.section);
    const goal = [target[0] + step[0], target[1] + step[1]];
    const pinned = apply(sec.m, local.get(via).p);
    let m = multiply(rotation(a.rotate ?? 0, pinned), sec.m);
    m = multiply([1, 0, 0, 1, goal[0] - pinned[0], goal[1] - pinned[1]], m);
    sec.m = m;
    sec.attached = true;
    joins.push({ from: a.at, to: via });
  }

  // Absolute positions and radii.
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { node: n } of nodes) {
    const x = local.get(n.id);
    if (!x) continue;
    const m = out.sections[n.section].m;
    let at = apply(m, x.p);
    if (L.space?.pixelArt) at = at.map(Math.round);
    const kind = n.kind ?? 'small';
    const size = x.ln.size ?? (sizeTable[kind] ?? sizeTable.small) * unitScale;
    const r = (size / 2) * scaleOf(m);
    const rec = { id: n.id, section: n.section, kind, at, r };
    for (const k of ['frame', 'icon', 'manual']) if (x.ln[k] !== undefined) rec[k] = x.ln[k];
    out.nodes[n.id] = rec;
    out.list.push(rec);
    x0 = Math.min(x0, at[0] - r);
    y0 = Math.min(y0, at[1] - r);
    x1 = Math.max(x1, at[0] + r);
    y1 = Math.max(y1, at[1] + r);
  }
  if (out.list.length) out.bounds = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };

  // Edges: geometry is in the from node's section coordinates.
  for (const { edge: e, key } of edges) {
    const a = out.nodes[e.from];
    const b = out.nodes[e.to];
    if (!a || !b) continue;
    const le = L.edges?.[`${e.from}>${e.to}`] ?? L.edges?.[key] ?? {};
    const m = out.sections[a.section].m;
    out.edges.push({ from: e.from, to: e.to, type: e.type ?? 'link', hidden: !!le.hidden, path: edgePath(le, a.at, b.at, m) });
  }
  // The link an attachment makes, from the at node to the via node.
  for (const j of joins) {
    const a = out.nodes[j.from];
    const b = out.nodes[j.to];
    if (a && b) out.edges.push({ from: j.from, to: j.to, type: 'link', hidden: false, attach: true, path: edgePath({}, a.at, b.at) });
  }
  return out;
}

// One link-step past the at node: from its first linked neighbour in the
// host section towards it, with that link's length. None when it has no link.
function attachStep(json, local, secs, at, hostSection) {
  for (const e of json.edges || []) {
    if ((e.type ?? 'link') !== 'link' || (e.from !== at && e.to !== at)) continue;
    const other = e.from === at ? e.to : e.from;
    const o = local.get(other);
    if (!o || o.n.section !== hostSection) continue;
    const p = apply(secs[hostSection].m, local.get(at).p);
    const q = apply(secs[hostSection].m, o.p);
    return [p[0] - q[0], p[1] - q[1]];
  }
  return [0, 0];
}

/** A drawable path for one edge, in layout space. */
export function edgePath(le, from, to, m = IDENTITY) {
  const kind = le.path ?? 'straight';
  if (kind === 'poly' && le.points?.length) return { kind: 'poly', points: [from, ...le.points.map((p) => apply(m, p)), to] };
  if (kind === 'curve' && le.control) return { kind: 'curve', from, control: apply(m, le.control), to };
  if (kind === 'arc' && le.center && le.radius) {
    const center = apply(m, le.center);
    const radius = le.radius * scaleOf(m);
    const start = Math.atan2(from[1] - center[1], from[0] - center[0]);
    const end = Math.atan2(to[1] - center[1], to[0] - center[0]);
    // The shorter way round, as PoE draws orbit links.
    let d = end - start;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d <= -Math.PI) d += 2 * Math.PI;
    return { kind: 'arc', center, radius, start, end, anticlockwise: d < 0, from, to };
  }
  return { kind: 'line', points: [from, to] };
}

/** Points along a path (for hit-testing edges, SVG export or tests). `steps` per arc or curve. */
export function pathPoints(path, steps = 16) {
  if (path.kind === 'line' || path.kind === 'poly') return path.points;
  const out = [];
  if (path.kind === 'curve') {
    const [a, c, b] = [path.from, path.control, path.to];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return out;
  }
  let d = path.end - path.start;
  if (path.anticlockwise) while (d > 0) d -= 2 * Math.PI;
  else while (d < 0) d += 2 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const t = path.start + (d * i) / steps;
    out.push([path.center[0] + path.radius * Math.cos(t), path.center[1] + path.radius * Math.sin(t)]);
  }
  return out;
}

/**
 * Turn a layout-space point back into a section's own coordinates, so a
 * placement (from snapping or a drag) can be saved as that node's `at`.
 */
export function toSection(resolved, sectionId, p) {
  return apply(invert(resolved.sections[sectionId].m), p);
}
