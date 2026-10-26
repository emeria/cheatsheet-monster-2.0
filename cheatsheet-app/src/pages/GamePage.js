import React, { Fragment, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Section from '../components/Section';
import JumpLink from '../components/JumpLink';
import ExternalLink from '../components/ExternalLink';
import Footer from '../components/Footer';
import site from '../content/site';
import { revealSection, setAllOpen } from '../lib/reveal';

// Renders one game from src/content: its cheat sheets, then its link sections.
function GamePage({ game }) {
  const { hash } = useLocation();
  const sheetsRef = useRef(null);
  const resources = game.resources ?? [];

  useEffect(() => {
    document.title = `${game.name} Cheat Sheet by ${site.author}`;
  }, [game]);

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
          {' | '}
          <JumpLink id="cheatsheets">Cheatsheets</JumpLink>
          {resources.map((r) => (
            <Fragment key={r.id}>
              {' | '}
              <JumpLink id={r.id}>{r.navLabel ?? r.title}</JumpLink>
            </Fragment>
          ))}
        </nav>
        <hr />

        <h2 id="cheatsheets">Cheatsheets</h2>
        <p className="hint">Click an image to focus it</p>
        <nav className="sheet-nav">
          {game.cheatsheets.map((s, i) => (
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

        <div ref={sheetsRef}>
          {game.cheatsheets.map((section) => (
            <Section key={section.id} section={section} />
          ))}
        </div>

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
      <Footer lastUpdated={game.lastUpdated} />
    </>
  );
}

export default GamePage;
