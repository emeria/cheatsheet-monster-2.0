// The site's own share code for a build on any tree: base64url of compact JSON. Tree pages
// and embeds read it from `?b=`, so a link opens the same build. Game formats (PoE tree links,
// Wowhead links) stay in their own adapters.
import { fromBase64Url, toBase64Url } from './poeTreeUrl';

const KEYS = { t: 'tree', s: 'start', p: 'picks', r: 'ranks', o: 'options', f: 'paidFrom' };

export function encodeBuild(build) {
  const out = {};
  for (const [short, key] of Object.entries(KEYS)) {
    const v = build[key];
    if (v !== undefined && !(typeof v === 'object' && !Object.keys(v).length)) out[short] = v;
  }
  if (build.context?.level !== undefined) out.l = build.context.level;
  return toBase64Url(new TextEncoder().encode(JSON.stringify(out)));
}

// A build for `tree` (its JSON), or null when the code is broken or is for another tree.
// Flags come from the tree, as for a fresh build: every quest done.
export function decodeBuild(code, tree) {
  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(fromBase64Url(code)));
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || data.t !== tree.id) return null;
  const build = {
    app: 'lmg-tree-build',
    v: 1,
    tree: tree.id,
    context: { level: data.l ?? tree.context?.level?.max ?? 1, flags: (tree.context?.flags || []).map((f) => f.id) },
    ranks: {},
  };
  for (const [short, key] of Object.entries(KEYS)) if (short !== 't' && data[short] !== undefined) build[key] = data[short];
  return build;
}
