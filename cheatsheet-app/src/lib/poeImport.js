// One entry point for every PoE build source a user can paste or drop:
//   - official tree links (pathofexile.com/passive-skill-tree/..., PoE1)
//   - poeplanner.com links
//   - build-site links PoB imports from (pobb.in, poe.ninja, Maxroll, pob.codes, poedb, pastebin, rentry)
//   - a PoB code (PoE1 or PoE2), or a PoB build file's XML (.xml from PoB's Builds folder)
//   - Maxroll planner links (PoE1 and PoE2) or their profile JSON
// Returns { game, source, builds: [{ build, warnings }], active }, one build per PoB tree set.
//
// `versions` is src/data/trees/versions.json; `loadTree(id)` returns that tree's JSON
// (the page can import it lazily, since PoE trees are a few MB each).
import { maxrollGame, maxrollProfileUrl, parseMaxrollProfile } from './maxrollPlanner';
import { decodeTreeUrl } from './poeTreeUrl';
import { decodePoePlannerUrl, isPoePlannerUrl, poePlannerGame } from './poePlanner';
import { fetchBuildSiteCode, findBuildSite, inflatePobCode, parsePobXml, specToBuild } from './pobBuild';
import { pickTree } from './treeVersions';

const OFFICIAL = /^https?:\/\/(www\.)?pathofexile\.com\/(fullscreen-)?passive-skill-tree\//i;

const withWarnings = (picked, result) => ({ ...result, warnings: [...picked.warnings, ...result.warnings] });

export async function importPoeBuild(input, { versions, loadTree, fetchFn = fetch }) {
  const text = input.trim();
  if (!text) throw new Error('Paste a tree link, a PoB code or a build link.');

  if (OFFICIAL.test(text)) {
    // .../passive-skill-tree/3.29.1/AAAA... carries the patch; older links don't.
    const patch = text.match(/passive-skill-tree\/(\d+\.\d+[^/]*)\//)?.[1];
    const picked = pickTree(versions, 'poe1', patch);
    const result = decodeTreeUrl(text, await loadTree(picked.id));
    return { game: 'poe1', source: 'pathofexile.com', builds: [withWarnings(picked, result)], active: 0 };
  }

  if (isPoePlannerUrl(text)) {
    const game = poePlannerGame(text);
    const picked = pickTree(versions, game);
    const result = decodePoePlannerUrl(text, await loadTree(picked.id));
    return { game, source: 'poeplanner.com', builds: [{ ...result, warnings: result.warnings }], active: 0 };
  }

  const maxrollUrl = maxrollProfileUrl(text);
  if (maxrollUrl || text.startsWith('{')) {
    let json = text;
    if (maxrollUrl) {
      try {
        const res = await fetchFn(maxrollUrl);
        if (!res.ok) throw new Error();
        json = await res.text();
      } catch {
        throw new Error(`Couldn't download this Maxroll planner. Open ${maxrollUrl}, copy all of it and paste it here, or use the planner's PoB export.`);
      }
    }
    // Maxroll's own tree version numbers don't map to patches, so this uses the latest tree.
    const game = maxrollGame(json);
    const picked = pickTree(versions, game);
    const result = parseMaxrollProfile(json, await loadTree(picked.id));
    return { game, source: 'Maxroll', builds: result.builds, active: 0 };
  }

  let source = 'Path of Building';
  let code = text;
  if (/^https?:\/\//i.test(text)) {
    const link = findBuildSite(text);
    if (!link) throw new Error("That link isn't one this tool reads. Use a tree link, poeplanner, pobb.in, poe.ninja, Maxroll, pob.codes, poedb, pastebin or rentry link, or paste the PoB code.");
    source = link.site.label;
    code = await fetchBuildSiteCode(link, fetchFn);
  }

  const xml = code.startsWith('<') ? code : await inflatePobCode(code);
  const pob = parsePobXml(xml);
  const trees = new Map();
  const builds = [];
  for (const spec of pob.specs) {
    const picked = pickTree(versions, pob.game, spec.treeVersion);
    if (!trees.has(picked.id)) trees.set(picked.id, await loadTree(picked.id));
    builds.push(withWarnings(picked, specToBuild(pob, spec, trees.get(picked.id))));
  }
  return { game: pob.game, source, builds, active: Math.min(pob.activeSpec, builds.length - 1) };
}
