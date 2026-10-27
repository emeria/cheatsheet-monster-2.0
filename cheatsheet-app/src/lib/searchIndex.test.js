import games from '../content/games';
import { buildSearchIndex, getSearchIndex, search } from './searchIndex';

const index = buildSearchIndex(games);

test('every cheat sheet, tool and link section is indexed', () => {
  for (const game of games) {
    for (const sheet of game.cheatsheets) {
      expect(index.find((e) => e.type === 'sheet' && e.gameId === game.id && e.id === sheet.id), `${game.id}/${sheet.id}`).toBeTruthy();
    }
    for (const tool of game.tools ?? []) {
      expect(index.find((e) => e.type === 'tool' && e.gameId === game.id && e.id === tool.id), `${game.id}/${tool.id}`).toBeTruthy();
    }
    for (const resource of game.resources) {
      expect(index.find((e) => e.type === 'link' && e.gameId === game.id && e.id === resource.id), `${game.id}/${resource.id}`).toBeTruthy();
    }
  }
});

test('every link item is indexed with its url', () => {
  const urls = new Set(index.filter((e) => e.url).map((e) => e.url));
  const missing = [];
  const visit = (value) => {
    if (value?.links) value.links.forEach((g) => g.items.forEach((i) => i.url && !urls.has(i.url) && missing.push(i.url)));
    value?.children?.forEach(visit);
  };
  games.forEach((g) => g.resources.forEach(visit));
  expect(missing).toEqual([]);
});

test('entries point at routes the app serves', () => {
  for (const e of index) {
    expect(e.to, e.title).toMatch(new RegExp(`^/${e.gameId}(/|#|$)`));
    expect(e.title).toBeTruthy();
  }
  const sheet = index.find((e) => e.type === 'sheet');
  expect(sheet.to).toBe(`/${sheet.gameId}/${sheet.id}`);
  expect(index.filter((e) => e.type === 'tool').every((e) => e.to === `/${e.gameId}/tools#${e.id}`)).toBe(true);
});

test('getSearchIndex builds once', () => {
  expect(getSearchIndex()).toBe(getSearchIndex());
  expect(getSearchIndex().length).toBe(index.length);
});

describe('search', () => {
  const fixture = [
    { type: 'sheet', gameName: 'Path of Exile', title: 'Heist', text: 'contracts and blueprints' },
    { type: 'link', gameName: 'Path of Exile', title: 'Heist wiki', text: 'Heist reference' },
    { type: 'sheet', gameName: 'Last Epoch', title: 'Monolith', text: 'echoes' },
  ];

  test('requires every word and ranks title matches first', () => {
    expect(search(fixture, 'heist').map((e) => e.title)).toEqual(['Heist', 'Heist wiki']);
    expect(search(fixture, 'heist blueprints').map((e) => e.title)).toEqual(['Heist']);
    expect(search(fixture, 'last monolith').map((e) => e.title)).toEqual(['Monolith']);
  });

  test('is case-insensitive and empty for blank or unmatched queries', () => {
    expect(search(fixture, 'HEIST')).toHaveLength(2);
    expect(search(fixture, '   ')).toEqual([]);
    expect(search(fixture, 'zzz')).toEqual([]);
  });

  test('finds real content', () => {
    const first = games.find((g) => g.cheatsheets.length).cheatsheets[0];
    expect(search(index, first.title).some((e) => e.id === first.id)).toBe(true);
  });
});
