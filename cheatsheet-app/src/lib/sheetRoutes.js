// Route helpers for per-sheet pages (/<game>/<sheet>). Only a game's top-level `cheatsheets`
// get their own page. Tools live on /<game>/tools and link sections stay on the hub.

// Path segments under /<game> that a sheet id must not use.
export const RESERVED_SHEET_IDS = ['tools', 'embed'];

export const hubPath = (game) => `/${game.id}`;
export const sheetPath = (game, sheet) => `/${game.id}/${sheet.id}`;

export const findSheet = (game, id) => game.cheatsheets.find((s) => s.id === id);

// The sheet before and after this one in the game's order; null at either end.
export function sheetNeighbours(game, id) {
  const i = game.cheatsheets.findIndex((s) => s.id === id);
  if (i < 0) return { prev: null, next: null };
  return { prev: game.cheatsheets[i - 1] ?? null, next: game.cheatsheets[i + 1] ?? null };
}

// Finds a section by id anywhere under `sections`, returning it with its top-level ancestor.
function locate(sections, id, top = null) {
  for (const section of sections ?? []) {
    const root = top ?? section;
    if (section.id === id) return { section, root };
    const found = locate(section.children, id, root);
    if (found) return found;
  }
  return null;
}

// Where an old `/<game>#<id>` link now lives, or null if the hash should stay on the hub:
//   a cheat sheet            -> /<game>/<id>
//   inside a cheat sheet     -> /<game>/<sheet>#<id>
//   a tool                   -> /<game>/tools#<id>
// Link sections and unknown ids return null, so they keep opening on the hub.
export function legacyHashTarget(game, hash) {
  const id = decodeURIComponent((hash ?? '').replace(/^#/, ''));
  if (!id) return null;

  const sheet = locate(game.cheatsheets, id);
  if (sheet) {
    return sheet.root === sheet.section ? sheetPath(game, sheet.section) : `${sheetPath(game, sheet.root)}#${id}`;
  }
  if (locate(game.tools, id)) return `/${game.id}/tools#${id}`;
  return null;
}
