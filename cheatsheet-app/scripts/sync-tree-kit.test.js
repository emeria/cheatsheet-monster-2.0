import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';

const { sync } = createRequire(import.meta.url)('./sync-tree-kit.js');

// A throwaway kit repo with one tagged release, then an untagged change on top.
let kit;
let out;
beforeAll(() => {
  kit = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-'));
  out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-')), 'lmg-tree-kit');
  const git = (...args) => execFileSync('git', ['-C', kit, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args]);
  git('init', '-q');
  fs.mkdirSync(path.join(kit, 'src', 'sub'), { recursive: true });
  fs.writeFileSync(path.join(kit, 'src', 'tree-core.js'), 'export const v = 1;\n');
  fs.writeFileSync(path.join(kit, 'src', 'sub', 'glyphs.js'), 'export const g = 1;\n');
  fs.writeFileSync(path.join(kit, 'README.md'), 'not vendored\n');
  git('add', '.');
  git('commit', '-q', '-m', 'one');
  git('tag', 'v0.1.0');
  fs.writeFileSync(path.join(kit, 'src', 'tree-core.js'), 'export const v = 2;\n');
  git('commit', '-q', '-am', 'two');
  // An uncommitted edit, which must never be vendored.
  fs.writeFileSync(path.join(kit, 'src', 'tree-core.js'), 'export const v = 3;\n');
});
afterAll(() => {
  fs.rmSync(kit, { recursive: true, force: true });
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
});

test('vendors src/ at a tag, from git, with a VERSION.txt', () => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'stale.js'), 'old\n');
  const { files } = sync(kit, 'v0.1.0', { out });
  expect(files.sort()).toEqual(['sub/glyphs.js', 'tree-core.js']);
  expect(fs.readFileSync(path.join(out, 'tree-core.js'), 'utf8')).toBe('export const v = 1;\n');
  expect(fs.existsSync(path.join(out, 'stale.js'))).toBe(false);
  expect(fs.readFileSync(path.join(out, 'VERSION.txt'), 'utf8')).toMatch(/^lmg-tree-kit v0\.1\.0\ncommit [0-9a-f]{40}\n/);
});

test('refuses an untagged ref unless asked, and never reads the working tree', () => {
  expect(() => sync(kit, 'HEAD', { out })).toThrow("isn't a tag");
  sync(kit, 'HEAD', { out, untagged: true });
  expect(fs.readFileSync(path.join(out, 'tree-core.js'), 'utf8')).toBe('export const v = 2;\n');
  expect(() => sync(path.join(kit, 'nope'), 'v0.1.0', { out })).toThrow('No lmg-tree-kit checkout');
});
