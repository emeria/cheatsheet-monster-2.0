import games from '../content/games';
import poe from '../content/poe';
import wow from '../content/wow';
import { RESERVED_SHEET_IDS, findSheet, legacyHashTarget, sheetNeighbours, sheetPath } from './sheetRoutes';

const sheetGames = games.filter((g) => g.cheatsheets.length);

test('every game has a genre', () => {
  for (const game of games) expect(game.genre, game.id).toEqual(expect.any(String));
});

test('sheet ids are unique per game and never shadow /tools or /embed', () => {
  for (const game of games) {
    const ids = game.cheatsheets.map((s) => s.id);
    expect(new Set(ids).size, game.id).toBe(ids.length);
    for (const id of ids) expect(RESERVED_SHEET_IDS).not.toContain(id);
  }
});

test('sheetPath nests the sheet under its game', () => {
  const sheet = poe.cheatsheets[0];
  expect(sheetPath(poe, sheet)).toBe(`/poe/${sheet.id}`);
  expect(findSheet(poe, sheet.id)).toBe(sheet);
  expect(findSheet(poe, 'nope')).toBeUndefined();
});

test('neighbours follow content order and stop at the ends', () => {
  const sheets = poe.cheatsheets;
  expect(sheetNeighbours(poe, sheets[0].id)).toEqual({ prev: null, next: sheets[1] });
  expect(sheetNeighbours(poe, sheets[1].id)).toEqual({ prev: sheets[0], next: sheets[2] ?? null });
  expect(sheetNeighbours(poe, sheets.at(-1).id).next).toBeNull();
  expect(sheetNeighbours(poe, 'nope')).toEqual({ prev: null, next: null });
});

describe('legacyHashTarget', () => {
  test.each(sheetGames.flatMap((g) => g.cheatsheets.map((s) => [g, s])))('%s #%s redirects to its sheet page', (game, sheet) => {
    expect(legacyHashTarget(game, `#${sheet.id}`)).toBe(`/${game.id}/${sheet.id}`);
  });

  test('a nested section goes to its sheet, keeping the hash', () => {
    const parent = games.flatMap((g) => g.cheatsheets.map((s) => [g, s])).find(([, s]) => s.children?.length);
    const [game, sheet] = parent;
    const child = sheet.children[0];
    expect(legacyHashTarget(game, `#${child.id}`)).toBe(`/${game.id}/${sheet.id}#${child.id}`);
  });

  test('a tool goes to the tools page', () => {
    const tool = wow.tools[0];
    expect(legacyHashTarget(wow, `#${tool.id}`)).toBe(`/wow/tools#${tool.id}`);
  });

  test('link sections, unknown ids and empty hashes stay on the hub', () => {
    const resource = poe.resources[0];
    expect(legacyHashTarget(poe, `#${resource.id}`)).toBeNull();
    expect(legacyHashTarget(poe, '#nope')).toBeNull();
    expect(legacyHashTarget(poe, '')).toBeNull();
    expect(legacyHashTarget(poe, '#')).toBeNull();
  });
});
