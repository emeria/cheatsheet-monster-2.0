import React, { Fragment, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Section from '../components/Section';
import JumpLink from '../components/JumpLink';
import ExternalLink from '../components/ExternalLink';
import Footer from '../components/Footer';
import GameContext from '../components/GameContext';
import site from '../content/site';
import { revealSection, setAllOpen } from '../lib/reveal';

export const TOOLS_TITLE = 'Trees & Calculators';

// Renders one game from src/content: its cheat sheets, then its link sections. With `tools`,
// it renders the game's trees and calculators instead, on their own page (/<id>/tools), so
// the tree data loads only there.
function GamePage({ game, tools = false }) {
  const { hash } = useLocation();
  const sheetsRef = useRef(null);
  const resources = tools ? [] : game.resources ?? [];
  const sheets = tools ? game.tools : game.cheatsheets;
  const sheetsTitle = tools ? TOOLS_TITLE : 'Cheatsheets';

  useEffect(() => {
    document.title = `${game.name} ${tools ? TOOLS_TITLE : 'Cheat Sheet'} by ${site.author}`;
  }, [game, tools]);

  // Deep links like /poe#heist open and scroll to that section.
  useEffect(() => {
    if (hash) revealSection(decodeURIComponent(hash.slice(1)), 'auto');
  }, [game, hash]);

  return (
    <>
      <main className="game-page">
        <p className="subtitle">
          <b>
            <i>{game.shortName ?? game.name}</i>
          </b>{' '}
          Cheatsheet of Cheatsheets
        </p>
        <p className="byline">
          by{' '}
          <i>
            {site.author} | IGN: {site.ign}
          </i>
          {site.socials.map((s) => (
            <Fragment key={s.url}>
              {' | '}
              <ExternalLink href={s.url}>{s.label}</ExternalLink>
            </Fragment>
          ))}
        </p>

        <nav className="page-nav">
          <Link to="/">Back Home</Link>
          {tools && (
            <>
              {' | '}
              <Link to={`/${game.id}`}>Cheatsheets</Link>
            </>
          )}
          {!tools && game.cheatsheets.length > 0 && (
            <>
              {' | '}
              <JumpLink id="cheatsheets">Cheatsheets</JumpLink>
            </>
          )}
          {!tools && game.tools?.length > 0 && (
            <>
              {' | '}
              <Link to={`/${game.id}/tools`}>{TOOLS_TITLE}</Link>
            </>
          )}
          {resources.map((r) => (
            <Fragment key={r.id}>
              {' | '}
              <JumpLink id={r.id}>{r.navLabel ?? r.title}</JumpLink>
            </Fragment>
          ))}
        </nav>
        <hr />

        {!tools && game.tools?.length > 0 && (
          <p className="tools-link">
            <Link className="styled-button" to={`/${game.id}/tools`}>
              {TOOLS_TITLE}
            </Link>{' '}
            {game.tools.map((s) => s.navLabel ?? s.title).join(' · ')}
          </p>
        )}

        {sheets.length > 0 && (
          <>
            <h2 id={tools ? 'tools' : 'cheatsheets'}>{sheetsTitle}</h2>
            {!tools && <p className="hint">Click an image to focus it</p>}
            <nav className="sheet-nav">
              {sheets.map((s, i) => (
                <Fragment key={s.id}>
                  {i > 0 && ' | '}
                  <JumpLink id={s.id}>{s.navLabel ?? s.title}</JumpLink>
                </Fragment>
              ))}
            </nav>
            <div className="expand-buttons">
              <button className="styled-button" onClick={() => setAllOpen(sheetsRef.current, false)}>
                [-] Collapse All
              </button>
              <button className="styled-button" onClick={() => setAllOpen(sheetsRef.current, true)}>
                [+] Expand All
              </button>
            </div>

            <GameContext.Provider value={game.id}>
              <div ref={sheetsRef}>
                {sheets.map((section) => (
                  <Section key={section.id} section={section} />
                ))}
              </div>
            </GameContext.Provider>
          </>
        )}

        {resources.length > 0 && <hr />}
        {resources.map((section) => (
          <Section key={section.id} section={section} />
        ))}

        {game.feedbackUrl && (
          <p className="feedback">
            <b>Feedback:</b> Please leave feedback in my reddit <ExternalLink href={game.feedbackUrl}>thread</ExternalLink>.
          </p>
        )}
        {game.thanks && <p className="feedback">Thanks: {game.thanks}</p>}
      </main>
      <Footer lastUpdated={game.lastUpdated} games={[game]} />
    </>
  );
}

export default GamePage;
