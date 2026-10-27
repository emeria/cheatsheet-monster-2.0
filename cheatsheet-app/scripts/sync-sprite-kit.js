// Vendors the lmg-sprite-kit web loader and the Cheatsheet Monster mascot export, both pinned.
//
//   npm run sync:sprite-kit                                (the pins below; expects ../../../LootMonsterGames checkouts)
//   npm run sync:sprite-kit -- --kit-tag v0.3.0            (a different kit tag)
//   npm run sync:sprite-kit -- --kit C:/path/to/lmg-sprite-kit --goblin C:/path/to/sprite-goblin
//   npm run sync:sprite-kit -- --kit-tag 0e8b71d --untagged   (a kit commit, for trying an unreleased loader)
//
// The loader (loaders/web.js, web.d.ts) comes from lmg-sprite-kit at KIT_TAG and goes to
// src/vendor/lmg-sprite-kit. The mascot export (manifest.json + sheet png) is Sprite Goblin output,
// so it comes from sprite-goblin at MASCOT_REF and goes to public/assets/mascot. Everything is read
// from git at those refs, so checkout branches and local edits don't matter. Each folder is replaced
// whole and gets a VERSION.txt; the output is a pure function of the pins, so a re-run changes nothing.
// Never edit the vendored files by hand: change the kit or the mascot, then bump a pin and sync.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KIT_TAG = 'v0.2.0';
const MASCOT_REF = '9ceffdc'; // sprite-goblin feat/cheatsheet-monster-mascot; swap for a tag once merged
const MASCOT_DIR = 'examples/cheatsheet-monster/export/mascot';

const appDir = path.join(__dirname, '..');
const lmgDir = path.join(appDir, '..', '..', '..', 'LootMonsterGames');
const loaderOut = path.join(appDir, 'src', 'vendor', 'lmg-sprite-kit');
const mascotOut = path.join(appDir, 'public', 'assets', 'mascot');

const gitIn = (dir) => (...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();
const show = (dir, commit, file) => execFileSync('git', ['-C', dir, 'show', `${commit}:${file}`]);

function checkout(dir, name) {
  if (!fs.existsSync(path.join(dir, '.git'))) throw new Error(`No ${name} checkout at ${dir}. Pass --${name === 'sprite-goblin' ? 'goblin' : 'kit'} <path>.`);
}

// Replaces `out` with `files` (name -> bytes) plus a VERSION.txt, without touching files that already match.
function writeFolder(out, files, note) {
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  for (const [name, bytes] of Object.entries({ ...files, 'VERSION.txt': note })) fs.writeFileSync(path.join(out, name), bytes);
}

function sync({ kitDir, goblinDir, kitTag = KIT_TAG, untagged = false, mascotRef = MASCOT_REF, loaderTo = loaderOut, mascotTo = mascotOut } = {}) {
  checkout(kitDir, 'lmg-sprite-kit');
  checkout(goblinDir, 'sprite-goblin');
  const kit = gitIn(kitDir);
  if (!kit('tag', '--list', kitTag) && !untagged) throw new Error(`${kitTag} isn't a tag in ${kitDir}. Tag the kit, or pass --untagged to vendor a commit.`);
  const kitCommit = kit('rev-parse', '--verify', `${kitTag}^{commit}`);
  const goblinCommit = gitIn(goblinDir)('rev-parse', '--verify', `${mascotRef}^{commit}`);

  const loader = { 'web.js': show(kitDir, kitCommit, 'loaders/web.js'), 'web.d.ts': show(kitDir, kitCommit, 'loaders/web.d.ts') };
  const mascot = Object.fromEntries(
    ['manifest.json', 'cheatsheet-monster.png'].map((f) => [f, show(goblinDir, goblinCommit, `${MASCOT_DIR}/${f}`)]),
  );

  const note = (what, ref, commit, script = 'scripts/sync-sprite-kit.js') =>
    `${what} ${ref}\ncommit ${commit}\nsynced by ${script}; don't edit these files by hand.\n`;
  writeFolder(loaderTo, loader, note('lmg-sprite-kit', kitTag, kitCommit));
  writeFolder(mascotTo, mascot, note('sprite-goblin examples/cheatsheet-monster', mascotRef, goblinCommit));
  return { kitCommit, goblinCommit, loader: Object.keys(loader), mascot: Object.keys(mascot) };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i < 0 ? undefined : argv[i + 1];
  };
  try {
    const result = sync({
      kitDir: path.resolve(opt('--kit') || path.join(lmgDir, 'lmg-sprite-kit')),
      goblinDir: path.resolve(opt('--goblin') || path.join(lmgDir, 'sprite-goblin')),
      kitTag: opt('--kit-tag') || KIT_TAG,
      mascotRef: opt('--mascot-ref') || MASCOT_REF,
      untagged: argv.includes('--untagged'),
    });
    console.log(`Vendored lmg-sprite-kit ${opt('--kit-tag') || KIT_TAG} (${result.kitCommit.slice(0, 12)}): ${result.loader.join(', ')}`);
    console.log(`Vendored mascot ${opt('--mascot-ref') || MASCOT_REF} (${result.goblinCommit.slice(0, 12)}): ${result.mascot.join(', ')}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { sync, KIT_TAG, MASCOT_REF };
