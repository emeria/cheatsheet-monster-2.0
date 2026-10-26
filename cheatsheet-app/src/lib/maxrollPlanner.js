// Maxroll planner import, PoE1 and PoE2: the public profile JSON at
// planners.maxroll.gg/profiles/<poe|poe2>/<id> (the id is in maxroll.gg/<poe|poe2>/planner/<id>
// links and in guides' data-poe2-profile embeds). Its CORS headers allow this site, so the page
// can fetch it; a pasted copy of the JSON works too.
//
// Passive variants hold `history`: node ids in the order taken, with respecs as { add, remove }.
// One kit build per variant, with `steps` from the replayed history.
//   PoE2: data.profiles[], each with ascendancy (export id, e.g. Druid2), level and
//         passives.variants[] (attributes: node -> 0 str, 1 dex, 2 int).
//   PoE1: data.embeds[] of types; "passives" has charClass (Str, DexInt, ...) and variants[]
//         (masteries: node -> position in that mastery's effect list); "ascendancy" has the
//         ascendancy name and steps[], the last being the final allocation.

const PLANNER = /^https?:\/\/maxroll\.gg\/(poe2?)\/planner\/(\w+)/i;
const ATTRIBUTE = ['str', 'dex', 'int'];
// PoE1 class order (the export's constants.classes), by Maxroll's attribute name.
const POE1_CLASS = ['StrDexInt', 'Str', 'Dex', 'Int', 'StrDex', 'StrInt', 'DexInt'];

export function maxrollProfileUrl(text) {
  const m = text.trim().match(PLANNER);
  return m ? `https://planners.maxroll.gg/profiles/${m[1].toLowerCase()}/${m[2]}` : null;
}

function readDoc(json) {
  const doc = typeof json === 'string' ? JSON.parse(json) : json;
  const data = typeof doc.data === 'string' ? JSON.parse(doc.data) : doc.data;
  if (!data?.profiles && !data?.embeds) throw new Error('Not a Maxroll planner profile.');
  return { doc, data };
}

export function maxrollGame(json) {
  const { doc, data } = readDoc(json);
  if (doc.game === 'poe' || doc.game === 'poe2') return doc.game === 'poe' ? 'poe1' : 'poe2';
  return data.profiles ? 'poe2' : 'poe1';
}

// Final allocation in the order taken; nodes a respec removed are gone.
function replay(history = []) {
  const taken = new Set();
  for (const step of history) {
    if (step && typeof step === 'object') {
      for (const id of step.remove || []) taken.delete(String(id));
      for (const id of step.add || []) taken.add(String(id));
    } else taken.add(String(step));
  }
  return [...taken];
}

// Ranks and steps from node ids; unknown ids and starts are left out.
function allocation(ids, byId, warnings) {
  const unknown = ids.filter((id) => !byId.has(id));
  if (unknown.length) warnings.push(`Dropped node ids not on this tree: ${unknown.join(', ')}.`);
  return ids.filter((id) => byId.has(id) && !byId.get(id).start);
}

function jewelWarning(variant, warnings) {
  const n = Object.keys(variant.jewels || {}).length;
  if (n) warnings.push(`${n} socketed jewels are not imported (only the tree is).`);
}

function parsePoe2(data, tree) {
  const ext = tree.ext.poe2;
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const startOf = new Set(ext.classes.map((c) => c.start));
  const builds = [];
  for (const profile of data.profiles) {
    for (const variant of profile.passives?.variants || []) {
      const warnings = [];
      const history = replay(variant.history);
      // The class: from the ascendancy, else the start next to the first node taken.
      let cls = ext.classes.find((c) => (c.ascendancyIds || []).includes(profile.ascendancy));
      if (!cls && history.length) {
        const first = history.find((id) => byId.get(id)?.section === 'main');
        const start = tree.edges.find((e) => (e.from === first && startOf.has(e.to)) || (e.to === first && startOf.has(e.from)));
        const id = start && (startOf.has(start.from) ? start.from : start.to);
        cls = ext.classes.find((c) => c.start === id);
      }
      if (!cls) throw new Error(`Can't tell the class of Maxroll profile "${profile.name}".`);

      const build = { app: 'lmg-tree-build', v: 1, tree: tree.id, name: [profile.name, variant.name].filter(Boolean).join(': ') };
      if (profile.level) build.context = { level: profile.level };
      build.start = cls.start;
      if (profile.ascendancy) {
        const i = (cls.ascendancyIds || []).indexOf(profile.ascendancy);
        if (i >= 0) build.picks = { ascendancy: cls.ascendancies[i] };
        else warnings.push(`Ascendancy ${profile.ascendancy} isn't on this tree.`);
      }
      const nodes = allocation(history, byId, warnings);
      build.ranks = Object.fromEntries(nodes.map((id) => [id, 1]));
      const options = {};
      for (const [id, a] of Object.entries(variant.attributes || {})) if (build.ranks[id] && ATTRIBUTE[a]) options[id] = ATTRIBUTE[a];
      if (Object.keys(options).length) build.options = options;
      // Maxroll's attribute map often misses taken nodes (seen on live planners); say so rather than guess.
      const unpicked = nodes.filter((id) => byId.get(id).kind === 'attribute' && !options[id]).length;
      if (unpicked) warnings.push(`${unpicked} attribute nodes have no attribute chosen in this planner; pick them here.`);
      if (nodes.length) build.steps = nodes.map((node) => ({ node }));
      jewelWarning(variant, warnings);
      builds.push({ build, warnings });
    }
  }
  return builds;
}

function parsePoe1(data, tree) {
  const ext = tree.ext.poe1;
  const byId = new Map(tree.nodes.map((n) => [n.id, n]));
  const ascEmbed = data.embeds.find((e) => e.type === 'ascendancy');
  const ascNodes = replay(ascEmbed?.steps?.at(-1));
  const builds = [];
  for (const embed of data.embeds.filter((e) => e.type === 'passives')) {
    const cls = ext.classes[POE1_CLASS.indexOf(embed.charClass)];
    if (!cls) throw new Error(`Unknown Maxroll class ${embed.charClass}.`);
    for (const variant of embed.variants || []) {
      const warnings = [];
      const build = { app: 'lmg-tree-build', v: 1, tree: tree.id, name: [embed.name, variant.name].filter(Boolean).join(': '), start: cls.start };
      if (ascEmbed?.ascendancy) {
        const section = tree.sections.find((s) => s.name === ascEmbed.ascendancy && cls.ascendancies.includes(s.id));
        if (section) build.picks = { ascendancy: section.id };
        else warnings.push(`Ascendancy ${ascEmbed.ascendancy} isn't on this tree for ${cls.name}.`);
      }
      const main = allocation(replay(variant.history), byId, warnings);
      const asc = build.picks ? allocation(ascNodes, byId, warnings) : [];
      build.ranks = Object.fromEntries([...main, ...asc].map((id) => [id, 1]));
      const options = {};
      // Maxroll keeps choices for masteries a respec dropped; only taken ones count.
      for (const [id, index] of Object.entries(variant.masteries || {})) {
        if (!build.ranks[id]) continue;
        const option = byId.get(id)?.options?.[index];
        if (option) options[id] = option.id;
        else warnings.push(`Dropped mastery choice ${index} on node ${id}.`);
      }
      if (Object.keys(options).length) build.options = options;
      if (main.length) build.steps = main.map((node) => ({ node }));
      jewelWarning(variant, warnings);
      if (Object.keys(variant.tattoos || {}).length) warnings.push('Tattoos are not imported.');
      builds.push({ build, warnings });
    }
  }
  return builds;
}

export function parseMaxrollProfile(json, tree) {
  const { data } = readDoc(json);
  const game = maxrollGame(json);
  if (tree.game !== game) throw new Error(`This Maxroll planner is for ${game}, not ${tree.game}.`);
  const builds = game === 'poe2' ? parsePoe2(data, tree) : parsePoe1(data, tree);
  if (!builds.length) throw new Error('This Maxroll planner has no passive trees.');
  return { builds };
}
