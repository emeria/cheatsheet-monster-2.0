// Path of Exile page. See README "Updating content" for the section shapes.

const supporterPacks = [
  {
    series: '2024 Core',
    packs: [
      { name: 'Kalguuran Runesmith', price: 60 },
      { name: 'Shackled Immortal', price: 100 },
      { name: 'Vaal Serpent-God', price: 160 },
      { name: 'Karui Elemancer', price: 240 },
      { name: 'Sandwraith Assassin', price: 480 },
    ],
  },
  {
    series: '2023 Core',
    packs: [
      { name: 'Tormentor', price: 60 },
      { name: 'Hellfire', price: 100 },
      { name: 'Bloodthirsty', price: 160 },
      { name: 'Chronomancer', price: 240 },
      { name: 'Voidborn', price: 480 },
    ],
  },
  {
    series: '2022 Core',
    packs: [
      { name: 'Imperator', price: 60 },
      { name: 'Nullifier', price: 100 },
      { name: 'Annihilator', price: 160 },
      { name: 'Ravager', price: 240 },
      { name: 'Incinerator', price: 480 },
    ],
  },
  {
    series: '2021 Core',
    packs: [
      { name: 'Delve', price: 60 },
      { name: 'Breach', price: 100 },
      { name: 'Abyss', price: 160 },
      { name: 'Harvest', price: 240 },
      { name: 'Heist', price: 480 },
    ],
  },
  {
    series: '2020 Core',
    packs: [
      { name: 'Orion', price: 60 },
      { name: 'Basilisk', price: 100 },
      { name: 'Hydra', price: 160 },
      { name: 'Phoenix', price: 240 },
      { name: 'Minotaur', price: 480 },
    ],
  },
  {
    series: '2019 Core',
    packs: [
      { name: 'Sunspire', price: 60 },
      { name: 'Doomguard', price: 100 },
      { name: 'Crucible', price: 160 },
      { name: 'Eyrie', price: 240 },
      { name: 'Council', price: 480 },
    ],
  },
  {
    series: '2018 Core',
    packs: [
      { name: 'Conquest', price: 60 },
      { name: 'Crucible', price: 100 },
      { name: 'Eyrie', price: 160 },
      { name: 'Council', price: 240 },
      { name: 'Empyrean', price: 480 },
    ],
  },
  {
    series: '2017 Core',
    packs: [
      { name: 'Orion', price: 60 },
      { name: 'Basilisk', price: 100 },
      { name: 'Hydra', price: 160 },
      { name: 'Phoenix', price: 240 },
      { name: 'Minotaur', price: 480 },
    ],
  },
  {
    series: '2016 Core',
    packs: [
      { name: 'Sunspire', price: 60 },
      { name: 'Doomguard', price: 100 },
      { name: 'Crucible', price: 160 },
      { name: 'Eyrie', price: 240 },
      { name: 'Council', price: 480 },
    ],
  },
  {
    series: '2015 Core',
    packs: [
      { name: 'Conquest', price: 60 },
      { name: 'Crucible', price: 100 },
      { name: 'Eyrie', price: 160 },
      { name: 'Council', price: 240 },
      { name: 'Empyrean', price: 480 },
    ],
  },
  {
    series: '2014 Core',
    packs: [
      { name: 'Orion', price: 60 },
      { name: 'Basilisk', price: 100 },
      { name: 'Hydra', price: 160 },
      { name: 'Phoenix', price: 240 },
      { name: 'Minotaur', price: 480 },
    ],
  },
  {
    series: '2013 Core',
    packs: [
      { name: 'Sunspire', price: 60 },
      { name: 'Doomguard', price: 100 },
      { name: 'Crucible', price: 160 },
      { name: 'Eyrie', price: 240 },
      { name: 'Council', price: 480 },
    ],
  },
  {
    series: 'Closed Beta (2012)',
    packs: [
      { name: 'Kiwi Pack', price: 10 },
      { name: 'Bronze Pack', price: 25 },
      { name: 'Silver Pack', price: 50 },
      { name: 'Gold Pack', price: 100 },
      { name: 'Diamond Pack', price: 1000 },
    ],
  },
  {
    series: 'Open Beta (2013)',
    packs: [
      { name: 'Open Beta Supporter $10', price: 10 },
      { name: 'Open Beta Supporter $25', price: 25 },
      { name: 'Open Beta Supporter $50', price: 50 },
      { name: 'Open Beta Supporter $100', price: 100 },
      { name: 'Open Beta Supporter $250', price: 250 },
      { name: 'Open Beta Supporter $1,000', price: 1000 },
    ],
  },
  {
    series: '2012',
    packs: [{ name: 'Early Access', price: 10 }],
  },
];

const acts = [
  "Lioneye's Watch",
  'The Forest Encampment',
  'The Sarn Encampment',
  'Highgate',
  "Overseer's Tower",
  "Lioneye's Watch",
  'The Bridge Encampment',
  'The Sarn Encampment',
  'Highgate',
  'Oriath Docks',
].map((title, i) => ({ title, image: `poe/pics/Waypoint_map_act_${i + 1}.jpg` }));

const poe = {
  id: 'poe',
  name: 'Path of Exile',
  publisher: 'Grinding Gear Games',
  genre: 'Action RPG',
  tile: 'home/poe-card.webp',
  feedbackUrl:
    'https://www.reddit.com/r/pathofexile/comments/sjx6wi/poe_cheat_sheet_collection_of_links_and_cheat/',

  cheatsheets: [
    {
      id: 'leveling',
      updated: 'Sun, Feb 18, 2024',
      title: 'Leveling',
      accent: 'leveling',
      widget: 'leveling',
      props: { unit: 'Act', csv: 'poe/data/leveling.csv', chapters: acts },
    },
    {
      id: 'vendor-recipe',
      updated: 'Sun, Feb 18, 2024',
      title: 'Vendor Recipes',
      accent: 'leveling',
      images: [
        {
          src: 'poe/pics/vendor-recipe-cheatsheet-v1.webp',
          source:
            'https://www.reddit.com/r/pathofexile/comments/15tomao/vendor_recipe_cheatsheet_v1_let_me_know_what_else/',
        },
      ],
    },
    {
      id: 'betrayal',
      updated: 'Sun, Feb 18, 2024',
      title: 'Betrayal',
      accent: 'betrayal',
      open: true,
      images: [
        {
          src: 'poe/pics/3.25_betrayal.png',
          alt: 'Betrayal Cheat Sheet SC Trade',
          source: 'https://pathofexile.elrincondelexiliado.com/syndicate/',
        },
      ],
    },
    {
      id: 'heist',
      updated: 'Sun, Feb 18, 2024',
      title: 'Heist',
      accent: 'heist',
      open: true,
      images: [
        {
          src: 'poe/pics/heist.webp',
          source:
            'https://www.reddit.com/r/pathofexile/comments/jgec5u/heist_cheat_sheet_final_all_in_one_edition/',
        },
      ],
    },
    {
      id: 'incursion',
      updated: 'Sun, Feb 18, 2024',
      title: 'Incursion',
      accent: 'incursion',
      open: true,
      images: [
        {
          src: 'poe/pics/incursion.webp',
          source: 'https://www.reddit.com/r/pathofexile/comments/lpas2z/help_me_update_this_cheat_sheet/',
        },
      ],
    },
    {
      id: 'tattoo',
      updated: 'Sun, Feb 18, 2024',
      title: 'Tattoos',
      accent: 'essences',
      images: [
        {
          src: 'poe/pics/tattoo324.webp',
          source: 'https://www.reddit.com/r/pathofexile/comments/1bnwxxq/list_of_tattoo_available_in_324/',
        },
      ],
    },
    {
      id: 'essences',
      updated: 'Sun, Feb 18, 2024',
      title: 'Essences',
      accent: 'essences',
      images: [
        {
          src: 'poe/pics/essences.webp',
          source:
            'https://www.reddit.com/r/pathofexile/comments/52onwd/guide_a_quick_referencevisual_guide_image_for/',
        },
      ],
    },
    {
      id: 'strongbox',
      updated: 'Sun, Feb 18, 2024',
      title: 'Strongboxes',
      accent: 'strongbox',
      images: [
        {
          src: 'poe/pics/strongbox_cheatsheet_317_v2.webp',
          alt: 'Strongbox Rolling',
          source:
            'https://www.reddit.com/r/pathofexile/comments/t0v86t/made_a_new_strongbox_cheatsheet_for_myself_maybe/',
        },
      ],
    },
    {
      id: 'flask',
      updated: 'Sun, Feb 18, 2024',
      title: 'Flasks',
      accent: 'flask',
      images: [
        {
          src: 'poe/pics/flasks_316.webp',
          source: 'https://www.reddit.com/r/pathofexile/comments/qgb89f/316_flask_cheat_sheets/',
        },
      ],
    },
    {
      id: 'kingsmarch',
      updated: 'Sun, Feb 18, 2024',
      title: 'Kingsmarch',
      images: [
        {
          src: 'poe/pics/325_kingsmarch.webp',
          source:
            'https://www.reddit.com/r/pathofexile/comments/1eshj59/kingsmarch_harbour_shipment_cheatsheet/',
        },
      ],
    },
  ],

  // Trees and calculators: their own page at /poe/tools.
  tools: [
    {
      id: 'passive-tree',
      title: 'Passive Tree',
      accent: 'leveling',
      open: true,
      widget: 'talentTree',
      props: { tree: 'poe1', importer: 'poe' },
    },
    {
      id: 'lifetime-calc',
      title: 'Path of Exile Supporter Pack Calculator',
      navLabel: 'Lifetime Spent Calc.',
      widget: 'supporterPacks',
      props: { series: supporterPacks },
    },
  ],

  resources: [
    {
      id: 'currentLeague',
      title: '3.25 Links',
      open: true,
      links: [
        {
          heading: 'Official',
          items: [
            {
              label: 'Settlers of Kalguur page',
              url: 'https://www.pathofexile.com/forum/view-thread/3531575',
              note: 'Expansion page',
            },
            {
              label: 'Content Update 3.25 Patch Notes',
              url: 'https://www.pathofexile.com/forum/view-thread/3531661',
              note: 'patch notes',
            },
            {
              label: 'Content Update 3.25 FAQ',
              url: 'https://www.pathofexile.com/forum/view-thread/3532389',
              note: 'FAQ',
            },
          ],
        },
        {
          heading: 'Atlas Passive Trees',
          items: [
            {
              label: 'Atlas Progression',
              url: 'https://poeplanner.com/a/sNL',
              note: 'Focused on atlas completion and map sustain',
            },
            {
              label: 'Early League Mapping pt.1',
              url: 'https://poeplanner.com/a/xzv',
              note: 'Buffs+Mechanics: Delve, Jun, Exped, Shrines',
            },
            {
              label: 'Early League Mapping pt.2',
              url: 'https://poeplanner.com/a/xr6',
              note: 'Buff+Mech: Delve, Jun, Exped, Shrines, Beast, Necro, Affliction Boss',
            },
            {
              label: 'Early League Option 2',
              url: 'https://poeplanner.com/a/hbL',
              note: 'Alva, Jun, Necro, Tormented, Map sustain, Affliction Boss',
            },
          ],
        },
      ],
    },
    {
      id: 'MiscLinks',
      title: 'Misc. Links',
      open: true,
      links: [
        {
          heading: 'Wiki',
          items: [
            { label: 'PoE Wiki', url: 'https://www.poewiki.net/wiki/Path_of_Exile_Wiki', note: 'The updated wiki' },
          ],
        },
        {
          heading: 'Data Resources',
          items: [
            {
              label: 'PoE Ninja',
              url: 'https://poe.ninja/',
              note: 'Economic and build overview including live updates, historical data, and confidence indicators',
            },
            {
              label: 'PoE Ninja Builds',
              url: 'https://poe.ninja/builds',
              note: 'Build portion of PoE Ninja that allows a search of the highest level players (or streamers) builds',
            },
            {
              label: 'PoE Antiquary',
              url: 'https://poe-antiquary.xyz',
              note: 'Review item prices across leagues; useful for build planning',
            },
            { label: 'PoE How', url: 'https://poe.how', note: 'Snapshots of profitibility for specific content' },
            {
              label: 'PoE Db',
              url: 'https://poedb.tw/us/',
              note: 'Database of mechanics, enemies, skills, items, modifiers, etc.',
            },
            { label: 'PoE Lab', url: 'https://poelab.com', note: 'Daily guides for the Labyrinth' },
            {
              label: 'Hideout Showcase',
              url: 'https://hideoutshowcase.com/',
              note: 'Place to share and find hideouts for import/export',
            },
            {
              label: 'PoE Vault',
              url: 'https://www.poe-vault.com/',
              note: 'Useful site of builds and mechanics explanations by Icy Veins',
            },
            {
              label: 'PathOfMatth Casual Exile',
              url: 'https://docs.google.com/spreadsheets/d/1FZxcyqqLOHsQNc0FqSBUouTZy9MRU506K_7W2un1sr8/edit?usp=sharing',
              note: "PathOfMatth's Casual Exile series googledoc with leveling guides and tips",
            },
            {
              label: 'PoE University',
              url: 'https://www.youtube.com/watch?v=RZMN1y94yDc&list=PLbpExg9_Xax1jJW32BLRX4eYYZvxxzs83',
              note: 'Zizaran teaches players about the game',
            },
            {
              label: 'Lore',
              url: 'https://www.reddit.com/r/pathofexile/comments/ov64ff/lore_compilation_update_for_315/',
              note: 'Lore Compilation thread on reddit by u/justathetan',
            },
            {
              label: 'Googledoc of Cheatsheets 3.16',
              url: 'https://docs.google.com/spreadsheets/d/1fIs8sdvgZG7iVouPdtFkbRx5kv55_xVja8l19yubyRU/edit#gid=1983365983',
              note: 'Slightly outdated cheatsheets doc',
            },
          ],
        },
        {
          heading: 'Online Utils',
          items: [
            { label: 'Filterblade.xyz', url: 'https://www.filterblade.xyz/', note: 'Item Filter generation and management' },
            { label: 'Passive Tree Planner', url: 'https://poeplanner.com/', note: 'Passive Tree Planner' },
            {
              label: 'Atlas Passive Tree Planner',
              url: 'https://poeplanner.com/atlas-tree',
              note: 'Atlas Passive Tree Planner',
            },
            {
              label: 'Looty (Chrome ext)',
              url: 'https://github.com/benjaminjackman/looty',
              note: 'Search your full stash through a better interface in Chrome',
            },
            {
              label: 'Vorici Chromatic Calculator',
              url: 'http://siveran.github.io/calc.html',
              note: 'Calculate the optimal method of coloring your gear',
            },
            {
              label: 'Craft Of Exile',
              url: 'https://www.craftofexile.com/',
              note: 'Crafting calculator, simulation, emulation, and appraisal',
            },
            { label: 'Aura Calculator', url: 'https://poe.mikelat.com/', note: 'Calculator for reservation efficiency' },
            {
              label: 'The Forbidden Trove discord',
              url: 'https://discord.gg/cffmpvNYD6',
              note: 'Trading community for all sorts of content',
            },
            {
              label: 'Better PathOfExile Trading (Chrome ext)',
              url: 'https://chrome.google.com/webstore/detail/better-pathofexile-tradin/fhlinfpmdlijegjlpgedcmglkakaghnk?hl=en-US',
              note: 'Enhances the poe trade site and provides bookmarking',
            },
            {
              label: 'Gwennen Search String Generator',
              url: 'https://xanthics.github.io/poe_gen_gwennen/',
              note: 'Search string generator for Expedition gambling',
            },
            {
              label: 'Map and Card Database with Ratings',
              url: 'https://mapsofexile.com/#/',
              note: 'Map and card ratings with regex',
            },
            {
              label: 'Crafting Recipe Tracker',
              url: 'https://teichopsia.github.io/poe_craftingrecipes/?pl=6CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACSSQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQ',
              note: 'Crafting recipe tracker',
            },
            {
              label: 'Grinding Zone Link site',
              url: 'https://grinding.zone/',
              note: 'Links to many of the items on this page and more.',
            },
            {
              label: 'Blight Oil Tool',
              url: 'https://blight.raelys.com/',
              note: 'Calculator to look up and see available oil anointments for your oils',
            },
            { label: 'Search String Generator', url: 'https://poe.re/', note: 'Generate an in-game search string quickly' },
            { label: 'Labbie', url: 'https://github.com/bnorick/labbie', note: 'Check Lab prices' },
          ],
        },
        {
          heading: 'Applications',
          items: [
            {
              label: 'Path of Building',
              url: 'https://pathofbuilding.community/',
              note: 'The Powerful build planner for PoE',
            },
            {
              label: 'Awakened PoE Trade',
              url: 'https://github.com/SnosMe/awakened-poe-trade',
              note: 'Trade Macro with lots of useful keybinds and in-game pricing',
            },
            {
              label: 'Exilence Next',
              url: 'https://github.com/viktorgullmark/exilence-next',
              note: 'Calculate your characters net worth including inventory and stash tabs',
            },
            {
              label: 'Chaos Recipe Enhancer',
              url: 'https://github.com/kosace/EnhancePoEApp',
              note: 'Helps with using the chaos recipe in your stash',
            },
          ],
        },
        {
          heading: 'Official Sites',
          items: [
            { label: 'Path Of Exile Forums', url: 'https://www.pathofexile.com/forum', note: 'Official Forums' },
            { label: 'Path Of Exile Trade', url: 'https://www.pathofexile.com/trade', note: 'Official Trade site' },
          ],
        },
        {
          heading: 'Reddit',
          items: [
            { label: 'reddit/pathofexile', url: 'https://www.reddit.com/r/pathofexile/', note: 'Main reddit' },
            {
              label: 'reddit/pathofexilebuilds',
              url: 'https://www.reddit.com/r/pathofexilebuilds',
              note: 'Builds Reddit',
            },
          ],
        },
        {
          heading: 'Podcast',
          items: [
            {
              label: 'Baeclast',
              url: 'https://www.youtube.com/watch?v=22x1OK8SVZQ&list=PLt2bSbvVk1x_q1a7LrWx-npSSpQZGyD3S',
              note: 'Tarke, Grimro, CaptainLance, Ziggydlive',
            },
            {
              label: 'Fated Connections',
              url: 'https://www.youtube.com/watch?v=6Nw6U6I1hk8&list=PLr-FFkm5XN8zEpEwBlJElKroApMfPuWjF',
              note: 'CatmasterOP',
            },
            {
              label: 'Baited Expectations',
              url: 'https://www.youtube.com/watch?v=n_tixVnFSBM&list=PLgAXQc1RgBil02S9QfgS-3uQdTr74nSWt',
              note: 'piebypie, KittenCatNoodle, Brittleknee, Velyna',
            },
          ],
        },
      ],
    },
    {
      id: 'PreviousLeagues',
      title: 'Previous Leagues',
      links: [
        {
          heading: '3.18',
          items: [
            {
              label: 'Content Update 3.18.0 Patch Notes',
              url: 'https://www.pathofexile.com/forum/view-thread/3264788',
              note: 'patch notes',
            },
            {
              label: 'Sentinel Items on PoE DB',
              url: 'https://poedb.tw/us/Sentinel_league',
              note: 'Uniques, Items, Gems, Mods',
            },
            {
              label: 'Sentinel Mechanic Walkthrough',
              url: 'https://www.youtube.com/watch?v=jgFdNQXh3cI',
              note: 'Sentinel Mechanics (Grimro)',
            },
            {
              label: 'Sentinel Baeclast w/ Chris Wilson',
              url: 'https://www.twitch.tv/tarkecat',
              note: 'May 9, 2022 @ 2:30pm PDT',
            },
          ],
        },
        {
          heading: '3.17',
          items: [
            {
              label: 'Content Update 3.17.0 Patch Notes',
              url: 'https://www.pathofexile.com/forum/view-thread/3229187',
              note: 'patch notes',
            },
            {
              label: 'Early League Map Prog',
              url: 'https://bit.ly/3on8bZr',
              note: "Grimro's initial Atlas tree for Map Progression and base map juice",
              extras: [{ label: 'video', url: 'https://www.youtube.com/watch?v=dIVZOU0-Oco' }],
            },
            {
              label: "Grimro's ATLAS MIN MAXING",
              url: 'https://docs.google.com/spreadsheets/d/19GfTxIvecLvsrqISvXTGR7srvha5Im4v0DA9a9dso44/htmlview?usp=sharing&pru=AAABfuW3NKw*ESSdxIQAISkF4xc9jwyw_w',
              note: 'Builds and tips',
              extras: [{ label: 'video', url: 'https://www.youtube.com/watch?v=tXepB97CcXs' }],
            },
            {
              label: 'Archnemesis Items on PoE DB',
              url: 'https://poedb.tw/us/Archnemesis_league',
              note: 'Uniques, Items, Gems, Mods',
            },
            {
              label: 'Archnemesis Combinations',
              url: 'https://craniumviolence.github.io/',
              note: 'Recipes for the Archnemesis Mechanic',
            },
            {
              label: 'Archnemesis Reward Calculator',
              url: 'https://www.reddit.com/r/pathofexile/comments/sokaoj/my_take_on_archnemesis_cheat_sheet_a_reward/',
              note: 'Calculate what is required to receive a desired reward',
            },
          ],
        },
      ],
    },
  ],
};

export default poe;
