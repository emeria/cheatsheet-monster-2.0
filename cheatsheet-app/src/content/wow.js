// WoW Classic page. Not listed on the home page (same as the original site), but reachable at /wow.

const wow = {
  id: 'wow',
  name: 'WoW Classic',
  publisher: 'Blizzard Entertainment',
  lastUpdated: 'Sun, Feb 18, 2024',

  cheatsheets: [],

  // Trees and calculators: their own page at /wow/tools.
  tools: [
    {
      id: 'tbc-scryer-aldor',
      title: 'Scryer/Aldor Calculator',
      navLabel: 'Scryer/Aldor',
      open: true,
      widget: 'aldorScryer',
    },
    {
      id: 'cenarion',
      title: 'Cenarion Expedition Calculator',
      navLabel: 'Cenarion Expedition',
      open: true,
      widget: 'cenarion',
    },
    {
      id: 'warrior-talents',
      title: 'Warrior Talents',
      navLabel: 'Warrior Talents',
      open: true,
      widget: 'talentTree',
      props: { tree: 'wow-classic-warrior' },
    },
  ],
  resources: [],
};

export default wow;
