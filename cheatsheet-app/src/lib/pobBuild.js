// Path of Building (PoE1 and PoE2) build import: share codes, build XML files and build-site links
// -> lmg-tree-kit builds, one per tree set (PoB "Spec").
//
// A PoB code is base64url of zlib-deflated build XML. The XML's root is <PathOfBuilding> for
// PoE1 and <PathOfBuilding2> for PoE2. Only the passive tree is read; items, skills and jewels
// are outside the kit's scope. Field names follow PoB's PassiveSpec Load/Save.

import { toBase64Url } from './poeTreeUrl';

// Sites PoB itself imports from (PoB's BuildSiteTools.lua), with the URL that serves the raw code.
// Only some send CORS headers, so a browser fetch can fail; then the user pastes the code instead.
export const BUILD_SITES = [
  { id: 'pobb.in', label: 'pobb.in', match: /^https?:\/\/pobb\.in\/(?:pob\/)?([\w-]+)/i, raw: (id) => `https://pobb.in/pob/${id}` },
  { id: 'poe.ninja', label: 'poe.ninja', match: /^https?:\/\/poe\.ninja\/(?:poe1\/)?pob\/(\w+)/i, raw: (id) => `https://poe.ninja/poe1/pob/raw/${id}` },
  { id: 'poe.ninja-poe2', label: 'poe.ninja (PoE2)', match: /^https?:\/\/poe2?\.ninja\/poe2\/pob\/(\w+)/i, raw: (id) => `https://poe.ninja/poe2/pob/raw/${id}` },
  { id: 'maxroll', label: 'Maxroll', match: /^https?:\/\/maxroll\.gg\/poe\/pob\/([\w-]+)/i, raw: (id) => `https://maxroll.gg/poe/api/pob/${id}` },
  { id: 'maxroll-poe2', label: 'Maxroll (PoE2)', match: /^https?:\/\/maxroll\.gg\/poe2\/pob\/([\w-]+)/i, raw: (id) => `https://maxroll.gg/poe2/api/pob/${id}` },
  { id: 'pob.codes', label: 'pob.codes', match: /^https?:\/\/pob\.codes\/b\/([\w-]+)/i, raw: (id) => `https://api.pob.codes/${id}/raw` },
  { id: 'poedb', label: 'poedb.tw', match: /^https?:\/\/poedb\.tw\/pob\/([\w-]+)/i, raw: (id) => `https://poedb.tw/pob/${id}/raw` },
  { id: 'poe2db', label: 'poe2db.tw', match: /^https?:\/\/poe2db\.tw\/pob\/([\w-]+)/i, raw: (id) => `https://poe2db.tw/pob/${id}/raw` },
  { id: 'pastebin', label: 'Pastebin', match: /^https?:\/\/pastebin\.com\/(?:raw\/)?(\w+)/i, raw: (id) => `https://pastebin.com/raw/${id}` },
  { id: 'rentry', label: 'Rentry', match: /^https?:\/\/rentry\.co\/(?:paste\/)?(\w+)/i, raw: (id) => `https://rentry.co/paste/${id}/raw` },
];

export function findBuildSite(text) {
  const url = text.trim();
  for (const site of BUILD_SITES) {
    const m = url.match(site.match);
    if (m) return { site, id: m[1], rawUrl: site.raw(m[1]) };
  }
  return null;
}

// Downloads the code behind a build-site link. Throws a message the page can show as is.
export async function fetchBuildSiteCode(link, fetchFn = fetch) {
  let res;
  try {
    res = await fetchFn(link.rawUrl);
  } catch {
    throw new Error(`${link.site.label} didn't let the browser download this build. Copy the PoB code from the site and paste it here instead.`);
  }
  if (!res.ok) throw new Error(`${link.site.label} returned ${res.status} for this build.`);
  return (await res.text()).trim();
}

async function pipe(bytes, transform) {
  const input = new ReadableStream({
    start(c) {
      c.enqueue(bytes);
      c.close();
    },
  });
  const chunks = [];
  const reader = input.pipeThrough(transform).getReader();
  for (let r = await reader.read(); !r.done; r = await reader.read()) chunks.push(r.value);
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  chunks.reduce((at, c) => (out.set(c, at), at + c.length), 0);
  return out;
}

export async function inflatePobCode(code) {
  const b64 = code.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  let bytes;
  try {
    bytes = Uint8Array.from(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
  } catch {
    throw new Error('Not a PoB code: it is not base64.');
  }
  try {
    return new TextDecoder().decode(await pipe(bytes, new DecompressionStream('deflate')));
  } catch {
    throw new Error('Not a PoB code: it does not unpack.');
  }
}

export async function deflatePobXml(xml) {
  const bytes = await pipe(new TextEncoder().encode(xml), new CompressionStream('deflate'));
  // PoB keeps base64 padding on its codes.
  return toBase64Url(bytes, true);
}

const ids = (list) => (list || '').match(/\d+/g) || [];
const num = (v, fallback = 0) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));

// Build XML -> plain data: the game, character and every tree set.
export function parsePobXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  if (!root || doc.getElementsByTagName('parsererror').length) throw new Error('Not a PoB build: the XML does not parse.');
  const game = { PathOfBuilding: 'poe1', PathOfBuilding2: 'poe2' }[root.nodeName];
  if (!game) throw new Error(`Not a PoB build: unexpected <${root.nodeName}>.`);
  const build = root.getElementsByTagName('Build')[0];
  const treeEl = root.getElementsByTagName('Tree')[0];
  const specs = treeEl ? [...treeEl.getElementsByTagName('Spec')] : [];
  if (!specs.length) throw new Error('This PoB build has no passive tree.');
  const attr = (el, name) => el?.getAttribute(name) ?? undefined;
  const child = (el, name) => [...el.children].filter((c) => c.nodeName === name);

  return {
    game,
    level: num(attr(build, 'level'), undefined),
    className: attr(build, 'className'),
    ascendClassName: attr(build, 'ascendClassName'),
    activeSpec: Math.max(0, num(attr(treeEl, 'activeSpec'), 1) - 1),
    specs: specs.map((s) => {
      const weaponSets = {};
      for (const el of [...s.children].filter((c) => /^WeaponSet\d$/.test(c.nodeName))) weaponSets[el.nodeName.slice(-1)] = ids(attr(el, 'nodes'));
      const attributes = {};
      for (const o of child(s, 'Overrides').flatMap((el) => child(el, 'AttributeOverride'))) {
        for (const [key, a] of [['str', 'strNodes'], ['dex', 'dexNodes'], ['int', 'intNodes']]) for (const id of ids(attr(o, a))) attributes[id] = key;
      }
      return {
        title: attr(s, 'title'),
        treeVersion: attr(s, 'treeVersion'),
        classId: num(attr(s, 'classId'), undefined),
        ascendClassId: num(attr(s, 'ascendClassId')),
        secondaryAscendClassId: num(attr(s, 'secondaryAscendClassId')),
        ascendancyInternalId: attr(s, 'ascendancyInternalId'),
        nodes: ids(attr(s, 'nodes')),
        masteryEffects: [...(attr(s, 'masteryEffects') || '').matchAll(/\{(\d+),(\d+)\}/g)].map((m) => [m[1], m[2]]),
        url: child(s, 'URL')[0]?.textContent.trim() || undefined,
        weaponSets,
        attributes,
        sockets: child(s, 'Sockets').flatMap((el) => child(el, 'Socket')).filter((el) => num(attr(el, 'itemId')) > 0).length,
      };
    }),
  };
}

const CLUSTER_BASE = 65536;

// One PoB tree set -> a kit build on `tree`. Unknown ids are dropped with a warning.
export function specToBuild(pob, spec, tree, { name } = {}) {
  const ext = tree.ext[pob.game];
  const warnings = [];
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  // PoB2 renumbers classId between tree versions (its legacyClassIdMap), so for PoE2 the
  // ascendancy's export id, then the build's class name, beat the number.
  const byAscendancy = spec.ascendancyInternalId && ext.classes.find((c) => (c.ascendancyIds || []).includes(spec.ascendancyInternalId));
  const byName = pob.game === 'poe2' && pob.specs.length === 1 && ext.classes.find((c) => c.name === pob.className);
  const cls = byAscendancy || byName || ext.classes[spec.classId];
  if (!cls) throw new Error(`Unknown ${pob.game} class ${spec.classId} in "${spec.title || 'tree'}".`);

  const picks = {};
  if (pob.game === 'poe2' && spec.ascendancyInternalId) {
    const i = (cls.ascendancyIds || []).indexOf(spec.ascendancyInternalId);
    if (i >= 0) picks.ascendancy = cls.ascendancies[i];
    else warnings.push(`Ascendancy ${spec.ascendancyInternalId} isn't on this tree.`);
  } else if (spec.ascendClassId) {
    if (cls.ascendancies[spec.ascendClassId - 1]) picks.ascendancy = cls.ascendancies[spec.ascendClassId - 1];
    else warnings.push(`Ascendancy ${spec.ascendClassId} isn't on this tree for ${cls.name}.`);
  }
  if (spec.secondaryAscendClassId) {
    const bloodline = ext.bloodlines?.[spec.secondaryAscendClassId - 1];
    if (bloodline) picks.bloodline = bloodline;
    else warnings.push(`Bloodline ${spec.secondaryAscendClassId} isn't on this tree.`);
  }

  const ranks = {};
  const clusterNodes = [];
  const unknown = [];
  for (const id of spec.nodes) {
    const n = byId.get(id);
    if (n?.start) continue;
    if (n) ranks[id] = 1;
    else if (Number(id) >= CLUSTER_BASE) clusterNodes.push(id);
    else unknown.push(id);
  }
  if (unknown.length) warnings.push(`Dropped node ids not on this tree: ${unknown.join(', ')}.`);
  if (clusterNodes.length) warnings.push(`${clusterNodes.length} cluster jewel nodes are kept but not shown yet.`);
  if (spec.sockets) warnings.push(`${spec.sockets} socketed jewels are not imported (only the tree is).`);

  const options = {};
  for (const [node, effect] of spec.masteryEffects) {
    if (byId.get(node)?.options?.some((o) => o.id === effect)) options[node] = effect;
    else warnings.push(`Dropped mastery effect ${effect} on node ${node}.`);
  }
  for (const [node, key] of Object.entries(spec.attributes)) if (ranks[node] && byId.get(node)?.options) options[node] = key;

  const paidFrom = {};
  for (const [set, list] of Object.entries(spec.weaponSets)) for (const id of list) if (ranks[id]) paidFrom[id] = `ws${set}`;

  const build = { app: 'lmg-tree-build', v: 1, tree: tree.id };
  const title = name || spec.title;
  if (title) build.name = title;
  if (pob.level) build.context = { level: pob.level };
  build.start = cls.start;
  if (Object.keys(picks).length) build.picks = picks;
  build.ranks = ranks;
  if (Object.keys(options).length) build.options = options;
  if (Object.keys(paidFrom).length) build.paidFrom = paidFrom;
  if (clusterNodes.length) build.ext = { [pob.game]: { clusterNodes } };
  return { build, warnings };
}
