// Last Epoch page. See README "Updating content" for the section shapes.

const chapters = [
  ['The Keepers', ['Fire', 'Physical']],
  ['The Ruined Future', ['Void', 'Physical']],
  ['Seeking the Last Shard', ['Void', 'Physical']],
  ['The Outcasts and the Empire', ['Physical', 'Lightning', 'Necrotic']],
  ['Aid from an Oracle', ['Physical', 'Fire', 'Necrotic']],
  ['Infiltrating the Immortal Citadel', ['Physical', 'Fire', 'Necrotic', 'Poison']],
  ['The Might of Gods', ['Physical', 'Fire', 'Cold']],
  ["Lagon's Blessing", ['Fire', 'Physical', 'Lightning', 'Cold']],
  ['Sands of Majasa', ['Poison', 'Fire', 'Lightning', 'Physical']],
].map(([title, resistances], i) => ({
  title,
  resistances,
  image: `lastepoch/pics/LastEpochLvlingCheatsheetChapter${i + 1}.png`,
}));

// Each tier rotates through its rows in dungeon_schedule.csv, one row per day, starting
// at `start` (row 1). Change `start` to re-align a tier when the in-game rotation drifts.
const dungeons = [
  {
    name: 'Temporal Sanctum',
    tiers: {
      1: { cycle: 1, start: '2024-02-20' },
      2: { cycle: 11, start: '2024-02-20' },
      3: { cycle: 11, start: '2024-02-17' },
      4: { cycle: 16, start: '2024-02-22' },
    },
  },
  {
    name: 'Soulfire Bastion',
    tiers: {
      1: { cycle: 1, start: '2024-02-20' },
      2: { cycle: 13, start: '2024-02-16' },
      3: { cycle: 13, start: '2024-02-19' },
      4: { cycle: 13, start: '2024-02-18' },
    },
  },
  {
    name: 'Lightless Arbor',
    tiers: {
      1: { cycle: 1, start: '2024-02-20' },
      2: { cycle: 9, start: '2024-02-18' },
      3: { cycle: 9, start: '2024-02-24' },
      4: { cycle: 9, start: '2024-02-20' },
    },
  },
];

const streamers = [
  ['PerrythePig', 'https://www.youtube.com/@PerrythePig/playlists', 'https://www.twitch.tv/perrythepig'],
  ['Boardman21', 'https://www.youtube.com/@Boardman21', 'https://www.twitch.tv/boardman21'],
  ['Vision GL', 'https://www.youtube.com/@Vision_GL/playlists', 'https://www.twitch.tv/visiongl'],
  ['Terek', 'https://www.youtube.com/@Terek_LE', 'https://www.twitch.tv/ter3k'],
  ['The Curse', 'https://www.youtube.com/@TheCurseBG/playlists', 'https://www.twitch.tv/thecursebg'],
  ['Lizard IRL', 'https://www.youtube.com/@lizardirl', 'https://www.twitch.tv/lizard_irl'],
  ['Mcfluffin', 'https://www.youtube.com/@McFluffinGaming/playlists', 'https://www.twitch.tv/lonestar_mcfluffin'],
  ['Volca', 'https://www.youtube.com/@volcavids', 'https://www.twitch.tv/volca_'],
  ['Binashole', 'https://www.youtube.com/@Binashole/playlists', 'https://www.twitch.tv/binaqc'],
  ['dr3adful__', 'https://www.youtube.com/@Dr3adful/playlists', 'https://www.twitch.tv/dr3adful__'],
  ['Action RPG', 'https://www.youtube.com/@ActionRPG', 'https://www.twitch.tv/aaronactionrpg'],
  ['ZiggyDLive', 'https://www.youtube.com/@ziggydlive', 'https://www.twitch.tv/ziggydlive'],
  ['Zizaran', 'https://www.youtube.com/@Zizaran', 'https://www.twitch.tv/zizaran'],
  ['DatModz', 'https://www.youtube.com/@DatModz', 'https://www.twitch.tv/datmodz'],
  ['Raxxanterax', 'https://www.youtube.com/@Raxxanterax/playlists', 'https://www.twitch.tv/raxxanterax'],
  ['DarthMicrotransaction', 'https://www.youtube.com/c/darthmicrotransaction', 'https://www.twitch.tv/darthmicrotransaction'],
  ['Wudijo', 'https://www.youtube.com/c/wudijo', 'https://www.twitch.tv/wudijo'],
].map(([text, youtube, twitch]) => ({
  text,
  extras: [
    { label: 'Youtube', url: youtube },
    { label: 'Twitch', url: twitch },
  ],
}));

const lastepoch = {
  id: 'lastepoch',
  name: 'Last Epoch',
  tile: 'home/last-epoch-placeholder.png',
  lastUpdated: 'Sun, Feb 18, 2024',
  feedbackUrl:
    'https://www.reddit.com/r/LastEpoch/comments/1aug5ov/cheatsheet_monster_last_epoch_cheatsheet_of_sheets/',
  thanks: 'All of the developers of the various tools and sites that are included',

  cheatsheets: [
    {
      id: 'leveling',
      title: 'Leveling',
      accent: 'leveling',
      open: true,
      widget: 'leveling',
      props: {
        unit: 'Chapter',
        csv: 'lastepoch/data/leveling.csv',
        iconDir: 'lastepoch/pics',
        legend: 'lastepoch/pics/LastEpochLvlingCheatsheetLegend.png',
        tldr: true,
        skipCsv: 'lastepoch/data/campaign-skip.csv',
        chapters,
        credit: 'Thanks to Terek_LE and Zaerick for the route(s) & LastEpochTools for various tidbits',
      },
    },
    {
      id: 'monolith',
      title: 'Monolith',
      accent: 'monolith',
      children: [
        {
          id: 'monolithItems',
          title: 'Monolith Items',
          open: true,
          images: [{ src: 'lastepoch/pics/Monolith-items.png' }],
        },
        {
          id: 'blessings',
          title: 'Monolith Blessings',
          images: [{ src: 'lastepoch/pics/Monolith-blessings.png' }],
        },
        {
          id: 'blessings-table',
          title: 'Monolith Blessings Table',
          widget: 'blessings',
          props: { csv: 'lastepoch/data/le_blessings.csv' },
        },
      ],
    },
    {
      id: 'dungeons',
      title: 'Dungeon (updated daily)',
      navLabel: 'Dungeons',
      accent: 'dungeons',
      widget: 'dungeons',
      props: { csv: 'lastepoch/data/dungeon_schedule.csv', dungeons },
    },
    {
      id: 'exiledMages',
      title: 'Exiled Mages',
      accent: 'exiledmages',
      images: [{ src: 'lastepoch/pics/exiled-mage-drops.png', alt: 'Exiled Mages Drops' }],
    },
    {
      id: 'factions',
      title: 'Factions',
      accent: 'factions',
      images: [{ src: 'lastepoch/pics/circle-of-fortune-cheatsheet.png', alt: 'Circle of Fortune' }],
    },
  ],

  resources: [
    {
      id: 'currentCycle',
      title: '1.2 Links',
      open: true,
      links: [
        {
          heading: 'Official',
          items: [
            { label: 'Tomb of the Erased page', url: 'https://lastepoch.com/tombs-of-erased' },
            {
              label: 'Tomb of the Erased information',
              url: 'https://forum.lastepoch.com/t/48-hours-till-go-live/75386',
              note: 'Launch Info, Times, Drops, etc',
            },
            {
              label: '1.2 Patch Notes',
              url: 'https://forum.lastepoch.com/t/last-epoch-tombs-of-the-erased-patch-notes/75247/38',
              note: '1.2 patch notes',
            },
          ],
        },
        {
          heading: 'Community',
          items: [
            {
              label: 'Faction Picking Guide',
              url: 'https://www.youtube.com/watch?v=UE6HwJNv5jM',
              note: 'Mattjestic compares the factions (leans towards Circle of Fortune)',
            },
            {
              label: 'Speedrun Tips',
              url: 'https://www.youtube.com/watch?v=EuRGV1RpUuY',
              note: 'Ziz and Terek talk about speedrunning and the route used here',
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
          heading: 'Data Resources',
          items: [
            {
              label: 'LastEpochTools',
              url: 'https://www.lastepochtools.com/',
              note: 'Details about Affixes, Items, Skills, Classes, Build Planner, and Build collections for deep dives',
            },
            { label: 'Last Epoch Tunklab', url: 'https://lastepoch.tunklab.com/', note: 'Another LE DB' },
            {
              label: 'Zeckar Damage Calculator',
              url: 'https://docs.google.com/spreadsheets/d/1QJ99y2rduTlkAMW-1_yIzDBf1tRTnCszFxA7SoiHgSk/edit#gid=399307011',
              note: 'Damage Calculation Spreadsheet',
              extras: [{ label: 'Guide', url: 'https://www.youtube.com/watch?v=6CMkNFlZjvQ' }],
            },
            {
              label: 'Passives Checklist',
              url: 'https://www.lastepochtools.com/checklist/quests/passives',
              note: 'Chapters, Quests, and Monolith Checklist',
            },
            { label: 'Maxroll', url: 'https://maxroll.gg/last-epoch', note: 'Guides and Mechanic Information' },
          ],
        },
        {
          heading: 'Making your own builds',
          intro: 'The Curse on YouTube has a great series for this.',
          ordered: true,
          items: [
            { label: 'Damage Optimization', url: 'https://www.youtube.com/watch?v=ewwK5TQ6GNA' },
            { label: 'Defensive Layers', url: 'https://www.youtube.com/watch?v=EXwE614uIj0' },
            { label: 'BIS Affixes/Blessings', url: 'https://www.youtube.com/watch?v=Ib1DF068BgA' },
            { label: 'Bonus: Loot filter Creation', url: 'https://www.youtube.com/watch?v=4Nx2Pwuxkc4' },
          ],
        },
        {
          heading: 'Official Sites',
          items: [
            { label: 'Last Epoch', url: 'https://lastepoch.com/', note: 'Official Site' },
            { label: 'Last Epoch Forums', url: 'https://forum.lastepoch.com/', note: 'Official Forums' },
            {
              label: 'Last Epoch Patch Notes',
              url: 'https://forum.lastepoch.com/c/patch-notes/39',
              note: 'Official Patch Notes',
            },
            { label: 'Last Epoch Ladder', url: 'https://lastepoch.com/ladder', note: 'Official Ladder' },
            { label: 'Last Epoch Twitch', url: 'https://www.twitch.tv/lastepochgame', note: 'Official Twitch' },
            { label: 'Last Epoch YouTube', url: 'https://www.youtube.com/@LastEpochGame', note: 'Official YouTube' },
          ],
        },
        {
          heading: 'Reddit',
          items: [{ label: 'reddit/LastEpoch', url: 'https://www.reddit.com/r/LastEpoch/', note: 'Main reddit' }],
        },
        { heading: 'Notable Streamers', items: streamers },
      ],
    },
    {
      id: 'PreviousLeagues',
      title: 'Previous Cycles',
      intro: 'N/A',
    },
  ],
};

export default lastepoch;
