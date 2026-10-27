import React from 'react';
import fs from 'fs';
import path from 'path';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ThemeSwitcher, { SKINS, STORAGE_KEY, applySkin, savedSkin } from './ThemeSwitcher';
import Footer from './Footer';
import Collapsible from './Collapsible';
import site from '../content/site';
import games from '../content/games';

const themeCss = fs.readFileSync(path.join(import.meta.dirname, '..', 'styles', 'theme.css'), 'utf8');

const lightOs = (light) => {
  window.matchMedia = vi.fn(() => ({ matches: light }));
};

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.skin;
  lightOs(false);
});

test('the eight skins each have a token set in theme.css', () => {
  expect(SKINS.map((s) => s.id)).toEqual(['dusk', 'midnight', 'ember', 'frost', 'light', 'parchment', 'grimoire', 'contrast']);
  // Dusk is the :root default; the others are selected by data-skin.
  for (const { id } of SKINS.filter((s) => s.id !== 'dusk')) {
    expect(themeCss).toContain(`:root[data-skin='${id}'] {`);
  }
});

test('defaults to Dusk, or Light on a light OS', () => {
  expect(savedSkin()).toBe('dusk');
  lightOs(true);
  expect(savedSkin()).toBe('light');
});

test('a saved skin beats the OS preference', () => {
  lightOs(true);
  localStorage.setItem(STORAGE_KEY, 'ember');
  expect(savedSkin()).toBe('ember');
});

test('a saved value that is not a skin is ignored', () => {
  localStorage.setItem(STORAGE_KEY, 'neon');
  expect(savedSkin()).toBe('dusk');
});

test('the old light and neutral themes carry over as Light', () => {
  localStorage.setItem('theme', 'normal');
  expect(savedSkin()).toBe('light');
  localStorage.setItem('theme', 'light');
  expect(savedSkin()).toBe('light');
  localStorage.setItem('theme', 'dark');
  lightOs(true);
  expect(savedSkin()).toBe('dusk');
});

test('picking a skin applies it and remembers it', () => {
  applySkin(savedSkin());
  render(<ThemeSwitcher />);
  expect(document.documentElement.dataset.skin).toBe('dusk');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'parchment' } });
  expect(document.documentElement.dataset.skin).toBe('parchment');
  expect(localStorage.getItem(STORAGE_KEY)).toBe('parchment');
});

test('the picker starts on the saved skin', () => {
  localStorage.setItem(STORAGE_KEY, 'frost');
  render(<ThemeSwitcher />);
  expect(screen.getByRole('combobox')).toHaveValue('frost');
});

test('the picker still works when storage is blocked', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<ThemeSwitcher />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'grimoire' } });
  expect(document.documentElement.dataset.skin).toBe('grimoire');
  setItem.mockRestore();
});

test('the footer carries the socials and support links, and no single date', () => {
  const { container } = render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
  const footer = container.querySelector('.site-footer');
  for (const { label, url } of [...site.socials, ...site.support]) {
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', url);
  }
  expect(footer).not.toHaveTextContent(/last updated/i);
});

test('a sheet shows its own updated date', () => {
  render(
    <Collapsible id="x" title="Heist" updated="Sun, Feb 18, 2024">
      body
    </Collapsible>,
  );
  expect(screen.getByText('Updated Sun, Feb 18, 2024')).toBeInTheDocument();
});

test('every cheatsheet has an updated date and no game keeps its own', () => {
  for (const game of games) {
    expect(game.lastUpdated).toBeUndefined();
    for (const sheet of game.cheatsheets) expect(sheet.updated, `${game.id}/${sheet.id}`).toBeTruthy();
  }
});
