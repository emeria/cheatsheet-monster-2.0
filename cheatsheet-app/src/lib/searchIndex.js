import games from '../content/games';
import { sheetPath } from './sheetRoutes';

// A flat index over every sheet, tool and link, built once at startup from the content files.
// Entry: { type: 'sheet' | 'tool' | 'link', gameId, gameName, id, title, text, to, url? }
//   to  - the in-app path that shows the entry
//   url - set for individual links: where the link itself goes

function sectionEntries(game, section, type, to) {
  const entry = {
    type,
    gameId: game.id,
    gameName: game.name,
    id: section.id,
    title: section.title,
    text: [section.navLabel, section.intro].filter(Boolean).join(' '),
    to,
  };
  const entries = [entry];

  for (const group of section.links ?? []) {
    entries.push(...linkEntries(game, section, group, to));
  }
  for (const child of section.children ?? []) {
    entries.push(...sectionEntries(game, child, type, type === 'sheet' ? `${to.split('#')[0]}#${child.id}` : to));
  }
  return entries;
}

function linkEntries(game, section, group, to) {
  const entries = [];
  for (const item of group.items) {
    const extras = (item.extras ?? []).map((e) => e.label);
    entries.push({
      type: 'link',
      gameId: game.id,
      gameName: game.name,
      id: section.id,
      title: item.label ?? item.text ?? '',
      text: [item.text, item.note, group.heading, ...extras].filter(Boolean).join(' '),
      to,
      url: item.url,
    });
  }
  return entries;
}

export function buildSearchIndex(gameList = games) {
  const index = [];
  for (const game of gameList) {
    for (const sheet of game.cheatsheets) {
      index.push(...sectionEntries(game, sheet, 'sheet', sheetPath(game, sheet)));
    }
    for (const tool of game.tools ?? []) {
      index.push(...sectionEntries(game, tool, 'tool', `/${game.id}/tools#${tool.id}`));
    }
    for (const resource of game.resources ?? []) {
      index.push(...sectionEntries(game, resource, 'link', `/${game.id}#${resource.id}`));
    }
  }
  return index.filter((entry) => entry.title);
}

let cached;
// The shared index. Built on first use; index.js calls it at startup so the first search is instant.
export function getSearchIndex() {
  cached ??= buildSearchIndex();
  return cached;
}

const norm = (s) => s.toLowerCase();

// Entries matching every word in `query`, best first: title hits outrank text hits, whole-title
// matches and prefix matches rank highest.
export function search(index, query, limit = 20) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const scored = [];
  for (const entry of index) {
    const title = norm(entry.title);
    const text = norm(`${entry.title} ${entry.text} ${entry.gameName}`);
    if (!words.every((w) => text.includes(w))) continue;
    let score = words.reduce((sum, w) => sum + (title.includes(w) ? 2 : 1), 0);
    if (title === words.join(' ')) score += 10;
    else if (title.startsWith(words[0])) score += 3;
    if (entry.type === 'sheet') score += 1;
    scored.push({ entry, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}
