# Cheatsheet Monster 2.0

React rewrite of [cheatsheet.monster](https://cheatsheet.monster) (the original static site lives in the `cheatsheet_monster` repo).

```
npm start     # dev server at http://localhost:3000/cheatsheet-monster-2.0
npm test      # content + widget tests
npm run build # production build in build/
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

Paths in content files are relative to `public/assets`, e.g. `'poe/pics/heist.jpg'`.

If you keep updating the original site, `npm run sync` copies its new or changed images and CSVs here.

### Section shapes

Each game file has `cheatsheets` (the main list, shown in the cheat sheet nav) and `resources` (link sections, shown in the top nav). Every section has an `id` (used for `#links`) and a `title`, plus optional `open: true`, `navLabel`, `intro` and `accent` (coloured header band, defined in `src/styles/app.css`). The body is one of:

```js
// An image cheat sheet. Two or more images show as tabs, labelled with `label`.
{ id: 'heist', title: 'Heist', accent: 'heist', open: true,
  images: [{ src: 'poe/pics/heist.jpg', source: 'https://reddit.com/...' }] }

// Link lists. An item is: text <label as link> — note (extra | extra). All fields optional.
{ id: 'MiscLinks', title: 'Misc. Links',
  links: [{ heading: 'Wiki', ordered: false, intro: '...',
            items: [{ label: 'PoE Wiki', url: 'https://...', note: 'The updated wiki' }] }] }

// Nested sections.
{ id: 'monolith', title: 'Monolith', children: [ /* sections */ ] }

// An interactive table or calculator from src/widgets (see src/widgets/index.js).
{ id: 'rewards', title: 'Campaign Rewards', widget: 'poe2Rewards', props: { csv: 'poe2/data/rewards.csv' } }
```

Widgets: `leveling` (chapter/act maps + step tables, TLDR, campaign skip), `blessings`, `dungeons` (daily rotation; tune `cycle`/`start` in `lastepoch.js`), `supporterPacks`, `poe2Rewards`, `aldorScryer`, `cenarion`.

## Deploying

Pushing to `main` runs `.github/workflows/static.yml`, which tests, builds and deploys to GitHub Pages. For that to be what the site serves, set **Settings → Pages → Source** to **GitHub Actions**. Until then the site is served from the `gh-pages` branch, which `npm run deploy` updates.

Deep links like `/cheatsheet-monster-2.0/poe#heist` work through `public/404.html`, which hands the path back to the app.
