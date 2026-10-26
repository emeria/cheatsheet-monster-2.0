// poeplanner.com link import (decode only). The code after the last "/" is base64url, little-endian
// (layout from Path of Building's PassiveSpec, which imports these links):
//   u16 serialization version, u8 build type, u8 isPoE2, then the tree:
//   u16 tree serialization version, u16 tree version, u8 class, u8 ascendancy, u8 bandit,
//   u16 count + u16 nodes, u16 count + u16 cluster nodes (minus 65536), u16 count + u16 ascendancy nodes,
//   u16 count + (u16 mastery node, u16 effect), u16 count + (u16 node, u8 attribute 1-3)  [PoE2]
// The tree version is poeplanner's own number, so the build goes on the latest imported tree.
// Items, skills and config after the tree are not read.

const ATTRIBUTE = { 1: 'str', 2: 'dex', 3: 'int' };
const CLUSTER_BASE = 65536;

export const isPoePlannerUrl = (text) => /^https?:\/\/(www\.)?poeplanner\.com\//i.test(text.trim());

// Just the header, so the caller can pick the game's tree before decoding.
export function poePlannerGame(url) {
  const b = bytesOf(url);
  return b[3] ? 'poe2' : 'poe1';
}

function bytesOf(url) {
  const code = url.trim().split(/[?#]/)[0].replace(/^.*\//, '');
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  let bin;
  try {
    bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  } catch {
    throw new Error('Not a poeplanner link: the code is not base64.');
  }
  const b = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  if (b.length < 15) throw new Error('Not a poeplanner link: too short.');
  return b;
}

export function decodePoePlannerUrl(url, tree) {
  const b = bytesOf(url);
  const game = b[3] ? 'poe2' : 'poe1';
  const ext = tree.ext[game];
  if (!ext) throw new Error(`This poeplanner link is for ${game}, not ${tree.game}.`);
  let at = 4;
  const u8 = () => {
    if (at >= b.length) throw new Error('poeplanner link is cut short.');
    return b[at++];
  };
  const u16 = () => u8() | (u8() << 8);
  const list = (read) => Array.from({ length: u16() }, read);

  u16(); // tree serialization version
  const plannerTreeVersion = u16();
  const classIndex = u8();
  const asc = u8();
  u8(); // bandit
  const nodes = list(() => String(u16()));
  const clusters = list(() => String(u16() + CLUSTER_BASE));
  const ascNodes = list(() => String(u16()));
  const masteries = list(() => [String(u16()), String(u16())]);
  const attributes = game === 'poe2' && at < b.length ? list(() => [String(u16()), ATTRIBUTE[u8()]]) : [];

  const cls = ext.classes[classIndex];
  if (!cls) throw new Error(`poeplanner link has unknown class ${classIndex}.`);
  const warnings = [`poeplanner tree version ${plannerTreeVersion} can't be matched to a patch; using ${tree.patch}.`];
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const picks = {};
  if (asc) {
    if (cls.ascendancies[asc - 1]) picks.ascendancy = cls.ascendancies[asc - 1];
    else warnings.push(`Unknown ascendancy ${asc} for ${cls.name}.`);
  }
  const ranks = {};
  const unknown = [];
  for (const id of [...nodes, ...ascNodes]) {
    if (byId.get(id)?.start) continue;
    if (byId.has(id)) ranks[id] = 1;
    else unknown.push(id);
  }
  if (unknown.length) warnings.push(`Dropped node ids not on this tree: ${unknown.join(', ')}.`);
  const options = {};
  // poeplanner lists masteries only here, not with the other nodes, so taking one allocates it.
  for (const [node, effect] of masteries) {
    if (byId.get(node)?.options?.some((o) => o.id === effect)) {
      ranks[node] = 1;
      options[node] = effect;
    } else warnings.push(`Dropped mastery effect ${effect} on node ${node}.`);
  }
  for (const [node, key] of attributes) if (key && ranks[node]) options[node] = key;

  const build = { app: 'lmg-tree-build', v: 1, tree: tree.id, start: cls.start };
  if (Object.keys(picks).length) build.picks = picks;
  build.ranks = ranks;
  if (Object.keys(options).length) build.options = options;
  if (clusters.length) build.ext = { [game]: { clusterNodes: clusters } };
  return { build, warnings };
}
