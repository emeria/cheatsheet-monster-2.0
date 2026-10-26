// Live check: imports real public builds and validates them in the lmg-tree-kit engine.
// Off by default (it downloads); run it after pinning a new patch:
//
//   LIVE_BUILDS=1 KIT=C:/git/LootMonsterGames/lmg-tree-kit npx vitest run src/lib/liveBuilds
//
// KIT is not needed once the kit is vendored in src/vendor/lmg-tree-kit. Only links are kept
// here, never the builds themselves. Node's fetch has no CORS, so every site works in this test
// even where the browser can't download (pobb.in sends no CORS header).
import fs from 'fs';
import path from 'path';
import { importPoeBuild } from './poeImport';

// Vite only loads files under the app, and the kit lives outside it until it is vendored. Its
// core has no imports of its own, so a copy in node_modules/.cache loads like any app file.
async function loadKit(file) {
  const copy = path.join(import.meta.dirname, '..', '..', 'node_modules', '.cache', 'lmg-tree-kit', 'tree-core.js');
  fs.mkdirSync(path.dirname(copy), { recursive: true });
  fs.copyFileSync(file, copy);
  return import(/* @vite-ignore */ copy);
}

const LINKS = [
  // PoE1: a 13-tree-set leveling guide on 3.25 (pobb.in) and a Maxroll PoE1 planner.
  { link: 'https://pobb.in/Ktbt7ZvRs_hn' },
  // Maxroll's Boneshatter Juggernaut guide (3.29). Its "Cluster" tree set paths through cluster
  // jewel sub-trees, which arrive in milestone 3, so connectivity errors are expected there.
  { link: 'https://pobb.in/4IE2ysIuCdPP', allow: ['connectivity'] },
  { link: 'https://maxroll.gg/poe/planner/yk0106jl' },
  // PoE2: community builds on 0.5 and 0.4. 8cxjdbzEgsyq uses a jewel that allows unconnected
  // nodes (milestone 3), so connectivity errors are expected there.
  { link: 'https://pobb.in/_ZU_HFdera9X' },
  { link: 'https://pobb.in/8cxjdbzEgsyq', allow: ['connectivity'] },
  { link: 'https://pobb.in/j13qD7PU0JZQ' },
  // Maxroll's PoE2 attribute map misses taken attribute nodes, so option errors are expected.
  { link: 'https://maxroll.gg/poe2/planner/6urr00u6', allow: ['option', 'budget', 'connectivity'] },
];

const dir = path.join(import.meta.dirname, '..', 'data', 'trees');
const read = (file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const vendored = path.join(import.meta.dirname, '..', 'vendor', 'lmg-tree-kit', 'tree-core.js');
const kitCore = fs.existsSync(vendored) ? vendored : process.env.KIT && path.join(process.env.KIT, 'src', 'tree-core.js');

describe.skipIf(!process.env.LIVE_BUILDS || !kitCore)('live builds', () => {
  const versions = read('versions.json');
  const loadTree = async (id) => read(`${id}.tree.json`);

  test.each(LINKS)('$link imports and validates', async ({ link, allow = [] }) => {
    const core = await loadKit(kitCore);
    const result = await importPoeBuild(link, { versions, loadTree, fetchFn: fetch });
    expect(result.builds.length).toBeGreaterThan(0);
    for (const { build, warnings } of result.builds) {
      const json = read(`${build.tree}.tree.json`);
      const flags = json.context.flags.map((f) => f.id);
      const v = core.validate(core.load(json), { ...build, context: { level: 100, ...build.context, flags } });
      const unexpected = v.errors.filter((e) => !allow.includes(e.code));
      expect(unexpected, `${build.name}: ${warnings.join(' | ')}`).toEqual([]);
    }
  }, 60_000);
});
