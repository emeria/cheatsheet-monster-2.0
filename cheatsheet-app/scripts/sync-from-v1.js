// Copies images and CSV data from the original static site (cheatsheet_monster)
// into public/assets, so updates made there can be pulled into 2.0 in one step.
//
//   npm run sync                      (expects ../../cheatsheet_monster next to this repo)
//   npm run sync -- C:/path/to/cheatsheet_monster
//
// Only copies files that are new or changed. Never deletes anything.
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..');
const v1Dir = path.resolve(process.argv[2] || path.join(appDir, '..', '..', 'cheatsheet_monster'));
const assetsDir = path.join(appDir, 'public', 'assets');

const IMAGE = /\.(png|jpe?g|webp|gif|svg)$/i;

// [source relative to v1, destination relative to public/assets, file filter]
const copies = [
  ['poe/pics', 'poe/pics', IMAGE],
  ['poe2/pics', 'poe2/pics', IMAGE],
  ['lastepoch/pics', 'lastepoch/pics', IMAGE],
  ['wow/pics', 'wow/pics', IMAGE],
  ['.', 'home', IMAGE],
  ['poe2/rewards.csv', 'poe2/data/rewards.csv'],
  ['lastepoch/data/leveling.csv', 'lastepoch/data/leveling.csv'],
  ['lastepoch/data/le_blessings.csv', 'lastepoch/data/le_blessings.csv'],
  ['lastepoch/data/dungeon_schedule.csv', 'lastepoch/data/dungeon_schedule.csv'],
];

if (!fs.existsSync(v1Dir)) {
  console.error(`Original site not found at ${v1Dir}`);
  console.error('Pass its path: npm run sync -- C:/path/to/cheatsheet_monster');
  process.exit(1);
}

let changed = 0;

function copyFile(from, to) {
  const next = fs.readFileSync(from);
  if (fs.existsSync(to) && fs.readFileSync(to).equals(next)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, next);
  changed++;
  console.log(`  ${path.relative(appDir, to)}`);
}

for (const [src, dest, filter] of copies) {
  const from = path.join(v1Dir, src);
  const to = path.join(assetsDir, dest);
  if (!fs.existsSync(from)) {
    console.warn(`Skipped missing ${src}`);
    continue;
  }
  if (fs.statSync(from).isDirectory()) {
    for (const name of fs.readdirSync(from)) {
      if (filter.test(name) && fs.statSync(path.join(from, name)).isFile()) {
        copyFile(path.join(from, name), path.join(to, name));
      }
    }
  } else {
    copyFile(from, to);
  }
}

console.log(changed ? `Updated ${changed} file(s).` : 'Already up to date.');
