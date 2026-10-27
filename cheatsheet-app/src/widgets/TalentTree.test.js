import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TalentTree, { loadTree } from './TalentTree';
import { encodeTreeUrl } from '../lib/poeTreeUrl';
import { encodeBuild } from '../lib/buildCode';
import GameContext from '../components/GameContext';
import versions from '../data/trees/versions.json';

// jsdom has no canvas, so these cover everything but the drawing (the kit tests that).
test('loads the latest PoE1 tree, picks a class and says when it cannot draw', async () => {
  render(<TalentTree tree="poe1" importer="poe" />);
  expect(await screen.findByText("This browser can't draw the tree.", {}, { timeout: 8000 })).toBeInTheDocument();
  const tree = await loadTree(versions.games.poe1.latest);
  expect(screen.getByLabelText(/Class/)).toHaveValue(tree.ext.poe1.classes[0].start);
  expect(screen.getByText(/Passive skill points: 0 \/ 123/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Class/), { target: { value: tree.ext.poe1.classes[4].start } });
  expect(screen.getByLabelText(/Ascendancy/)).toHaveTextContent('Slayer');
});

test('imports a tree link and shows its points and warnings', async () => {
  const tree = await loadTree(versions.games.poe1.latest);
  const duelist = tree.ext.poe1.classes.find((c) => c.name === 'Duelist');
  const next = tree.edges.filter((e) => e.from === duelist.start || e.to === duelist.start).map((e) => (e.from === duelist.start ? e.to : e.from));
  const url = encodeTreeUrl({ start: duelist.start, picks: { ascendancy: 'slayer' }, ranks: { [next[0]]: 1, 99: 1 } }, tree, { prefix: 'https://www.pathofexile.com/passive-skill-tree/3.10.0/' });

  render(<TalentTree tree="poe1" importer="poe" />);
  await screen.findByText(/Passive skill points/, {}, { timeout: 8000 });
  fireEvent.change(screen.getByPlaceholderText(/Tree link, PoB code/), { target: { value: url } });
  fireEvent.click(screen.getByRole('button', { name: 'Import' }));

  await waitFor(() => expect(screen.getByText(/Passive skill points: 1 \/ 123/)).toBeInTheDocument());
  expect(screen.getByLabelText(/Class/)).toHaveValue(duelist.start);
  expect(screen.getByLabelText(/Ascendancy/)).toHaveValue('slayer');
  expect(screen.getByText(/No poe1 3.10.0 tree is imported/)).toBeInTheDocument();
  expect(screen.getByText(/Dropped unknown node ids: 99/)).toBeInTheDocument();
});

test('shows an import error instead of failing', async () => {
  render(<TalentTree tree="poe2" importer="poe" />);
  await screen.findByText(/Passive skill points/, {}, { timeout: 8000 });
  fireEvent.change(screen.getByPlaceholderText(/Tree link, PoB code/), { target: { value: 'https://example.com/x' } });
  fireEvent.click(screen.getByRole('button', { name: 'Import' }));
  expect(await screen.findByRole('alert')).toHaveTextContent("isn't one this tool reads");
});

test('read-only opens the build in ?b= and hides every editing control', async () => {
  const tree = await loadTree(versions.games.poe1.latest);
  const duelist = tree.ext.poe1.classes.find((c) => c.name === 'Duelist');
  const next = tree.edges.find((e) => e.from === duelist.start || e.to === duelist.start);
  const node = next.from === duelist.start ? next.to : next.from;
  window.history.pushState({}, '', `/?b=${encodeBuild({ tree: tree.id, start: duelist.start, picks: { ascendancy: 'slayer' }, ranks: { [node]: 1 } })}`);
  try {
    render(<TalentTree tree="poe1" importer="poe" readOnly />);
    expect(await screen.findByText(/Passive skill points: 1 \/ 123/, {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText('Duelist · Slayer')).toBeInTheDocument();
    for (const name of ['Import', 'Reset', 'Copy tree link', 'Copy embed code']) expect(screen.queryByRole('button', { name })).toBeNull();
    expect(screen.queryByLabelText(/Class/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Fit' })).toBeInTheDocument();
  } finally {
    window.history.pushState({}, '', '/');
  }
});

test('on a game page the tree offers share and embed links', async () => {
  render(
    <GameContext.Provider value="wow">
      <TalentTree tree="wow-classic-warrior" sectionId="warrior-talents" />
    </GameContext.Provider>
  );
  await screen.findByText(/0 \//, {}, { timeout: 8000 });
  expect(screen.getByRole('button', { name: 'Copy share link' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy embed code' })).toBeInTheDocument();
});

test('a hand-authored tree loads by id, with no import box or class picker', async () => {
  render(<TalentTree tree="wow-classic-warrior" />);
  expect(await screen.findByText(/0 \//, {}, { timeout: 8000 })).toBeInTheDocument();
  expect(screen.queryByText('Import a build')).toBeNull();
  expect(screen.queryByLabelText(/Class/)).toBeNull();
});
