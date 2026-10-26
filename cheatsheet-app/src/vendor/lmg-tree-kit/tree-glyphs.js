// The kit's default glyph set: one glyph per node kind, plus glyphs for common
// tags. Drawn in code from a few shapes, so there are no image files and no
// game icons. One dependency-free ES module.
//
// A glyph is a list of shapes in a unit box from -1 to 1 (y points down):
//   { c: [x, y, r] }               circle
//   { p: [[x, y], ...], z: true }  polyline, closed when z
//   { a: [x, y, r, from, to] }     arc, degrees clockwise from east
// Each shape is stroked, or filled when it has `fill: true`.

const star = (points, outer, inner, turn = -90) => {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const t = ((turn + (180 * i) / points) * Math.PI) / 180;
    out.push([+(r * Math.cos(t)).toFixed(3), +(r * Math.sin(t)).toFixed(3)]);
  }
  return out;
};
const ngon = (n, r, turn = -90) => star(n, r, r, turn).filter((_, i) => i % 2 === 0);

/** One glyph per node kind. `small` is the fallback. */
export const KIND_GLYPHS = Object.freeze({
  small: [{ c: [0, 0, 0.3], fill: true }],
  attribute: [{ p: [[0, -0.6], [0, 0.6]] }, { p: [[-0.6, 0], [0.6, 0]] }],
  notable: [{ p: star(4, 0.8, 0.3), z: true, fill: true }],
  keystone: [{ c: [0, 0, 0.8] }, { p: ngon(4, 0.45), z: true, fill: true }],
  start: [{ p: [[-0.6, 0.6], [-0.6, -0.1], [0, -0.7], [0.6, -0.1], [0.6, 0.6]], z: true }, { c: [0, 0.15, 0.2], fill: true }],
  talent: [{ p: [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]], z: true }],
  capstone: [{ p: [[-0.7, 0.5], [-0.7, -0.4], [-0.35, 0], [0, -0.6], [0.35, 0], [0.7, -0.4], [0.7, 0.5]], z: true, fill: true }],
  mastery: [{ c: [0, 0, 0.7] }, { c: [0, 0, 0.25], fill: true }],
  socket: [{ p: ngon(6, 0.75, 0), z: true }, { p: ngon(6, 0.35, 0), z: true, fill: true }],
  gate: [{ p: [[-0.55, 0.7], [-0.55, -0.1]] }, { p: [[0.55, 0.7], [0.55, -0.1]] }, { a: [0, -0.1, 0.55, 180, 360] }, { p: [[-0.8, 0.7], [0.8, 0.7]] }],
  skill: [{ p: [[0, -0.8], [0, 0.8]] }, { p: [[-0.8, 0], [0.8, 0]] }, { p: [[-0.55, -0.55], [0.55, 0.55]] }, { p: [[0.55, -0.55], [-0.55, 0.55]] }],
  rune: [{ p: ngon(3, 0.8), z: true }, { c: [0, 0.1, 0.18], fill: true }],
});

/** Glyphs for tags. A key ending in `:*` matches every tag with that prefix. */
export const TAG_GLYPHS = Object.freeze({
  'dmg:fire': [{ p: [[0, -0.85], [0.45, -0.15], [0.55, 0.3], [0.3, 0.7], [0, 0.8], [-0.3, 0.7], [-0.55, 0.3], [-0.45, -0.15], [-0.15, 0.1]], z: true, fill: true }],
  'dmg:cold': [
    { p: [[0, -0.85], [0, 0.85]] }, { p: [[-0.74, -0.42], [0.74, 0.42]] }, { p: [[-0.74, 0.42], [0.74, -0.42]] },
    { p: [[-0.2, -0.75], [0, -0.55], [0.2, -0.75]] }, { p: [[-0.2, 0.75], [0, 0.55], [0.2, 0.75]] },
  ],
  'dmg:lightning': [{ p: [[0.25, -0.85], [-0.45, 0.1], [0, 0.1], [-0.25, 0.85], [0.45, -0.15], [0, -0.15]], z: true, fill: true }],
  'dmg:chaos': [{ a: [0, 0, 0.7, 0, 270] }, { a: [0, 0, 0.4, 90, 360] }, { c: [0, 0, 0.12], fill: true }],
  'dmg:physical': [{ p: [[-0.7, 0.3], [0.3, -0.7]] }, { p: [[-0.5, 0.6], [0.6, -0.5]] }, { p: [[-0.2, 0.75], [0.75, -0.2]] }],
  'dmg:bleed': [{ p: [[0, -0.8], [0.45, 0.1], [0.4, 0.45], [0, 0.75], [-0.4, 0.45], [-0.45, 0.1]], z: true, fill: true }],
  'role:defence': [{ p: [[-0.65, -0.6], [0, -0.8], [0.65, -0.6], [0.6, 0.1], [0, 0.85], [-0.6, 0.1]], z: true }],
  'role:control': [{ c: [-0.3, 0, 0.4] }, { c: [0.3, 0, 0.4] }],
  'role:ability': [{ p: star(5, 0.8, 0.35), z: true }],
  'role:shout': [{ p: [[-0.7, -0.25], [-0.35, -0.25], [0, -0.6], [0, 0.6], [-0.35, 0.25], [-0.7, 0.25]], z: true, fill: true }, { a: [0.1, 0, 0.4, -45, 45] }, { a: [0.1, 0, 0.7, -45, 45] }],
  'role:threat': [{ p: [[0, -0.8], [0, 0.25]] }, { c: [0, 0.6, 0.13], fill: true }],
  'role:capstone': KIND_GLYPHS.capstone,
  'role:keystone': KIND_GLYPHS.keystone,
  'role:life': [{ p: [[0, 0.75], [-0.7, 0], [-0.7, -0.4], [-0.35, -0.7], [0, -0.4], [0.35, -0.7], [0.7, -0.4], [0.7, 0]], z: true, fill: true }],
  'attr:str': [{ p: [[-0.5, 0], [0.5, 0]] }, { p: [[-0.55, -0.4], [-0.55, 0.4]] }, { p: [[0.55, -0.4], [0.55, 0.4]] }, { p: [[-0.8, -0.25], [-0.8, 0.25]] }, { p: [[0.8, -0.25], [0.8, 0.25]] }],
  'attr:dex': [{ p: [[-0.7, 0.7], [0.6, -0.6]] }, { p: [[0.15, -0.65], [0.65, -0.65], [0.65, -0.15]] }, { p: [[-0.7, 0.3], [-0.45, 0.45], [-0.3, 0.7]] }],
  'attr:int': [{ p: [[-0.8, 0], [-0.4, -0.4], [0.4, -0.4], [0.8, 0], [0.4, 0.4], [-0.4, 0.4]], z: true }, { c: [0, 0, 0.22], fill: true }],
  'stat:crit': [{ c: [0, 0, 0.55] }, { p: [[0, -0.85], [0, -0.3]] }, { p: [[0, 0.3], [0, 0.85]] }, { p: [[-0.85, 0], [-0.3, 0]] }, { p: [[0.3, 0], [0.85, 0]] }],
  'stat:haste': [{ p: [[-0.6, -0.6], [0, 0], [-0.6, 0.6]] }, { p: [[0, -0.6], [0.6, 0], [0, 0.6]] }],
  'grant:skill': [{ p: [[-0.6, -0.6], [0.6, -0.6], [0.6, 0.6], [-0.6, 0.6]], z: true }, { p: [[0, -0.35], [0, 0.35]] }, { p: [[-0.35, 0], [0.35, 0]] }],
  'grant:*': [{ p: [[0, 0.75], [0, -0.6]] }, { p: [[-0.45, -0.15], [0, -0.6], [0.45, -0.15]] }],
  'res:*': [{ p: star(6, 0.8, 0.45), z: true }],
  'weapon:*': [{ p: [[-0.6, 0.6], [0.6, -0.6]] }, { p: [[0.3, -0.75], [0.75, -0.75], [0.75, -0.3]] }, { p: [[-0.6, 0.2], [-0.2, 0.6]] }],
});

/** The glyph for one tag: an exact key, else its `prefix:*` key. */
export function tagGlyph(tag, tags = TAG_GLYPHS) {
  if (tags[tag]) return tag;
  const i = tag.indexOf(':');
  const wide = i > 0 ? `${tag.slice(0, i)}:*` : null;
  return wide && tags[wide] ? wide : null;
}

/**
 * A node's glyph: its first tag with a glyph, else its kind's, else `small`.
 * Returns `{ key, shapes }`, where key is `tag:<key>` or `kind:<kind>`.
 */
export function glyphFor(node, { kinds = KIND_GLYPHS, tags = TAG_GLYPHS } = {}) {
  for (const t of node?.tags || []) {
    const k = tagGlyph(t, tags);
    if (k) return { key: `tag:${k}`, shapes: tags[k] };
  }
  const kind = node?.kind ?? 'small';
  if (kinds[kind]) return { key: `kind:${kind}`, shapes: kinds[kind] };
  return { key: 'kind:small', shapes: kinds.small };
}

/** Draw a glyph centred at x, y with half-size r, in one colour. */
export function drawGlyph(ctx, shapes, x, y, r, color, { lineWidth = 0.18 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of shapes) {
    ctx.beginPath();
    if (s.c) ctx.arc(s.c[0], s.c[1], s.c[2], 0, Math.PI * 2);
    else if (s.a) ctx.arc(s.a[0], s.a[1], s.a[2], (s.a[3] * Math.PI) / 180, (s.a[4] * Math.PI) / 180);
    else if (s.p) {
      s.p.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      if (s.z) ctx.closePath();
    }
    if (s.fill) ctx.fill();
    else ctx.stroke();
  }
  ctx.restore();
}

/** A glyph as a standalone SVG string (for docs, print and previews). */
export function glyphSvg(shapes, { size = 32, color = '#000' } = {}) {
  const rad = (d) => (d * Math.PI) / 180;
  const n = (v) => +v.toFixed(3);
  const body = shapes.map((s) => {
    const paint = s.fill ? `fill="${color}"` : `fill="none" stroke="${color}"`;
    if (s.c) return `<circle cx="${s.c[0]}" cy="${s.c[1]}" r="${s.c[2]}" ${paint}/>`;
    if (s.a) {
      const [cx, cy, r, a0, a1] = s.a;
      const p0 = [n(cx + r * Math.cos(rad(a0))), n(cy + r * Math.sin(rad(a0)))];
      const p1 = [n(cx + r * Math.cos(rad(a1))), n(cy + r * Math.sin(rad(a1)))];
      const large = (((a1 - a0) % 360) + 360) % 360 > 180 ? 1 : 0;
      return `<path d="M${p0} A${r},${r} 0 ${large} 1 ${p1}" ${paint}/>`;
    }
    const pts = s.p.map((p) => p.join(',')).join(' ');
    return s.z ? `<polygon points="${pts}" ${paint}/>` : `<polyline points="${pts}" ${paint}/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="-1 -1 2 2" stroke-width="0.18" stroke-linecap="round" stroke-linejoin="round">${body.join('')}</svg>`;
}
