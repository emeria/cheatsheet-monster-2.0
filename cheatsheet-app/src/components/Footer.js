import React from 'react';
import site from '../content/site';
import allGames from '../content/games';

// "A, B and C"
const joinNames = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`);

// Every game page needs a visible "not affiliated" note (GGG's third-party policy asks for one;
// it's the right default for every publisher). It names the publishers of the games shown.
export function affiliationNote(games) {
  const publishers = [...new Set(games.map((g) => g.publisher).filter(Boolean))];
  if (!publishers.length) return '';
  return `${site.name} is a fan site. It isn't affiliated with or endorsed by ${joinNames(publishers)} in any way. ${joinNames(
    games.map((g) => g.name),
  )} and all related names, art and data belong to their owners.`;
}

function Footer({ lastUpdated = site.lastUpdated, games = allGames }) {
  const note = affiliationNote(games);
  return (
    <footer className="site-footer">
      <span>Version 1.00, Last Updated {lastUpdated}.</span> <span>{site.copyright}</span>
      {note && <p className="affiliation">{note}</p>}
    </footer>
  );
}

export default Footer;
