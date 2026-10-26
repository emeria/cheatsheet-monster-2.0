// Builds lmg-tree-kit trees from GGG's passive tree exports, one per pinned version.
//
//   npm run import:poe-trees                          (every pin in scripts/tree-pins.json)
//   npm run import:poe-trees -- --game poe2           (one game; add --tag 0.5.2 for one version)
//   npm run import:poe-trees -- --pin poe2 0.5.3      (pin a new GGG tag, then import it)
//   npm run import:poe-trees -- --check               (list GGG tags newer than the latest pins)
//   npm run import:poe-trees -- --game poe1 --tag 3.29.1 --from path/to/data.json
//
// Each pin names a tag, its commit and the sha256 of the export file, so a moved tag can't
// change the data silently. Old pins stay, so builds saved on an older patch still convert.
// Writes src/data/trees/<game>-<tag>.tree.json and .default.layout.json, plus versions.json,
// the list of imported trees that build imports pick from. Downloads are cached in
// node_modules/.cache/tree-exports.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const converters = {
  poe1: require('./import-poe1-tree').convert,
  poe2: require('./poe2-tree').convert,
};

const appDir = path.join(__dirname, '..');
const pinsFile = path.join(__dirname, 'tree-pins.json');
const outDir = path.join(appDir, 'src', 'data', 'trees');
const cacheDir = path.join(appDir, 'node_modules', '.cache', 'tree-exports');

// Stable save: JSON.stringify(x, null, 1) and a final newline, so diffs show only real changes.
const stable = (x) => `${JSON.stringify(x, null, 1)}\n`;
// GGG tags sort as versions with an optional letter: 3.25.0 < 3.25.3d < 3.29.1.
const versionKey = (tag) => tag.split('.').map((p) => [Number.parseInt(p, 10) || 0, p.replace(/^\d+/, '')]);
function compareTags(a, b) {
  const [x, y] = [versionKey(a), versionKey(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const [n, s] = x[i] || [0, ''];
    const [m, t] = y[i] || [0, ''];
    if (n !== m) return n - m;
    if (s !== t) return s < t ? -1 : 1;
  }
  return 0;
}

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'cheatsheet-monster tree importer' } });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  return res;
}

// Tag -> commit, following annotated tags to the commit they point at.
async function commitOf(repo, tag) {
  let ref = (await (await get(`https://api.github.com/repos/${repo}/git/ref/tags/${tag}`)).json()).object;
  if (ref.type === 'tag') ref = (await (await get(ref.url)).json()).object;
  return ref.sha;
}

async function readExport(game, source, pin, from) {
  if (from) return fs.readFileSync(from);
  const cached = path.join(cacheDir, `${game}-${pin.tag}-${pin.commit.slice(0, 12)}.json`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  const bytes = Buffer.from(await (await get(`https://raw.githubusercontent.com/${source.repo}/${pin.commit}/${source.file}`)).arrayBuffer());
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cached, bytes);
  return bytes;
}

function writeVersions(pins) {
  const games = {};
  for (const [game, source] of Object.entries(pins)) {
    const trees = [...source.pins]
      .sort((a, b) => compareTags(a.tag, b.tag))
      .filter((pin) => fs.existsSync(path.join(outDir, `${game}-${pin.tag}.tree.json`)))
      .map((pin) => ({
        id: `${game}-${pin.tag}`,
        patch: pin.tag,
        source: `${source.repo}@${pin.tag}`,
        commit: pin.commit,
        sha256: pin.sha256,
        tree: `${game}-${pin.tag}.tree.json`,
        layout: `${game}-${pin.tag}.default.layout.json`,
      }));
    if (trees.length) games[game] = { latest: trees.at(-1).id, trees };
  }
  fs.writeFileSync(path.join(outDir, 'versions.json'), stable({ app: 'lmg-tree-versions', v: 1, games }));
}

async function main(argv) {
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i < 0 ? undefined : argv[i + 1];
  };
  const pins = JSON.parse(fs.readFileSync(pinsFile, 'utf8'));
  let game = opt('--game');
  let tag = opt('--tag');
  const from = opt('--from');

  if (argv.includes('--check')) {
    for (const [g, source] of Object.entries(pins)) {
      // GitHub lists tags newest first; everything above the latest pin is new.
      const tags = (await (await get(`https://api.github.com/repos/${source.repo}/tags?per_page=20`)).json()).map((t) => t.name);
      const latest = source.pins.map((p) => p.tag).sort(compareTags).at(-1);
      const newer = latest && tags.includes(latest) ? tags.slice(0, tags.indexOf(latest)) : tags.slice(0, 1);
      console.log(newer.length ? `${g}: newer than ${latest || 'nothing pinned'}: ${newer.join(', ')} (pin with --pin ${g} ${newer[0]})` : `${g}: ${latest} is the newest tag.`);
    }
    return;
  }

  const pinAt = argv.indexOf('--pin');
  if (pinAt >= 0) {
    [game, tag] = [argv[pinAt + 1], argv[pinAt + 2]];
    const source = pins[game];
    if (!source || !tag) throw new Error('Usage: --pin <poe1|poe2> <tag>');
    if (source.pins.some((p) => p.tag === tag)) throw new Error(`${game} ${tag} is already pinned.`);
    const commit = await commitOf(source.repo, tag);
    const pin = { tag, commit, sha256: '' };
    pin.sha256 = sha256(await readExport(game, source, pin, from));
    source.pins.push(pin);
    // Oldest first, so the last pin is the newest patch.
    source.pins.sort((a, b) => compareTags(a.tag, b.tag));
    fs.writeFileSync(pinsFile, stable(pins));
    console.log(`Pinned ${game} ${tag} at ${commit.slice(0, 12)}.`);
  }

  const wanted = Object.entries(pins)
    .filter(([g]) => !game || g === game)
    .flatMap(([g, source]) => source.pins.filter((p) => !tag || p.tag === tag).map((pin) => [g, source, pin]));
  if (!wanted.length) throw new Error(`Nothing pinned for ${game || 'any game'}${tag ? ` ${tag}` : ''}. Pin it with --pin <game> <tag>.`);
  if (from && wanted.length !== 1) throw new Error('--from needs --game and --tag naming one pin.');

  fs.mkdirSync(outDir, { recursive: true });
  for (const [g, source, pin] of wanted) {
    const bytes = await readExport(g, source, pin, from);
    const hash = sha256(bytes);
    if (hash !== pin.sha256) throw new Error(`${g} ${pin.tag}: ${source.file} hash ${hash} doesn't match its pin.`);
    const { tree, layout } = converters[g](JSON.parse(bytes.toString('utf8')), { repo: source.repo, ...pin });
    for (const [file, json] of [[`${tree.id}.tree.json`, tree], [`${tree.id}.default.layout.json`, layout]]) {
      fs.writeFileSync(path.join(outDir, file), stable(json));
    }
    console.log(`  ${tree.id}: ${tree.nodes.length} nodes, ${tree.edges.length} edges, ${tree.sections.length} sections.`);
  }
  writeVersions(pins);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
