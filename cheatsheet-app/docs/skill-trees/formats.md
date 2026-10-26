# Tree, build and layout formats

Field reference for the three files. Keys are listed in their saved order. "Default" values are
left out when saving. The full design, including features not used here yet (slots, sockets,
socketables, rule plugins), is in the `lmg-tree-kit` spec.

## Tree (`<tree-id>.tree.json`)

```json
{ "app": "lmg-tree", "v": 1, "id": "wow-classic-warrior", "name": "WoW Classic Warrior talents",
  "game": "wow-classic", "patch": "1.12.1", "source": "...",
  "pools": [], "sections": [], "nodes": [], "edges": [], "groups": [],
  "context": { "level": { "min": 10, "max": 60 } }, "ext": {} }
```

| Key | Meaning |
|---|---|
| `id`, `name` | See [Ids](README.md#ids) |
| `game`, `patch`, `source` | Where the data came from. `source` names the export and tag, or the reference used for hand-authored data |
| `pools` | Point currencies (below) |
| `sections` | Sub-trees: at least one |
| `nodes`, `edges` | The graph |
| `groups` | Choices where you pick at most N (ascendancy, masteries, rows). Left out when empty |
| `context` | What a build can set: `level` (min and max) and named `flags` (quest rewards) |
| `renames` | `{ oldId: newId }`, applied to builds from older patches |
| `ext` | Game-specific tables for adapters (see [README](README.md#game-specific-data-ext)) |

### Pools

```json
{ "id": "talent", "name": "Talent points", "budget": { "perLevelFrom": [10, 1, 60] } }
```

`budget` is `perLevelFrom: [firstLevel, perLevel, lastLevel]`, a `byLevel` table of cumulative
`[level, points]`, and/or `bonuses: [{ flag, points }]`. Use tables rather than formulas.

### Sections

```json
{ "id": "arms", "name": "Arms", "kind": "tree", "pool": "talent", "connectivity": "prereq",
  "active": "always", "tiers": { "gate": [0, 5, 10, 15, 20, 25, 30] } }
```

| Key | Default | Meaning |
|---|---|---|
| `kind` | | `tree`, `ascendancy`, `mastery`, `hero`, `skill`, `board`, `cluster` (for drawing and filters only) |
| `pool` | | The pool spent here |
| `connectivity` | | `path` (PoE: must touch an allocated node or a start), `prereq` (arrows and tier gates: WoW, D2, LE), `free` |
| `active` | `always` | Or `{ "group": id }` for a section that's active when picked (PoE ascendancies) |
| `tiers` | | `{ "gate": [...] }`: points needed in this section for each tier, so nodes don't each carry a requirement |
| `ports` | | Node ids where the section attaches to another (an ascendancy's class start) |

### Nodes

```json
{ "id": "flurry", "section": "fury", "kind": "talent", "name": "Flurry", "ranks": 5,
  "tier": 6, "col": 3, "order": 63, "tags": ["stat:haste"],
  "stats": [{ "id": "talent:flurry", "text": "After a critical strike, your next 3 swings are {0}% faster.",
              "values": [10, 15, 20, 25, 30] }] }
```

| Key | Default | Meaning |
|---|---|---|
| `kind` | `small` | `start`, `small`, `notable`, `keystone`, `talent`, `mastery`, `socket`, `attribute`… |
| `ranks` | `1` | Max rank |
| `cost` | `1` | Points per rank |
| `icon` | | The source's icon name. Kept as data; the cheat sheet draws generated glyphs instead |
| `tags` | `[]` | Namespaced (`dmg:physical`, `role:capstone`, `weapon:axe`). Used for search, highlights and totals |
| `stats` | `[]` | `{ id, text, values }`: `values` has one number per rank and fills `{0}`. A node with two effects has two stat lines; don't use `{1}` |
| `req` | | A requirement for the first rank (below) |
| `options` | | A choice made on the node: `[{ id, stats }]` (PoE masteries, PoE2 attributes). The build stores which one was taken |
| `start`, `noPath`, `granted` | `false` | A path root; can't be pathed through; free |
| `tier`, `row`, `col`, `order` | | Logical position, counting from 1. Gates and grid layouts read these. Not pixels |

### Edges

```json
{ "from": "enrage", "to": "flurry", "type": "arrow", "minRank": "max" }
```

`link` is undirected adjacency, used for `path` connectivity. `arrow` is a prerequisite:
`minRank` is a number or `"max"`. A node with several incoming arrows needs all of them.

### Requirements

JSON only, never code: `{ "level": n }`, `{ "rank": id, "gte": n }`,
`{ "spent": { "section" | "pool" | "tag": x }, "gte": n }`, `{ "group": id, "picked": option }`,
`{ "flag": name }`, combined with `all`, `any` and `not`.

### Groups

```json
{ "id": "mastery-64128", "pick": { "max": 1 }, "unique": true, "members": { "options": "64128" } }
```

`members` is `sections`, `nodes` or `options` (a node id). `unique` stops the same option being
picked twice across the tree.

## Build (`<name>.build.json`)

```json
{ "app": "lmg-tree-build", "v": 1, "tree": "poe1-3.29.1", "name": "Boneshatter",
  "context": { "level": 92 }, "start": "47175", "picks": { "ascendancy": "juggernaut" },
  "ranks": { "23471": 1 }, "options": { "64128": "34383" }, "steps": [{ "node": "23471", "level": 2 }] }
```

| Key | Meaning |
|---|---|
| `tree` | The tree id the build was made on |
| `context` | `level` and `flags` |
| `start` | The class start node (PoE). Start nodes are never listed in `ranks` |
| `picks` | Choices in groups: `ascendancy`, `bloodline` |
| `ranks` | **The final state**, which is what validation checks: `{ nodeId: rank }` |
| `options` | `{ nodeId: optionId }` for nodes with `options` |
| `paidFrom` | PoE2 weapon-set points: `{ nodeId: "ws1" }` |
| `steps` | An optional ordered plan for leveling guides. Checked as warnings only |
| `ext.<game>` | Data the tree can't place yet, such as PoE cluster jewel nodes |

## Layout (`<tree-id>.<skin>.layout.json`)

```json
{ "app": "lmg-tree-layout", "v": 1, "tree": "wow-classic-warrior", "skin": "default",
  "space": { "w": 864, "h": 464, "unit": "px" },
  "sections": { "arms": { "mode": "grid", "origin": [48, 48], "cell": [56, 56], "rotate": 0 } } }
```

Each section has one placement mode, and the kit turns all of them into absolute positions:

| Mode | Used for | Section keys | Node entries (`nodes`) |
|---|---|---|---|
| `grid` | WoW (and later D2, LE, TinkerTame) | `origin`, `cell`, `rotate` | none: position comes from the node's `tier` and `col` |
| `polar` | PoE1 | `origin`, `polar: { radii, slots, groups }` | `{ group, orbit, slot }` |
| `absolute` | PoE2, uploaded art | `origin` | `{ at: [x, y] }`, and `manual: true` for hand fixes |

`edges` is keyed `"from>to"`: `{ "hidden": true }` for links the game doesn't draw (PoE mastery
links), or a `path` (`straight`, `arc`, `poly`, `curve`). `theme` and `atlas` hold art skins.
