// Vendors lmg-tree-kit's src/ into src/vendor/lmg-tree-kit, at a tagged release.
//
//   npm run sync:tree-kit -- v0.1.0                    (expects ../../../LootMonsterGames/lmg-tree-kit)
//   npm run sync:tree-kit -- v0.1.0 --kit C:/path/to/lmg-tree-kit
//   npm run sync:tree-kit -- 0e8b71d --untagged        (a commit, for trying an unreleased kit)
//
// Files are read from git at that ref, so the kit checkout's branch and local edits don't matter.
// The vendor folder is replaced whole and gets a VERSION.txt with the ref and commit. Never edit
// files in it by hand: change the kit, tag it, and sync again.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..');
const vendorDir = path.join(appDir, 'src', 'vendor', 'lmg-tree-kit');

function sync(kitDir, ref, { untagged = false, out = vendorDir } = {}) {
  const git = (...args) => execFileSync('git', ['-C', kitDir, ...args], { encoding: 'utf8' }).trim();
  if (!fs.existsSync(path.join(kitDir, '.git'))) throw new Error(`No lmg-tree-kit checkout at ${kitDir}. Pass --kit <path>.`);
  const tags = git('tag', '--list', ref);
  if (!tags && !untagged) throw new Error(`${ref} isn't a tag in ${kitDir}. Tag the kit, or pass --untagged to vendor a commit.`);
  const commit = git('rev-parse', '--verify', `${ref}^{commit}`);
  const files = git('ls-tree', '-r', '--name-only', commit, 'src').split('\n').filter(Boolean);
  if (!files.length) throw new Error(`${ref} has no src/ files.`);

  fs.rmSync(out, { recursive: true, force: true });
  for (const file of files) {
    const to = path.join(out, path.relative('src', file));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, execFileSync('git', ['-C', kitDir, 'show', `${commit}:${file}`]));
  }
  const note = `lmg-tree-kit ${ref}\ncommit ${commit}\nsynced by scripts/sync-tree-kit.js; don't edit these files by hand.\n`;
  fs.writeFileSync(path.join(out, 'VERSION.txt'), note);
  return { commit, files: files.map((f) => path.relative('src', f).replace(/\\/g, '/')) };
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i < 0 ? undefined : argv[i + 1];
  };
  const ref = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--kit');
  const kitDir = path.resolve(opt('--kit') || path.join(appDir, '..', '..', '..', 'LootMonsterGames', 'lmg-tree-kit'));
  if (!ref) {
    console.error('Usage: npm run sync:tree-kit -- <tag> [--kit <path>] [--untagged]');
    process.exit(1);
  }
  try {
    const { commit, files } = sync(kitDir, ref, { untagged: argv.includes('--untagged') });
    console.log(`Vendored lmg-tree-kit ${ref} (${commit.slice(0, 12)}): ${files.join(', ')}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { sync };
