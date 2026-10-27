import React, { useEffect } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Section from '../components/Section';
import ExternalLink from '../components/ExternalLink';
import Footer from '../components/Footer';
import GameContext from '../components/GameContext';
import site from '../content/site';
import { revealSection } from '../lib/reveal';
import { findSheet, hubPath, sheetNeighbours, sheetPath } from '../lib/sheetRoutes';

// Who a sheet's content comes from: a `credit` on the sheet or its widget props, plus the
// source link of each image.
export function sheetSources(sheet) {
  const credit = sheet.credit ?? sheet.props?.credit;
  const links = [];
  const visit = (section) => {
    for (const image of section.images ?? []) {
      if (image.source) links.push({ url: image.source, label: image.sourceLabel ?? 'source' });
    }
    section.children?.forEach(visit);
  };
  visit(sheet);
  return { credit, links };
}

// One cheat sheet on its own page: /<game>/<sheet>.
function SheetPage({ game }) {
  const { sheet: sheetId } = useParams();
  const { hash } = useLocation();
  const sheet = findSheet(game, sheetId);

  useEffect(() => {
    if (sheet) document.title = `${sheet.title} - ${game.name} Cheat Sheet by ${site.author}`;
  }, [game, sheet]);

  // A link into a nested section (/poe/league#part) opens that section.
  useEffect(() => {
    if (sheet && hash) revealSection(decodeURIComponent(hash.slice(1)), 'auto');
  }, [sheet, hash]);

  if (!sheet) return <Navigate to={hubPath(game)} replace />;

  const { prev, next } = sheetNeighbours(game, sheet.id);
  const { credit, links } = sheetSources(sheet);

  return (
    <>
      <main className="sheet-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to={hubPath(game)}>{game.shortName ?? game.name}</Link>
            </li>
            <li aria-current="page">{sheet.navLabel ?? sheet.title}</li>
          </ol>
        </nav>

        <h1>{sheet.title}</h1>
        {(sheet.version || sheet.updated) && (
          <p className="sheet-meta">
            {sheet.version && <span>Version {sheet.version}</span>}
            {sheet.version && sheet.updated && ' · '}
            {sheet.updated && <span>Updated {sheet.updated}</span>}
          </p>
        )}

        <GameContext.Provider value={game.id}>
          <Section section={{ ...sheet, open: true }} />
        </GameContext.Provider>

        {(credit || links.length > 0) && (
          <p className="source-credit">
            <b>Source:</b> {credit}
            {credit && links.length > 0 && ' '}
            {links.map((l, i) => (
              <React.Fragment key={l.url}>
                {i > 0 && ' | '}
                <ExternalLink href={l.url}>{l.label}</ExternalLink>
              </React.Fragment>
            ))}
          </p>
        )}

        <nav className="sheet-pager" aria-label="Other cheat sheets">
          {prev ? (
            <Link rel="prev" to={sheetPath(game, prev)}>
              ← {prev.navLabel ?? prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link rel="next" to={sheetPath(game, next)}>
              {next.navLabel ?? next.title} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
      <Footer lastUpdated={sheet.updated ?? game.lastUpdated} games={[game]} />
    </>
  );
}

export default SheetPage;
