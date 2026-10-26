import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import games from './content/games';

const assetsDir = path.join(__dirname, '..', 'public', 'assets');

// Serve CSVs straight from public/assets so pages render with their real data.
beforeEach(() => {
  global.fetch = jest.fn((url) => {
    const file = path.join(assetsDir, url.split('/assets/')[1]);
    const ok = fs.existsSync(file);
    return Promise.resolve({ ok, status: ok ? 200 : 404, text: () => Promise.resolve(ok ? fs.readFileSync(file, 'utf8') : '') });
  });
  window.scrollTo = jest.fn();
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
