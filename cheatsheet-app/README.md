# Cheatsheet Monster 2.0

React rewrite of [cheatsheet.monster](https://cheatsheet.monster) (the original static site lives in the `cheatsheet_monster` repo). Built with Vite and tested with Vitest; needs Node 22.12 or newer.

```
npm start          # dev server at http://localhost:3000/cheatsheet-monster-2.0/
npm test           # content + widget tests (npm run test:watch to keep them running)
npm run test:e2e   # browser smoke test: the talent trees draw (needs npx playwright install chromium once)
npm run build      # production build in build/
npm run preview    # serve build/ locally
npm run sync  # pull images and CSVs from ../../cheatsheet_monster
```

## Updating content

Everything you normally edit is data, not page code:

| To change | Edit |
| --- | --- |
| Header, footer, social links | `src/content/site.js` |
| A game's cheat sheets and links | `src/content/<game>.js` (`poe`, `poe2`, `lastepoch`, `wow`) |
| Images | drop them in `public/assets/<game>/pics/` |
| Table data (leveling, blessings, dungeons, PoE 2 rewards) | the CSV in `public/assets/<game>/data/` — no script to run, the page reads it directly |
| Add a game | new file in `src/content/`, add it to `src/content/games.js` |

Paths in content files are relative to `public/assets`, e.g. `'poe/pics/heist.webp'`.

If you keep updating the original site, `npm run sync` copies its new or changed images and CSVs here.

### Section shapes

Each game file has `cheatsheets` (the main list, shown in the cheat sheet nav), `resources` (link sections, shown in the top nav) and optionally `tools` (trees and calculators, on their own page at `/<game>/tools`, so tree data loads only there). Every section has an `id` (used for `#links`) and a `title`, plus optional `open: true`, `navLabel`, `intro` and `accent` (coloured header band, defined in `src/styles/app.css`). The body is one of:

```js
// An image cheat sheet. Two or more images show as tabs, labelled with `label`.
{ id: 'heist', title: 'Heist', accent: 'heist', open: true,
  images: [{ src: 'poe/pics/heist.webp', source: 'https://reddit.com/...' }] }

// Link lists. An item is: text <label as link> — note (extra | extra). All fields optional.
{ id: 'MiscLinks', title: 'Misc. Links',
  links: [{ heading: 'Wiki', ordered: false, intro: '...',
            items: [{ label: 'PoE Wiki', url: 'https://...', note: 'The updated wiki' }] }] }

// Nested sections.
{ id: 'monolith', title: 'Monolith', children: [ /* sections */ ] }

// An interactive table or calculator from src/widgets (see src/widgets/index.js).
{ id: 'rewards', title: 'Campaign Rewards', widget: 'poe2Rewards', props: { csv: 'poe2/data/rewards.csv' } }
```

Widgets: `leveling` (chapter/act maps + step tables, TLDR, campaign skip), `blessings`, `dungeons` (daily rotation; tune `cycle`/`start` in `lastepoch.js`), `supporterPacks`, `poe2Rewards`, `aldorScryer`, `cenarion`, `talentTree` (put it in `tools`).

## Skill trees

Talent and passive tree data lives in `src/data/trees/`. How it's stored, and how to add a tree, is
in [docs/skill-trees](docs/skill-trees/README.md).
The renderer is a vendored copy of lmg-tree-kit, refreshed with `npm run sync:tree-kit`. After a sync, run
`npm run test:e2e`: it opens the wow, poe and poe2 tools pages and tree embeds in Chromium and checks each tree still draws.

Sharing and embedding: a tree's **Copy share link** gives `/<game>/tools?b=<code>`, and **Copy embed code**
gives an iframe of `/<game>/embed/<section id>?b=<code>`: the same build, read-only (pan, zoom, search),
with no site header and with the publisher note. The code is the site's own (`src/lib/buildCode.js`), so it
works for every tree; PoE tree links and PoB codes still go through the import box.

## Deploying

Pushing to `main` runs `.github/workflows/static.yml`, which tests, builds and deploys to GitHub Pages. For that to be what the site serves, set **Settings → Pages → Source** to **GitHub Actions**. Until then the site is served from the `gh-pages` branch, which `npm run deploy` updates.

Deep links like `/cheatsheet-monster-2.0/poe#heist` work through `public/404.html`, which hands the path back to the app.
