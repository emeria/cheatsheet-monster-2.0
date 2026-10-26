// Wowhead Classic talent links <-> an lmg-tree-kit build, for trees with ext.wowhead.
//
// https://www.wowhead.com/classic/talent-calc/warrior/3400502130201-05050005505012050115_l60
// Wowhead's TalentCalcClassic.js is the reference. After the class slug come:
//   points: one rank digit per talent, row by row then column by column within a tree; each tree
//           drops its trailing zeros, trees are joined by "-" in ext.wowhead.trees order, and
//           trailing "-" are dropped
//   then optional "_"-separated extras: l<level>, r<race id>, t<rank>, and one more (SoD runes)
// Only the points and level are read; other extras are reported and not kept.

export const DEFAULT_PREFIX = 'https://www.wowhead.com/classic/talent-calc/';

// Each tree's nodes in link order.
function linkOrder(tree) {
  const { trees } = tree.ext.wowhead;
  return trees.map((section) =>
    tree.nodes.filter((n) => n.section === section).sort((a, b) => a.tier - b.tier || a.col - b.col),
  );
}

export function decodeWowheadTalents(link, tree) {
  const wh = tree.ext?.wowhead;
  if (!wh) throw new Error(`Tree ${tree.id} has no Wowhead talent order.`);
  const text = link.trim().replace(/[?#].*$/, '');
  const m = text.match(/talent-calc\/([a-z-]+)\/([^/]*)\/?$/);
  if (m && m[1] !== wh.class) throw new Error(`That is a ${m[1]} build, not ${wh.class}.`);
  const code = m ? m[2] : text;
  const [points, ...extras] = code.split('_');
  if (!/^[0-9-]*$/.test(points)) throw new Error('Not a Wowhead talent link: the points are not digits.');

  const warnings = [];
  const parts = points.split('-');
  if (parts.length > wh.trees.length) throw new Error(`Talent link has ${parts.length} trees; ${wh.class} has ${wh.trees.length}.`);
  const ranks = {};
  linkOrder(tree).forEach((nodes, t) => {
    const digits = parts[t] || '';
    if (digits.length > nodes.length) warnings.push(`Ignored ${digits.length - nodes.length} extra digits in tree ${t + 1}.`);
    nodes.forEach((n, i) => {
      const rank = Number(digits[i] || 0);
      if (rank > (n.ranks ?? 1)) warnings.push(`${n.name} has ${rank} points; it has ${n.ranks ?? 1} ranks.`);
      else if (rank) ranks[n.id] = rank;
    });
  });

  const build = { app: 'lmg-tree-build', v: 1, tree: tree.id };
  for (const extra of extras) {
    const level = extra.match(/^l([1-9]\d?)$/);
    if (level) build.context = { level: Number(level[1]) };
    else if (extra) warnings.push(`Ignored link extra "${extra}".`);
  }
  build.ranks = ranks;
  return { build, warnings };
}

export function encodeWowheadTalents(build, tree, { prefix = DEFAULT_PREFIX, level = false } = {}) {
  const wh = tree.ext?.wowhead;
  if (!wh) throw new Error(`Tree ${tree.id} has no Wowhead talent order.`);
  const order = linkOrder(tree);
  const known = new Set(order.flat().map((n) => n.id));
  const unknown = Object.keys(build.ranks || {}).filter((id) => build.ranks[id] > 0 && !known.has(id));
  if (unknown.length) throw new Error(`Not ${wh.class} talents: ${unknown.join(', ')}.`);

  const points = order
    .map((nodes) =>
      nodes
        .map((n) => {
          const rank = build.ranks?.[n.id] || 0;
          if (rank > (n.ranks ?? 1) || rank > 9) throw new Error(`${n.name} can't hold ${rank} points.`);
          return rank;
        })
        .join('')
        .replace(/0+$/, ''),
    )
    .join('-')
    .replace(/-+$/, '');
  const suffix = level && build.context?.level ? `_l${build.context.level}` : '';
  return `${prefix}${wh.class}${points || suffix ? `/${points}${suffix}` : ''}`;
}
