// Path of Exile tree URL adapter: the official site's link format <-> an lmg-tree-kit build.
//
// The code after the last "/" is base64url of (Path of Building's DecodeURL is the reference):
//   u32 version (big-endian), u8 class, u8 ascendancy (bits 0-1 ascendancy, 2-7 bloodline)
//   v4:  u8 fullscreen, then u16 node ids to the end
//   v5+: u8 count + u16 node ids, u8 count + u16 cluster node ids (minus 65536)
//   v6:  u8 count + (u16 effect, u16 mastery node) pairs
// Class and ascendancy are positions in the tree's ext.poe1 index tables (written by the importer).
//
// Decoding keeps the URL's own byte order in build._url, so an unchanged build encodes back
// to the same URL; `_` keys are never saved with the build. Cluster nodes go in build.ext.poe1,
// which is saved.

export const DEFAULT_PREFIX = 'https://www.pathofexile.com/passive-skill-tree/';
const CLUSTER_BASE = 65536;

export function fromBase64Url(code) {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function toBase64Url(bytes, padded) {
  // In chunks: spreading a large array into fromCharCode overflows the stack.
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.slice(i, i + 0x8000));
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_');
  return padded ? b64 : b64.replace(/=+$/, '');
}

function splitUrl(url) {
  const tail = url.search(/[?#]/);
  const head = tail < 0 ? url : url.slice(0, tail);
  const cut = head.lastIndexOf('/') + 1;
  return { prefix: head.slice(0, cut), code: head.slice(cut), suffix: tail < 0 ? '' : url.slice(tail) };
}

export function decodeTreeUrl(url, tree) {
  const { prefix, code, suffix } = splitUrl(url.trim());
  let b;
  try {
    b = fromBase64Url(code);
  } catch {
    throw new Error('Not a tree link: the code is not base64.');
  }
  if (b.length < 6) throw new Error('Not a tree link: too short.');
  let at = 0;
  const u8 = () => {
    if (at >= b.length) throw new Error('Tree link is cut short.');
    return b[at++];
  };
  const u16 = () => (u8() << 8) | u8();
  const version = ((u8() << 24) | (u8() << 16) | (u8() << 8) | u8()) >>> 0;
  if (version < 4 || version > 6) throw new Error(`Unsupported tree link version ${version} (4 to 6 are known).`);

  const classIndex = u8();
  const cls = tree.ext.poe1.classes[classIndex];
  if (!cls) throw new Error(`Tree link has unknown class ${classIndex}.`);
  const ascByte = u8();
  const warnings = [];
  const picks = {};
  const asc = ascByte & 3;
  const bloodline = ascByte >> 2;
  if (asc) {
    if (cls.ascendancies[asc - 1]) picks.ascendancy = cls.ascendancies[asc - 1];
    else warnings.push(`Unknown ascendancy ${asc} for ${cls.name}.`);
  }
  if (bloodline) {
    if (tree.ext.poe1.bloodlines[bloodline - 1]) picks.bloodline = tree.ext.poe1.bloodlines[bloodline - 1];
    else warnings.push(`Unknown bloodline ${bloodline}.`);
  }

  const meta = { version, prefix, suffix, padded: code.endsWith('='), order: [], masteries: [] };
  let nodeIds = [];
  if (version === 4) {
    meta.fullscreen = u8();
    while (at + 1 < b.length) nodeIds.push(u16());
  } else {
    nodeIds = Array.from({ length: u8() }, u16);
  }
  const clusterNodes = version >= 5 ? Array.from({ length: u8() }, () => String(u16() + CLUSTER_BASE)) : [];
  const masteryPairs = version >= 6 ? Array.from({ length: u8() }, () => [String(u16()), String(u16())]) : [];

  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const unknown = [];
  const ranks = {};
  for (const n of nodeIds.map(String)) {
    meta.order.push(n);
    if (byId.has(n)) ranks[n] = 1;
    else unknown.push(n);
  }
  if (unknown.length) warnings.push(`Dropped unknown node ids: ${unknown.join(', ')}.`);

  const options = {};
  for (const [effect, node] of masteryPairs) {
    meta.masteries.push(node);
    const known = byId.get(node)?.options?.some((o) => o.id === effect);
    if (known) options[node] = effect;
    else warnings.push(`Dropped unknown mastery effect ${effect} on node ${node}.`);
  }

  const build = { app: 'lmg-tree-build', v: 1, tree: tree.id, start: cls.start };
  if (Object.keys(picks).length) build.picks = picks;
  build.ranks = ranks;
  if (Object.keys(options).length) build.options = options;
  if (clusterNodes.length) build.ext = { poe1: { clusterNodes } };
  build._url = meta;
  return { build, warnings };
}

// Ids in the URL's original order first, then any new ones ascending.
function ordered(ids, order = []) {
  const want = new Set(ids);
  const first = order.filter((id) => want.has(id));
  const seen = new Set(first);
  return [...first, ...ids.filter((id) => !seen.has(id)).sort((a, b) => a - b)];
}

export function encodeTreeUrl(build, tree, opts = {}) {
  const meta = { ...build._url, ...opts };
  const version = meta.version ?? 6;
  const classIndex = tree.ext.poe1.classes.findIndex((c) => c.start === build.start);
  if (classIndex < 0) throw new Error(`Build start ${build.start} is not a class start.`);
  const cls = tree.ext.poe1.classes[classIndex];
  const asc = build.picks?.ascendancy ? cls.ascendancies.indexOf(build.picks.ascendancy) + 1 : 0;
  const bloodline = build.picks?.bloodline ? tree.ext.poe1.bloodlines.indexOf(build.picks.bloodline) + 1 : 0;
  if (build.picks?.ascendancy && !asc) throw new Error(`${build.picks.ascendancy} is not a ${cls.name} ascendancy.`);
  if (build.picks?.bloodline && !bloodline) throw new Error(`Unknown bloodline ${build.picks.bloodline}.`);

  const starts = new Set(tree.nodes.filter((n) => n.start).map((n) => n.id));
  const taken = Object.keys(build.ranks || {}).filter((id) => build.ranks[id] > 0 && !starts.has(id));
  const nodes = ordered(taken, meta.order).map(Number);
  if (nodes.some((id) => !(id >= 0 && id < CLUSTER_BASE))) throw new Error('Tree links only hold node ids below 65536.');
  const clusters = (build.ext?.poe1?.clusterNodes || []).map((id) => Number(id) - CLUSTER_BASE);
  const masteries = ordered(Object.keys(build.options || {}), meta.masteries);
  if ((version < 5 && clusters.length) || (version < 6 && masteries.length)) {
    throw new Error(`Version ${version} tree links can't hold cluster nodes or mastery effects.`);
  }
  if (version >= 5 && (nodes.length > 255 || clusters.length > 255 || masteries.length > 255)) {
    throw new Error('Tree links hold at most 255 nodes per list.');
  }

  const bytes = [0, 0, 0, version, classIndex, (bloodline << 2) | asc];
  const push16 = (n) => bytes.push(n >> 8, n & 255);
  if (version === 4) {
    bytes.push(meta.fullscreen ?? 0);
    nodes.forEach(push16);
  } else {
    bytes.push(nodes.length);
    nodes.forEach(push16);
    bytes.push(clusters.length);
    clusters.forEach(push16);
    if (version >= 6) {
      bytes.push(masteries.length);
      for (const node of masteries) {
        push16(Number(build.options[node]));
        push16(Number(node));
      }
    }
  }
  return `${meta.prefix ?? DEFAULT_PREFIX}${toBase64Url(bytes, meta.padded ?? true)}${meta.suffix ?? ''}`;
}
