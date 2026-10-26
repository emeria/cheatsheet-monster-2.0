// WoW Classic page. Not listed on the home page (same as the original site), but reachable at /wow.

const wow = {
  id: 'wow',
  name: 'WoW Classic',
  lastUpdated: 'Sun, Feb 18, 2024',

  cheatsheets: [
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
  ],
  resources: [],
};

export default wow;
