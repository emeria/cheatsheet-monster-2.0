// Path of Exile 2 page. See README "Updating content" for the section shapes.

const craftingSource = {
  source: 'https://www.reddit.com/r/pathofexile/comments/1h3vi5f/i_made_a_cheat_sheet_for_crafting_in_poe2/',
  sourceLabel: 'source (Idora Alphy)',
};

const poe2 = {
  id: 'poe2',
  name: 'Path of Exile 2',
  publisher: 'Grinding Gear Games',
  shortName: 'PoE 2',
  tile: 'home/poe2-card.webp',
  lastUpdated: 'Sun, Feb 18, 2024',
  feedbackUrl:
    'https://www.reddit.com/r/pathofexile/comments/sjx6wi/poe_cheat_sheet_collection_of_links_and_cheat/',

  cheatsheets: [
    {
      id: 'leveling',
      title: 'Leveling',
      open: true,
      intro: 'Twink Builds',
      links: [
        {
          heading: 'Widowhail',
          intro: 'Style: Ranged, Quiver-based',
          items: [
            { text: 'Video Guides -', label: 'Widowhail', url: 'https://www.youtube.com/watch?v=3nUO0dTOJ4k' },
            { text: 'Written Guide - See video for all' },
            { text: 'Classes: All' },
            { text: 'Guide Creator: DS Lily' },
          ],
        },
        {
          heading: 'Caged Pillar of the Gods',
          intro: 'Style: Melee, Ranged, Stat-stacker',
          items: [
            {
              text: 'Video Guides -',
              label: 'Caged Pillar of the Gods',
              url: 'https://www.youtube.com/watch?v=WnB00nkLJKY',
            },
            {
              text: 'Written Guide -',
              label: 'Mobalytics',
              url: 'https://mobalytics.gg/poe-2/profile/e9dd5679-c1ba-4252-bc00-cce31336b937/builds/bd2cca9e-1032-4fab-b845-13aff2352467?widgets-state=eyJmN2Q4MjEwMi03ZTc3LTRhNDQtYWQyNC0zM2I2N2U4YWU3YmYiOnsiZmlsdGVycyI6eyJhY3RpdmVWYXJpYW50SWQiOiIyN2Q2MGRlYS1kN2E4LTQzNTUtODhkMy01Y2ZlZWM5NjNmZmYifSwidHlwZW5hbWUiOiJOZ2ZEb2N1bWVudENtV2lkZ2V0Q29udGVudFZhcmlhbnRzVjEifX0',
            },
            { text: 'Classes: All' },
            { text: 'Guide Creator: Lazy Exile' },
          ],
        },
      ],
    },
    {
      id: 'rewards',
      title: 'Campaign Rewards',
      open: true,
      widget: 'poe2Rewards',
      props: { csv: 'poe2/data/rewards.csv' },
    },
    {
      id: 'crafting-options',
      title: 'Crafting',
      open: true,
      images: [{ src: 'poe2/pics/crafting-mechanics-v.2.webp', alt: 'Crafting Options', ...craftingSource }],
    },
    {
      id: 'crafting-endgame',
      title: 'Endgame Crafting',
      open: true,
      images: [{ src: 'poe2/pics/end-game-crafting-v.2.webp', alt: 'Endgame Crafting Options', ...craftingSource }],
    },
    {
      id: 'item-anatomy',
      title: 'Item Anatomy',
      open: true,
      images: [{ src: 'poe2/pics/item-anatomy-v.2.webp', alt: 'Item Anatomy', ...craftingSource }],
    },
  ],

  // Trees and calculators: their own page at /poe2/tools.
  tools: [
    {
      id: 'passive-tree',
      title: 'Passive Tree',
      open: true,
      widget: 'talentTree',
      props: { tree: 'poe2', importer: 'poe' },
    },
  ],

  resources: [
    {
      id: 'currentLeague',
      title: 'Early Access Links',
      open: true,
      links: [
        {
          heading: 'Ascendancies',
          items: [
            {
              label: 'PoE 2 Ascendencies',
              url: 'https://www.pathofexile.com/forum/view-thread/3592012',
              note: 'Official Early Access Classes',
            },
          ],
        },
        {
          heading: 'Skills & Passive Tree',
          items: [
            { label: 'PoE 2 Skills', url: 'https://poe2skills.com/', note: 'Skills info and calc' },
            {
              label: 'PoE 2 Passive Tree',
              url: 'https://poe-2-skill-tree-planner.vercel.app/',
              note: 'Temporary Passive Tree Planner',
            },
          ],
        },
        {
          heading: 'Get Access',
          items: [
            {
              label: 'Path Of Exile 2 Packs',
              url: 'https://pathofexile2.com/buy-packs',
              note: 'Purchase keys starting at $30',
            },
            {
              label: 'PoE 2 FAQ',
              url: 'https://www.pathofexile.com/forum/view-thread/3587981',
              note: 'Frequently Asked Questions',
            },
            {
              label: 'PoE 2 Twitch Drops',
              url: 'https://www.pathofexile.com/forum/view-thread/3591907',
              note: 'twitch drop info',
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
            { label: 'PoE 2 Wiki', url: 'https://www.poe2wiki.net/wiki/Path_of_Exile_2_Wiki', note: 'The updated wiki' },
          ],
        },
        {
          heading: 'Data Resources',
          items: [
            {
              text: 'Beware of the PoEBuilds.net company!',
              label: 'PoE 2 Builds Net Warning page',
              url: 'https://poe2builds.net/',
            },
            {
              label: 'PoE 2 Db',
              url: 'https://poe2db.tw/us/',
              note: 'Database of mechanics, enemies, skills, items, modifiers, etc.',
            },
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
              label: 'PoE 1 Lore',
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
          heading: 'Official Sites',
          items: [
            { label: 'Path Of Exile Forums', url: 'https://www.pathofexile.com/forum', note: 'Official Forums' },
            { label: 'Path Of Exile Trade', url: 'https://www.pathofexile.com/trade', note: 'Official Trade site' },
          ],
        },
        {
          heading: 'Reddit',
          items: [
            { label: 'reddit/pathofexile2', url: 'https://www.reddit.com/r/pathofexile2/', note: 'Main reddit' },
            {
              label: 'reddit/pathofexile2builds',
              url: 'https://www.reddit.com/r/pathofexilebuilds',
              note: 'Builds Reddit',
            },
          ],
        },
      ],
    },
  ],
};

export default poe2;
