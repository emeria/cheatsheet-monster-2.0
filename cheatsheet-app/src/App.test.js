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
