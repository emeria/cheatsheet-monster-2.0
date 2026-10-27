import fs from 'fs';
import path from 'path';
import { MASCOT_FRAME } from './Mascot';
import { HEADER_MASCOT_SCALE } from './Header';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/assets/mascot/manifest.json'), 'utf8'));

test('the vendored manifest frame matches the mascot constant', () => {
  expect(manifest.frame).toEqual(MASCOT_FRAME);
});

test('the header canvas is the manifest frame at a whole-number scale', () => {
  const { container } = render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
  const canvas = container.querySelector('.site-header canvas');
  expect(Number.isInteger(HEADER_MASCOT_SCALE)).toBe(true);
  expect(canvas.width).toBe(manifest.frame.width * HEADER_MASCOT_SCALE);
  expect(canvas.height).toBe(manifest.frame.height * HEADER_MASCOT_SCALE);
});

test('every animation the site uses exists in the manifest', () => {
  for (const name of ['idle', 'wave', 'sit', 'hurt', 'cast', 'walk']) expect(manifest.animations[name]).toBeDefined();
});
