import React, { Fragment } from 'react';
import site from '../content/site';
import allGames from '../content/games';
import ExternalLink from './ExternalLink';
import Mascot from './Mascot';

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

const LinkRow = ({ label, links }) => (
  <p className="footer-links">
    <span>{label}</span>
    {links.map((l) => (
      <Fragment key={l.url}>
        {' '}
        <ExternalLink href={l.url}>{l.label}</ExternalLink>
      </Fragment>
    ))}
  </p>
);

// Per-sheet "updated" dates sit on each sheet, so the footer carries no date.
function Footer({ games = allGames }) {
  const note = affiliationNote(games);
  return (
    <footer className="site-footer">
      <Mascot animation="sit" still stillFrame="last" />
      <p className="footer-by">
        By {site.author} · IGN: {site.ign}
      </p>
      <LinkRow label="Find me" links={site.socials} />
      <LinkRow label="Support" links={site.support} />
      <p>{site.copyright}</p>
      {note && <p className="affiliation">{note}</p>}
    </footer>
  );
}

export default Footer;
