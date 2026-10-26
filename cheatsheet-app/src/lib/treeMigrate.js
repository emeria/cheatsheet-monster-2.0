// Moves a build from one version of a tree to another (an old PoE patch onto the latest).
// Follows the spec's patch migration: apply the target tree's `renames`, keep what still exists,
// drop the rest with a warning listing it. Never fails silently.
//
// PoE class starts are matched by class name through ext.<game>.classes, since a start's id can
// change between patches. Sections (ascendancies), node options and pools are matched by id.

export function migrateBuild(build, from, to) {
  if (from.game !== to.game) throw new Error(`Can't move a ${from.game} build onto a ${to.game} tree.`);
  const warnings = [];
  const renames = to.renames || {};
  const rename = (id) => renames[id] ?? id;
  const nodes = new Map(to.nodes.map((n) => [n.id, n]));
  const sections = new Set(to.sections.map((s) => s.id));
  const pools = new Set(to.pools.map((p) => p.id));

  const out = { ...build, tree: to.id };
  delete out._url;

  if (build.start) {
    const fromClasses = from.ext?.[from.game]?.classes || [];
    const toClasses = to.ext?.[to.game]?.classes || [];
    const name = fromClasses.find((c) => c.start === build.start)?.name;
    const start = toClasses.find((c) => c.name === name)?.start ?? (nodes.has(rename(build.start)) ? rename(build.start) : undefined);
    if (!start) throw new Error(`The build's class${name ? ` (${name})` : ''} isn't on ${to.name}.`);
    out.start = start;
  }

  if (build.picks) {
    out.picks = {};
    for (const [group, section] of Object.entries(build.picks)) {
      if (sections.has(section)) out.picks[group] = section;
      else warnings.push(`Dropped ${group} ${section}: it isn't on ${to.name}.`);
    }
    if (!Object.keys(out.picks).length) delete out.picks;
  }

  const dropped = [];
  out.ranks = {};
  for (const [id, rank] of Object.entries(build.ranks || {})) {
    const next = rename(id);
    if (nodes.has(next)) out.ranks[next] = Math.min(rank, nodes.get(next).ranks ?? 1);
    else dropped.push(id);
  }
  if (dropped.length) warnings.push(`Dropped nodes not on ${to.name}: ${dropped.join(', ')}.`);

  if (build.options) {
    out.options = {};
    for (const [id, option] of Object.entries(build.options)) {
      const next = rename(id);
      if (!out.ranks[next]) continue;
      if (nodes.get(next).options?.some((o) => o.id === option)) out.options[next] = option;
      else warnings.push(`Dropped choice ${option} on ${nodes.get(next).name || next}: that option is gone.`);
    }
    if (!Object.keys(out.options).length) delete out.options;
  }

  if (build.paidFrom) {
    out.paidFrom = {};
    for (const [id, pool] of Object.entries(build.paidFrom)) if (out.ranks[rename(id)] && pools.has(pool)) out.paidFrom[rename(id)] = pool;
    if (!Object.keys(out.paidFrom).length) delete out.paidFrom;
  }

  if (build.steps) {
    out.steps = build.steps.map((s) => ({ ...s, node: rename(s.node) })).filter((s) => out.ranks[s.node]);
    if (!out.steps.length) delete out.steps;
  }

  if (from.id !== to.id && !warnings.length) warnings.push(`Moved from ${from.patch} to ${to.patch}; check the tree, since nodes may have changed.`);
  return { build: out, warnings };
}
