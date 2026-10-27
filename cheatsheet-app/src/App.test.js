import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import games from './content/games';

const assetsDir = path.join(import.meta.dirname, '..', 'public', 'assets');

// Serve CSVs straight from public/assets so pages render with their real data.
beforeEach(() => {
  global.fetch = vi.fn((url) => {
    const file = path.join(assetsDir, url.split('/assets/')[1]);
    const ok = fs.existsSync(file);
    return Promise.resolve({ ok, status: ok ? 200 : 404, text: () => Promise.resolve(ok ? fs.readFileSync(file, 'utf8') : '') });
  });
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  );

test('home page links to every listed game', () => {
  renderAt('/');
  for (const game of games.filter((g) => g.tile)) {
    expect(screen.getByAltText(game.name)).toBeInTheDocument();
  }
});

test.each(games.map((g) => [g.id, g]))('%s page renders every section', async (id, game) => {
  const { container } = renderAt(`/${id}`);
  for (const section of [...game.cheatsheets, ...game.resources]) {
    expect(container.querySelector(`#${section.id}`)).not.toBeNull();
  }
  // Let CSV-backed widgets finish loading; none should report a missing file.
  await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  expect(container.querySelector('.error')).toBeNull();
});

const withTools = games.filter((g) => g.tools?.length);

test.each(withTools.map((g) => [g.id, g]))('%s trees and calculators have their own page', async (id, game) => {
  const main = renderAt(`/${id}`);
  expect(main.getAllByRole('link', { name: 'Trees & Calculators' })[0]).toHaveAttribute('href', `/${id}/tools`);
  for (const section of game.tools) expect(main.container.querySelector(`#${section.id}`)).toBeNull();
  main.unmount();

  const { container } = renderAt(`/${id}/tools`);
  for (const section of game.tools) expect(container.querySelector(`#${section.id}`)).not.toBeNull();
  expect(container.querySelector('.site-footer .affiliation')).toHaveTextContent(game.publisher);
});

test.each(withTools.flatMap((g) => g.tools.filter((s) => s.widget === 'talentTree').map((s) => [`/${g.id}/embed/${s.id}`, g])))(
  '%s is a read-only embed with no site chrome',
  async (url, game) => {
    const { container } = renderAt(url);
    expect(container.querySelector('.talent-tree.read-only')).not.toBeNull();
    expect(container.querySelector('.site-header, header')).toBeNull();
    expect(screen.queryByText('Import a build')).toBeNull();
    expect(container.querySelector('.embed-credit')).toHaveTextContent(`isn't affiliated with or endorsed by ${game.publisher}`);
    expect(screen.getByRole('link', { name: /Open in/ })).toHaveAttribute('href', expect.stringContaining(`${game.id}/tools`));
  }
);

test('an unknown embed says so', () => {
  renderAt('/wow/embed/nope');
  expect(screen.getByText(/No tree "nope"/)).toBeInTheDocument();
});

// Every image and CSV a content file mentions must exist under public/assets.
test('content files only reference assets that exist', () => {
  const missing = [];
  const visit = (value) => {
    if (typeof value === 'string' && /\.(png|jpe?g|webp|gif|csv)$/i.test(value)) {
      if (!fs.existsSync(path.join(assetsDir, value))) missing.push(value);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  visit(games);
  expect(missing).toEqual([]);
});

test.each([['/', games], ...games.map((g) => [`/${g.id}`, [g]])])('%s footer says the site is not affiliated with the publisher', (url, shown) => {
  const { container } = renderAt(url);
  const note = container.querySelector('.site-footer .affiliation').textContent;
  for (const game of shown) {
    expect(game.publisher).toBeTruthy();
    expect(note).toContain(`isn't affiliated with or endorsed by`);
    expect(note).toContain(game.publisher);
  }
});

const sheetGames = games.filter((g) => g.cheatsheets.length);
const allSheets = sheetGames.flatMap((g) => g.cheatsheets.map((s) => [g.id, s.id, g, s]));

describe('per-sheet pages', () => {
  test.each(allSheets)('/%s/%s renders only that sheet, with a breadcrumb', async (gameId, sheetId, game, sheet) => {
    const { container } = renderAt(`/${gameId}/${sheetId}`);
    expect(container.querySelector(`#${sheetId}`)).not.toBeNull();
    for (const other of game.cheatsheets.filter((s) => s.id !== sheetId)) {
      expect(container.querySelector(`#${other.id}`)).toBeNull();
    }
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(crumbs).toHaveTextContent(game.shortName ?? game.name);
    expect(screen.getByRole('link', { name: game.shortName ?? game.name })).toHaveAttribute('href', `/${gameId}`);
    expect(container.querySelector('.sheet-page > h1')).toHaveTextContent(sheet.title);
    expect(container.querySelector('.site-footer .affiliation')).toHaveTextContent(game.publisher);
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(container.querySelector('.error')).toBeNull();
  });

  test('prev and next link to the neighbouring sheets', () => {
    const game = sheetGames.find((g) => g.cheatsheets.length >= 3);
    const [a, b, c] = game.cheatsheets;
    renderAt(`/${game.id}/${b.id}`);
    const pager = screen.getByRole('navigation', { name: 'Other cheat sheets' });
    expect(pager.querySelector('[rel=prev]')).toHaveAttribute('href', `/${game.id}/${a.id}`);
    expect(pager.querySelector('[rel=next]')).toHaveAttribute('href', `/${game.id}/${c.id}`);
  });

  test('the first sheet has no prev and the last has no next', () => {
    const game = sheetGames[0];
    const first = renderAt(`/${game.id}/${game.cheatsheets[0].id}`);
    expect(first.container.querySelector('[rel=prev]')).toBeNull();
    expect(first.container.querySelector('[rel=next]')).not.toBeNull();
    first.unmount();
    const last = renderAt(`/${game.id}/${game.cheatsheets.at(-1).id}`);
    expect(last.container.querySelector('[rel=next]')).toBeNull();
  });

  test('a sheet with a credit shows it as its source', async () => {
    const { container } = renderAt('/lastepoch/leveling');
    expect(container.querySelector('.source-credit')).toHaveTextContent('Thanks to Terek_LE and Zaerick');
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
  });

  test('an unknown sheet falls back to the game hub', () => {
    const game = sheetGames[0];
    const { container } = renderAt(`/${game.id}/nope`);
    expect(container.querySelector('.game-page')).not.toBeNull();
    expect(container.querySelector('.sheet-page')).toBeNull();
  });

  test('/tools is still the tools page, not a sheet', () => {
    const { container } = renderAt('/wow/tools');
    expect(container.querySelector('#warrior-talents')).not.toBeNull();
    expect(container.querySelector('.sheet-page')).toBeNull();
  });

  test('the hub links each sheet to its own page', () => {
    const game = sheetGames[0];
    const { container } = renderAt(`/${game.id}`);
    for (const sheet of game.cheatsheets) {
      expect(container.querySelector(`a.sheet-permalink[href="/${game.id}/${sheet.id}"]`)).not.toBeNull();
    }
  });
});

describe('legacy /:game#id links', () => {
  test.each(allSheets)('/%s#%s redirects to the sheet page', (gameId, sheetId) => {
    const { container } = renderAt(`/${gameId}#${sheetId}`);
    expect(container.querySelector('.sheet-page')).not.toBeNull();
    expect(container.querySelector('.game-page')).toBeNull();
  });

  test('a link section hash stays on the hub', () => {
    const game = sheetGames.find((g) => g.resources.length);
    const { container } = renderAt(`/${game.id}#${game.resources[0].id}`);
    expect(container.querySelector('.game-page')).not.toBeNull();
    expect(container.querySelector(`#${game.resources[0].id}`)).not.toBeNull();
  });
});

test('an unknown address shows the not-found page, not a redirect', () => {
  renderAt('/nowhere/at-all');
  expect(screen.getByRole('heading', { name: /isn't here/i })).toBeInTheDocument();
});
