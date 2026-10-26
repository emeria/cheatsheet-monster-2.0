# Adding a tree

## A new patch of an imported game (PoE)

1. Look for new GGG tags: `npm run import:poe-trees -- --check`.
2. Pin one and import it: `npm run import:poe-trees -- --pin poe1 3.29.2`. This records the tag's
   commit and checksum in `scripts/tree-pins.json`, writes the tree and layout files, and updates
   `versions.json`. Other options are listed at the top of `scripts/import-poe-trees.js`.
3. Run the tests. `src/data/trees/trees.test.js` checks the links, the layout's coverage and the
   class tables.
4. Keep the old pins. A build loads the pinned tree for its patch (PoB's `3_25` picks the newest
   `3.25.x` pin); with no pin for its patch it goes on the latest tree, with a warning that nodes
   may have moved. Each pinned PoE tree adds about 2.5 MB, so pin the patches people still share
   builds for. Add `renames` only when GGG changes ids.

## A hand-authored tree (a WoW class, a game with no export)

1. Write a generator script in `scripts/`, like `scripts/wow-classic-warrior-tree.mjs`. Keep the
   data in plain tables at the top of the script and the save code at the bottom. The script is
   the source of truth; the JSON is its output.
2. Check every value against a primary source (the game's data tables, such as wago.tools for
   WoW), not just a guide site. Note the source in the tree's `source` field.
3. Give it a layout. Grid trees need only one section entry each; the positions come from
   `tier` and `col`.
4. Add `ext.<site>` tables for any build site whose links you want to read, and an adapter in
   `src/lib/` with tests against a real link.
5. Add a `describe` block to `src/data/trees/trees.test.js`. Test the data's structure (unique
   ids, one node per cell, arrows that point at real nodes, one value per rank) rather than the
   game's rules, which the engine checks.

## A new game

Before writing any data, check that every mechanic fits the shapes in [formats.md](formats.md).
If one doesn't, fix the schema in `lmg-tree-kit` first. Don't add a game-specific field to the
tree, and don't put a rule in `ext`.
