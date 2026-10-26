// The lmg-tree Canvas2D renderer (Phase C): node states, search, hit-testing,
// tooltips, pan and zoom, and drawing a resolved layout. See docs/layout.md.
//
// The pure parts (nodeStates, searchNodes, hitTest, tooltip, the view maths
// and styles) need no DOM and run in Node. `draw` takes a 2D context, and
// `TreeView` wires a canvas element's pointer events to the rest.

import { canAllocate, frontier, pathTo, allocate, refund, load } from './tree-core.js';
import { resolve, invert, apply } from './tree-layout.js';
import { glyphFor, drawGlyph } from './tree-glyphs.js';

export const STATES = Object.freeze(['locked', 'available', 'allocated', 'partial', 'hover', 'search-hit', 'path-preview']);

// ---------------------------------------------------------------- state

const rawTree = (tree) => tree?.json ?? tree;

// Hard ranks as the renderer shows them: the build's ranks, plus granted
// nodes, the start and slotted nodes at rank 1.
function shownRanks(tree, build) {
  const json = rawTree(tree);
  const slotted = new Set(Object.values(build?.slots || {}).flat().filter((x) => typeof x === 'string'));
  const out = new Map();
  for (const n of json.nodes) {
    const r = n.granted || n.id === build?.start || slotted.has(n.id) ? 1 : build?.ranks?.[n.id] ?? 0;
    if (r > 0) out.set(n.id, r);
  }
  for (const [id, r] of Object.entries(build?.ranks || {})) if (!out.has(id) && r > 0) out.set(id, r);
  return out;
}

/**
 * The state of every node: `Map<id, { state, rank, max, hover, searchHit, preview }>`.
 * `state` is `allocated` (all ranks), `partial` (some), `available` (in the
 * engine's frontier) or `locked`. The overlay flags come from `options`:
 * `hover` (a node id), `search` (a Set of ids), `preview` (a list of ids).
 * Pass a precomputed `frontier` to skip the engine call. `resolved` adds
 * instanced nodes (`<as>/<id>`) that the tree itself doesn't list.
 */
export function nodeStates(tree, build, resolved, options = {}) {
  const json = rawTree(tree);
  const ranks = shownRanks(tree, build);
  const open = new Set(options.frontier ?? frontier(tree, build || {}));
  const search = options.search ?? new Set();
  const preview = new Set(options.preview || []);
  const max = new Map(json.nodes.map((n) => [n.id, n.ranks ?? 1]));
  const ids = resolved ? resolved.list.map((n) => n.id) : json.nodes.map((n) => n.id);
  const out = new Map();
  for (const id of ids) {
    const m = max.get(id) ?? max.get(id.slice(id.indexOf('/') + 1)) ?? 1;
    const rank = ranks.get(id) ?? 0;
    const state = rank >= m ? 'allocated' : rank > 0 ? 'partial' : open.has(id) ? 'available' : 'locked';
    out.set(id, { state, rank, max: m, hover: id === options.hover, searchHit: search.has(id), preview: preview.has(id) });
  }
  return out;
}

/**
 * Nodes matching a search. Each word must match a tag (whole, its prefix
 * before `:`, or its part after `:`) or appear in the node's name or id.
 * Case is ignored. `fire` and `dmg:fire` both find a `dmg:fire` node.
 */
export function searchNodes(tree, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set();
  if (!words.length) return out;
  for (const n of rawTree(tree).nodes) {
    const tags = (n.tags || []).map((t) => t.toLowerCase());
    const text = `${n.name ?? ''} ${n.id}`.toLowerCase();
    const hit = (w) => tags.some((t) => t === w || t.startsWith(`${w}:`) || t.slice(t.indexOf(':') + 1) === w) || text.includes(w);
    if (words.every(hit)) out.add(n.id);
  }
  return out;
}

// ---------------------------------------------------------------- hit test

/**
 * The node under a layout-space point: the nearest one whose centre is within
 * its radius (plus `slop`). Null when there's none. `skip(id)` leaves nodes out.
 */
export function hitTest(resolved, [x, y], { slop = 0, skip } = {}) {
  let best = null;
  let bestD = Infinity;
  for (const n of resolved.list) {
    const d = Math.hypot(n.at[0] - x, n.at[1] - y);
    if (d <= n.r + slop && d < bestD && !(skip && skip(n.id))) {
      best = n.id;
      bestD = d;
    }
  }
  return best;
}

// ---------------------------------------------------------------- tooltips

const nameOf = (map, id) => map.get(id)?.name ?? id;

/** A short reason for one canAllocate code. */
export function reasonText(tree, nodeId, code) {
  const T = load(tree);
  const n = T.nodes.get(nodeId);
  switch (code) {
    case 'budget': {
      const pools = [].concat(n?.pool ?? T.sections.get(n?.section)?.pool ?? []);
      return `Not enough ${pools.map((p) => nameOf(T.pools, p)).join(' or ') || 'points'}`;
    }
    case 'requirement': return 'Requirements not met';
    case 'connectivity': return n?.start ? 'Start nodes are chosen, not allocated' : 'Not connected';
    case 'exclusive': {
      const g = (T.json.groups || []).find((x) => x.members?.nodes?.includes(nodeId));
      return g ? `Pick: only ${g.pick?.max ?? 1} of ${g.name ?? g.id}` : 'Another choice is taken';
    }
    case 'inactive': return `${nameOf(T.sections, n?.section)} is not active`;
    case 'rank': return 'Max rank';
    case 'slot': return 'Goes in a slot';
    case 'option': return 'Pick an option';
    case 'unknown-id': return 'Not in this tree';
    default: return code;
  }
}

const fill = (text, values) => (text || '').replace(/\{(\d+)\}/g, (_, i) => String(values?.[i] ?? '?'));

/**
 * What a tooltip shows: `{ id, title, kind, rank, max, lines, tags, ok, reasons }`.
 * `lines` are the node's stat lines at its rank (or rank 1 when untaken).
 * `reasons` come from canAllocate's codes (or its `reasons`, when it gives them).
 */
export function tooltip(tree, build, nodeId) {
  const T = load(tree);
  const n = T.nodes.get(nodeId) ?? T.nodes.get(nodeId.slice(nodeId.indexOf('/') + 1));
  if (!n) return null;
  const rank = shownRanks(tree, build).get(nodeId) ?? 0;
  const max = n.ranks ?? 1;
  const at = Math.max(rank, 1);
  const lines = (n.stats || []).map((s) => {
    if (!s.values?.length) return s.text ?? s.id;
    const v = s.values[Math.min(at, s.values.length) - 1];
    return fill(s.text ?? s.id, Array.isArray(v) ? v : [v]);
  });
  const check = canAllocate(tree, build || {}, nodeId);
  const reasons = check.reasons ?? (check.ok ? [] : check.codes.map((c) => reasonText(tree, nodeId, c)));
  return { id: nodeId, title: n.name ?? n.id, kind: n.kind ?? 'small', rank, max, lines, tags: n.tags || [], ok: check.ok, reasons };
}

// ---------------------------------------------------------------- view

/** A view maps layout space to screen: screen = world x k + [x, y]. */
export const worldToScreen = (v, [x, y]) => [x * v.k + v.x, y * v.k + v.y];
export const screenToWorld = (v, [x, y]) => [(x - v.x) / v.k, (y - v.y) / v.k];

/** Zoom by `factor` about a screen point, clamped to [min, max]. */
export function zoomAt(v, [sx, sy], factor, { min = 0.02, max = 8 } = {}) {
  const k = Math.min(max, Math.max(min, v.k * factor));
  const f = k / v.k;
  return { k, x: sx - (sx - v.x) * f, y: sy - (sy - v.y) * f };
}

/** Pan by a screen delta. */
export const panBy = (v, [dx, dy]) => ({ ...v, x: v.x + dx, y: v.y + dy });

/** The view that fits bounds `{ x, y, w, h }` into a w x h screen with `pad` pixels round it. */
export function fitView(b, w, h, pad = 16) {
  const k = Math.min((w - 2 * pad) / Math.max(b.w, 1e-9), (h - 2 * pad) / Math.max(b.h, 1e-9));
  return { k, x: (w - b.w * k) / 2 - b.x * k, y: (h - b.h * k) / 2 - b.y * k };
}

// ---------------------------------------------------------------- styles

/** The default theme, used for anything a layout's theme leaves out. */
export const DEFAULT_THEME = Object.freeze({
  ramps: {
    frame: ['#1b1f2a', '#33394a', '#5d6680', '#9aa5c0', '#e3e8f4'],
    allocated: ['#3a2410', '#6e4618', '#b07a2a', '#e2b45a', '#fbe7b0'],
    hit: ['#173018', '#2c5a2a', '#4f9a45', '#8fd67a', '#d8f7c8'],
    preview: ['#102a36', '#1d4e63', '#2f86a6', '#6cc4de', '#c8eef8'],
  },
  states: {
    locked: { ramp: 'frame', dim: 1 },
    available: { ramp: 'frame', lift: 1 },
    allocated: { ramp: 'allocated', glow: true },
    partial: { ramp: 'allocated', dim: 1 },
    hover: { ramp: 'frame', lift: 2 },
    'search-hit': { ramp: 'hit', lift: 1, glow: true },
    'path-preview': { ramp: 'preview', lift: 1 },
  },
});

/**
 * Colours for one state: `{ fill, stroke, glyph, line, glow }`. A state's ramp
 * centre is step 2, moved `dim` steps darker or `lift` steps lighter; the
 * fill is two steps below it and outlines use the darkest step, never black.
 */
export function stateStyle(theme, state) {
  const ramps = { ...DEFAULT_THEME.ramps, ...theme?.ramps };
  const s = theme?.states?.[state] ?? DEFAULT_THEME.states[state] ?? DEFAULT_THEME.states.locked;
  const ramp = ramps[s.ramp] ?? ramps.frame;
  const i = Math.max(0, Math.min(4, 2 - (s.dim ?? 0) + (s.lift ?? 0)));
  return { fill: ramp[Math.max(0, i - 2)], stroke: ramp[i], glyph: ramp[Math.min(4, i + 1)], line: ramp[i], outline: ramp[0], glow: !!s.glow };
}

// ---------------------------------------------------------------- drawing

const SQUARE = new Set(['talent', 'capstone', 'skill']);
const HEX = new Set(['socket']);

function framePath(ctx, shape, x, y, r) {
  ctx.beginPath();
  if (SQUARE.has(shape)) ctx.rect(x - r, y - r, 2 * r, 2 * r);
  else if (HEX.has(shape)) {
    for (let i = 0; i < 6; i++) {
      const t = (Math.PI / 3) * i;
      const [px, py] = [x + r * Math.cos(t), y + r * Math.sin(t)];
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
  } else ctx.arc(x, y, r, 0, Math.PI * 2);
}

function tracePath(ctx, p) {
  ctx.beginPath();
  if (p.kind === 'arc') {
    ctx.moveTo(p.from[0], p.from[1]);
    ctx.arc(p.center[0], p.center[1], p.radius, p.start, p.end, p.anticlockwise);
  } else if (p.kind === 'curve') {
    ctx.moveTo(p.from[0], p.from[1]);
    ctx.quadraticCurveTo(p.control[0], p.control[1], p.to[0], p.to[1]);
  } else p.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

// Where an arrow ends: the last segment, cut back to the target's radius.
function arrowTip(p, r) {
  const pts = p.kind === 'curve' ? [p.control, p.to] : p.kind === 'arc' ? [p.from, p.to] : p.points.slice(-2);
  const [a, b] = pts;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  return { tip: [b[0] - u[0] * r, b[1] - u[1] * r], u };
}

function edgeState(states, e) {
  const a = states.get(e.from);
  const b = states.get(e.to);
  const on = (s) => s && (s.state === 'allocated' || s.state === 'partial');
  if (on(a) && on(b)) return 'allocated';
  if ((a?.preview || on(a)) && (b?.preview || on(b)) && (a?.preview || b?.preview)) return 'path-preview';
  return 'locked';
}

/** The order `draw` paints its layers in. */
export const LAYERS = Object.freeze(['background', 'links', 'arrows', 'frames', 'icons', 'overlays']);

/**
 * Draw a scene on a 2D context.
 *
 * `scene`: `{ tree, resolved, states, theme?, layout?, images?, width, height, sectionVisible? }`.
 * `view`: `{ x, y, k }`. `images` maps background file names to drawable images.
 * With a layout `calibration`, layout space is the art's pixels and the tree is
 * drawn through `calibration.m`. `options.onLayer(name)` is called before each layer.
 */
export function draw(ctx, scene, view, options = {}) {
  const { resolved, states } = scene;
  const theme = scene.theme ?? scene.layout?.theme;
  const T = rawTree(scene.tree);
  const nodesById = new Map(T.nodes.map((n) => [n.id, n]));
  const nodeOf = (id) => nodesById.get(id) ?? nodesById.get(id.slice(id.indexOf('/') + 1));
  const visible = scene.sectionVisible ?? defaultVisible(scene);
  const layer = (name) => options.onLayer?.(name);
  const k = view.k;
  const cal = scene.layout?.calibration?.m;
  const px = 1 / k / (cal ? Math.sqrt(Math.abs(cal[0] * cal[3] - cal[1] * cal[2])) : 1);

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, scene.width ?? ctx.canvas?.width ?? 0, scene.height ?? ctx.canvas?.height ?? 0);
  ctx.restore();
  ctx.save();
  const dpr = scene.dpr ?? 1;
  ctx.setTransform(k * dpr, 0, 0, k * dpr, view.x * dpr, view.y * dpr);
  if (scene.layout?.space?.pixelArt) ctx.imageSmoothingEnabled = false;

  layer('background');
  for (const b of scene.layout?.background || []) {
    const img = scene.images?.[b.file];
    if (!img) continue;
    ctx.globalAlpha = b.opacity ?? 1;
    ctx.drawImage(img, b.x ?? 0, b.y ?? 0, b.w ?? img.width, b.h ?? img.height);
    ctx.globalAlpha = 1;
  }
  if (cal) ctx.transform(...cal);

  const shownNode = (id) => {
    const n = resolved.nodes[id];
    return n && visible(n.section);
  };
  const edges = resolved.edges.filter((e) => !e.hidden && shownNode(e.from) && shownNode(e.to));

  for (const [name, type] of [['links', 'link'], ['arrows', 'arrow']]) {
    layer(name);
    for (const e of edges) {
      if ((e.type === 'arrow') !== (type === 'arrow')) continue;
      const st = stateStyle(theme, edgeState(states, e));
      ctx.strokeStyle = st.line;
      ctx.lineWidth = Math.max(2 * px, resolved.nodes[e.to].r * 0.16);
      tracePath(ctx, e.path);
      ctx.stroke();
      if (type === 'arrow') {
        const r = resolved.nodes[e.to].r;
        const { tip, u } = arrowTip(e.path, r);
        const h = Math.max(6 * px, r * 0.45);
        ctx.fillStyle = st.line;
        ctx.beginPath();
        ctx.moveTo(tip[0], tip[1]);
        ctx.lineTo(tip[0] - u[0] * h - u[1] * h * 0.6, tip[1] - u[1] * h + u[0] * h * 0.6);
        ctx.lineTo(tip[0] - u[0] * h + u[1] * h * 0.6, tip[1] - u[1] * h - u[0] * h * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  const shown = resolved.list.filter((n) => visible(n.section));
  layer('frames');
  for (const n of shown) {
    const s = states.get(n.id) ?? { state: 'locked' };
    const st = stateStyle(theme, s.state);
    const shape = n.frame ?? n.kind;
    if (st.glow) {
      ctx.fillStyle = st.stroke;
      ctx.globalAlpha = 0.3;
      framePath(ctx, shape, n.at[0], n.at[1], n.r * 1.3);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    framePath(ctx, shape, n.at[0], n.at[1], n.r);
    ctx.fillStyle = st.fill;
    ctx.fill();
    ctx.strokeStyle = st.outline;
    ctx.lineWidth = Math.max(2 * px, n.r * 0.22);
    ctx.stroke();
    ctx.strokeStyle = st.stroke;
    ctx.lineWidth = Math.max(1 * px, n.r * (shape === 'notable' || shape === 'keystone' ? 0.18 : 0.12));
    ctx.stroke();
  }

  layer('icons');
  for (const n of shown) {
    if (n.r / px < 4) continue; // too small to read
    const s = states.get(n.id) ?? { state: 'locked' };
    const g = glyphFor({ ...nodeOf(n.id), kind: n.kind });
    drawGlyph(ctx, g.shapes, n.at[0], n.at[1], n.r * 0.62, stateStyle(theme, s.state).glyph);
  }

  layer('overlays');
  for (const n of shown) {
    const s = states.get(n.id);
    if (!s) continue;
    const ring = (state, scale, width) => {
      ctx.strokeStyle = stateStyle(theme, state).stroke;
      ctx.lineWidth = Math.max(width * px, n.r * 0.12);
      framePath(ctx, n.frame ?? n.kind, n.at[0], n.at[1], n.r * scale);
      ctx.stroke();
    };
    if (s.preview) ring('path-preview', 1.18, 2);
    if (s.searchHit) ring('search-hit', 1.32, 3);
    if (s.hover) ring('hover', 1.1, 2);
    if (s.max > 1 && n.r / px >= 9) {
      const fs = n.r * 0.55;
      ctx.font = `bold ${fs}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const [bx, by] = [n.at[0] + n.r * 0.75, n.at[1] + n.r * 0.85];
      ctx.fillStyle = stateStyle(theme, 'locked').outline;
      ctx.fillRect(bx - fs, by - fs * 0.6, fs * 2, fs * 1.2);
      ctx.fillStyle = stateStyle(theme, s.state).glyph;
      ctx.fillText(`${s.rank}/${s.max}`, bx, by);
    }
  }
  ctx.restore();
}

// Sections drawn by default: not an unused template, and not a board that
// is only drawn when attached.
function defaultVisible(scene) {
  const T = rawTree(scene.tree);
  const port = new Set(T.sections.filter((s) => s.active?.port).map((s) => s.id));
  return (sid) => {
    const r = scene.resolved.sections[sid];
    if (!r) return true;
    if (r.attached) return true;
    return !r.template && !port.has(sid);
  };
}

/**
 * Draw a tooltip box (from `tooltip()`) next to a screen point, in screen
 * pixels. Optional: a page can show its own DOM tooltip instead.
 */
export function drawTooltip(ctx, tip, [sx, sy], { theme, dpr = 1, font = 13 } = {}) {
  if (!tip) return;
  const body = stateStyle(theme, 'locked');
  const head = stateStyle(theme, 'allocated');
  const rows = [
    { text: tip.max > 1 ? `${tip.title}  ${tip.rank}/${tip.max}` : tip.title, bold: true, color: head.glyph },
    ...tip.lines.map((text) => ({ text, color: '#f2f2f2' })),
    ...tip.reasons.map((text) => ({ text, color: '#f0a090' })),
  ];
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const lh = font * 1.35;
  let w = 0;
  for (const r of rows) {
    ctx.font = `${r.bold ? 'bold ' : ''}${font}px sans-serif`;
    w = Math.max(w, ctx.measureText(r.text).width);
  }
  const [x, y] = [sx + 14, sy + 14];
  ctx.fillStyle = body.outline;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(x, y, w + 16, rows.length * lh + 10);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = body.stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w + 15, rows.length * lh + 9);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  rows.forEach((r, i) => {
    ctx.font = `${r.bold ? 'bold ' : ''}${font}px sans-serif`;
    ctx.fillStyle = r.color;
    ctx.fillText(r.text, x + 8, y + 6 + i * lh);
  });
  ctx.restore();
}

// ---------------------------------------------------------------- view widget

/**
 * A canvas widget over the rest: drag to pan, wheel to zoom, hover for a
 * tooltip and path preview, click to allocate (along the path in path
 * sections), right-click to refund.
 *
 * `new TreeView(canvas, { tree, layout, build, images, onChange, readOnly, cascade })`;
 * `cascade` (default true) lets a refund take off the nodes it breaks (PoE). `onChange(build)`
 * is called with each new build; `setBuild`, `setSearch` and `fit` update it.
 * `destroy()` removes its listeners.
 */
export class TreeView {
  constructor(canvas, { tree, layout, build = {}, images, onChange, readOnly = false, cascade = true } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tree = load(tree);
    this.layout = layout;
    this.images = images;
    this.onChange = onChange;
    this.readOnly = readOnly;
    this.cascade = cascade;
    this.search = new Set();
    this.hover = null;
    this.preview = [];
    this.pointer = null;
    this.setBuild(build, { silent: true });
    this.fit();
    this.listeners = [];
    const on = (type, fn, opts) => {
      canvas.addEventListener(type, fn, opts);
      this.listeners.push([type, fn, opts]);
    };
    let drag = null;
    on('pointerdown', (e) => {
      drag = { x: e.offsetX, y: e.offsetY, moved: false };
      canvas.setPointerCapture?.(e.pointerId);
    });
    on('pointermove', (e) => {
      const p = [e.offsetX, e.offsetY];
      if (drag) {
        const d = [p[0] - drag.x, p[1] - drag.y];
        if (drag.moved || Math.hypot(d[0], d[1]) > 3) {
          drag.moved = true;
          this.view = panBy(this.view, d);
          drag.x = p[0];
          drag.y = p[1];
        }
      }
      this.pointer = p;
      this.setHover(drag?.moved ? null : this.nodeAt(p));
      this.requestDraw();
    });
    on('pointerup', (e) => {
      const click = drag && !drag.moved;
      drag = null;
      if (click && e.button === 0) this.click(this.nodeAt([e.offsetX, e.offsetY]));
    });
    on('pointerleave', () => {
      drag = null;
      this.pointer = null;
      this.setHover(null);
      this.requestDraw();
    });
    on('wheel', (e) => {
      e.preventDefault();
      this.view = zoomAt(this.view, [e.offsetX, e.offsetY], Math.exp(-e.deltaY * 0.0015));
      this.requestDraw();
    }, { passive: false });
    on('contextmenu', (e) => {
      e.preventDefault();
      const id = this.nodeAt([e.offsetX, e.offsetY]);
      if (id && !this.readOnly) {
        const r = refund(this.tree, this.build, id, { cascade: this.cascade });
        if (r.ok) this.setBuild(r.build);
      }
    });
  }

  /** Replace the build, recompute states and redraw. */
  setBuild(build, { silent = false } = {}) {
    this.build = build;
    this.resolved = resolve(this.tree, this.layout, { build });
    this.frontier = frontier(this.tree, build);
    if (!silent) this.onChange?.(build);
    this.requestDraw();
  }

  /** Highlight nodes matching a query (see searchNodes). Returns the hit ids. */
  setSearch(query) {
    this.search = searchNodes(this.tree, query);
    this.requestDraw();
    return this.search;
  }

  setHover(id) {
    if (id === this.hover) return;
    this.hover = id;
    const p = id && !this.readOnly ? pathTo(this.tree, this.build, id) : null;
    this.preview = p?.path ?? [];
  }

  /** The node under a screen point (CSS pixels), or null. */
  nodeAt(p) {
    let w = screenToWorld(this.view, p);
    const cal = this.layout?.calibration?.m;
    if (cal) w = apply(invert(cal), w);
    return hitTest(this.resolved, w, { slop: 2 / this.view.k });
  }

  click(id) {
    if (!id || this.readOnly) return;
    let build = this.build;
    for (const step of this.preview.length ? this.preview : [id]) {
      const r = allocate(this.tree, build, step);
      if (!r.ok) break;
      build = r.build;
    }
    if (build !== this.build) {
      this.preview = [];
      this.setBuild(build);
    }
  }

  /** Fit the whole tree (or the art, when calibrated) in the canvas. */
  fit() {
    const { w, h } = this.size();
    let b = this.resolved.bounds;
    const cal = this.layout?.calibration?.m;
    if (cal) {
      const pts = [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map((p) => apply(cal, p));
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      b = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    this.view = fitView(b, w, h);
    this.requestDraw();
  }

  size() {
    const dpr = globalThis.devicePixelRatio ?? 1;
    return { w: this.canvas.clientWidth ?? this.canvas.width / dpr, h: this.canvas.clientHeight ?? this.canvas.height / dpr, dpr };
  }

  requestDraw() {
    if (this.pending || !this.view) return;
    this.pending = true;
    const raf = globalThis.requestAnimationFrame ?? ((f) => f());
    raf(() => {
      this.pending = false;
      this.render();
    });
  }

  /** Draw now. */
  render() {
    const { w, h, dpr } = this.size();
    if (this.canvas.width !== Math.round(w * dpr)) this.canvas.width = Math.round(w * dpr);
    if (this.canvas.height !== Math.round(h * dpr)) this.canvas.height = Math.round(h * dpr);
    const states = nodeStates(this.tree, this.build, this.resolved, {
      frontier: this.frontier, hover: this.hover, search: this.search, preview: this.preview,
    });
    draw(this.ctx, { tree: this.tree, layout: this.layout, resolved: this.resolved, states, images: this.images, width: this.canvas.width, height: this.canvas.height, dpr }, this.view);
    if (this.hover && this.pointer) drawTooltip(this.ctx, tooltip(this.tree, this.build, this.hover), this.pointer, { theme: this.layout?.theme, dpr });
  }

  destroy() {
    for (const [type, fn, opts] of this.listeners) this.canvas.removeEventListener(type, fn, opts);
    this.listeners = [];
  }
}
