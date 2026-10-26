// Picks which imported tree a build belongs on, from src/data/trees/versions.json
// (written by scripts/import-poe-trees.js, one entry per pinned GGG export).
//
// Builds name their patch loosely: PoB writes "3_29" or "3_25_ruthless", the official site
// "3.29.1". The best match is the same patch, else the newest pin of the same major.minor,
// else the game's latest tree with a warning that nodes may have moved.

const VARIANTS = /(ruthless|alternate)/i;

// "3_29", "3.29.1b", "0_5" -> ["3", "29", "1b"]
const parts = (version) =>
  String(version || '')
    .replace(VARIANTS, '')
    .split(/[._]/)
    .filter(Boolean);

export function pickTree(versions, game, version) {
  const entry = versions.games?.[game];
  if (!entry) throw new Error(`No ${game} trees are imported. Pin one in scripts/tree-pins.json.`);
  const warnings = [];
  const variant = String(version || '').match(VARIANTS);
  if (variant) warnings.push(`This build uses the ${variant[1].toLowerCase()} tree, which isn't imported; using the normal tree.`);
  const want = parts(version);
  const byPatch = (n) => entry.trees.filter((t) => parts(t.patch).slice(0, n).join('.') === want.slice(0, n).join('.'));
  const exact = want.length ? entry.trees.find((t) => parts(t.patch).join('.') === want.join('.')) : null;
  const sameMinor = want.length >= 2 ? byPatch(2).at(-1) : null;
  const tree = exact || sameMinor || entry.trees.find((t) => t.id === entry.latest);
  if (!exact && !sameMinor) {
    warnings.push(version ? `No ${game} ${version} tree is imported; using ${tree.patch}. Some nodes may have moved.` : `No tree version given; using ${tree.patch}.`);
  }
  return { ...tree, warnings };
}
