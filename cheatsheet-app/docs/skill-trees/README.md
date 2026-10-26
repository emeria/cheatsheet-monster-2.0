# Skill tree data

How the cheat sheet stores skill trees (PoE passive trees, WoW talent trees and the rest) so that
every game uses the same shapes. The rules engine and renderer come from `lmg-tree-kit`; this
repo holds the game data and the adapters that read and write each game's own build formats.

- [formats.md](formats.md): field reference for the tree, build and layout files.
- [adding-a-tree.md](adding-a-tree.md): checklist for a new game, class or patch.

## Three files, three jobs

| File | Holds | One per |
|---|---|---|
| `<tree-id>.tree.json` | What exists: nodes, ranks, edges, sections, point pools, requirements, choices | game patch (PoE) or class (WoW) |
| `<name>.build.json` | What a player took: ranks per node, picks, options, level | build |
| `<tree-id>.<skin>.layout.json` | Where things are drawn: placement mode per section, node positions, edge paths, theme | tree and art skin |

They are kept apart so one tree can have many builds and many skins. **Positions never go in the
tree**, and game rules never go in the layout.

Tree and layout files live in `src/data/trees/`. Builds are not stored in the repo yet. The app
creates them from imports, and the adapters return them.

## Ids

- Tree ids are `<game>-<patch>` for imported trees (`poe1-3.29.1`, `poe2-0.5.2`) and
  `<game>-<class>` for hand-authored ones (`wow-classic-warrior`).
- Node ids are strings that stay the same across patches. Use the game's own id when the source
  has one: PoE's skill hash (`"64128"`). If not, use a kebab-case name (`"mortal-strike"`). Builds
  refer to nodes only by id, so changing an id breaks saved builds. Use the tree's `renames` map
  when an id has to change.
- Section ids are kebab-case (`arms`, `juggernaut`, `bloodline-aul`).

## Saving

Every file is saved in **stable form**, so git diffs show only real changes:

- `JSON.stringify(x, null, 1)` plus a final newline.
- Keys in the order the reference in [formats.md](formats.md) lists them.
- Defaults are left out (`ranks: 1`, `cost: 1`, `parent: null` and so on).
- `app` and `v` come first: `lmg-tree`, `lmg-tree-build`, `lmg-tree-layout` or `lmg-tree-versions`, each at `v: 1`.
- Keys starting with `_` are never saved. Adapters use them for round-trip details, such as
  `_url` on a decoded tree link.

**Never hand-edit a generated file.** Each tree file comes from a script, so change the script
and rerun it:

| Trees | Source | Command |
|---|---|---|
| PoE1 and PoE2 | GGG's official exports, pinned in `scripts/tree-pins.json` | `npm run import:poe-trees` (`--check`, `--pin <game> <tag>`) |
| WoW Classic Warrior | talent tables in `scripts/wow-classic-warrior-tree.mjs` | `node scripts/wow-classic-warrior-tree.mjs` |

## Versions

`src/data/trees/versions.json` lists every imported tree per game, with its source commit, its
checksum, and which one is `latest`. `pickTree(versions, game, patch)` in `src/lib/treeVersions.js`
chooses the tree for a build, and imports use the patch a link names when it names one. The WoW
Classic tree isn't in the registry yet, because it has no patches to choose between.

To move a build from an older pinned tree onto a newer one, use `migrateBuild(build, from, to)` in
`src/lib/treeMigrate.js`. It applies the target tree's `renames`, matches the class by name, and
lists every node, pick or choice it drops.

After pinning a new patch, run the live check, which imports real public builds and validates them
in the kit engine (it downloads, so it's off by default):
`LIVE_BUILDS=1 KIT=<path to lmg-tree-kit> npx vitest run src/lib/liveBuilds`.

## Game-specific data: `ext`

Anything only one game's adapters need goes under `ext.<game>` in the tree, never in the shared
fields:

| Key | Used by | Holds |
|---|---|---|
| `ext.poe1.classes`, `ext.poe1.bloodlines` | tree links, PoB codes, Maxroll | class order (with each class's start node and ascendancies) and bloodline order, as the game numbers them |
| `ext.poe2.classes` | PoB codes, Maxroll | the same for PoE2, plus `ascendancyIds` |
| `ext.wowhead` | Wowhead links | class slug and the order of the trees in a link |

The engine ignores `ext`. If a rule needs it, the schema is missing something and should be
fixed in `lmg-tree-kit`.

## Import and export

Each external format has its own adapter in `src/lib/`. All of them return
`{ build, warnings }`, and drop unknown ids with a warning instead of failing silently.

| Format | Import | Export |
|---|---|---|
| Anything PoE a user pastes (tree link, PoB code or XML, pobb.in and other build sites, poeplanner, Maxroll) | `importPoeBuild(text, { versions, loadTree })` in `poeImport.js` | |
| Official PoE tree link | `decodeTreeUrl` in `poeTreeUrl.js` | `encodeTreeUrl` |
| Path of Building code | `pobBuild.js` (through `importPoeBuild`) | `encodePobCode` in `pobCode.js` (PoE1, passive tree only) |
| Wowhead Classic talent link | `decodeWowheadTalents` in `wowheadTalents.js` | `encodeWowheadTalents` |

Adapters only translate between formats. Checking whether a build is legal is the engine's job
(`validate`, `canAllocate`).
