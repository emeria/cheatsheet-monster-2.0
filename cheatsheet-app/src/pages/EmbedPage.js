import React, { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import GameContext from '../components/GameContext';
import { affiliationNote } from '../components/Footer';
import site from '../content/site';
import TalentTree from '../widgets/TalentTree';

// A read-only tree for other sites to put in an iframe: /<game>/embed/<tool id>?b=<share code>.
// No site header or analytics, but it keeps the publisher note, which GGG's terms ask for
// wherever their tree is shown.
function EmbedPage({ game }) {
  const { tool } = useParams();
  const { search } = useLocation();
  const section = game.tools?.find((s) => s.id === tool && s.widget === 'talentTree');

  useEffect(() => {
    document.title = `${section?.title ?? 'Tree'} · ${game.name} · ${site.name}`;
  }, [game, section]);

  if (!section) return <p className="error embed-page">No tree "{tool}" for {game.name}.</p>;
  return (
    <div className="embed-page">
      <GameContext.Provider value={game.id}>
        <TalentTree {...section.props} sectionId={section.id} readOnly />
      </GameContext.Provider>
      <p className="embed-credit">
        <a href={`${import.meta.env.BASE_URL}${game.id}/tools${search}`} target="_blank" rel="noopener noreferrer">
          Open in {site.name}
        </a>{' '}
        · {affiliationNote([game])}
      </p>
    </div>
  );
}

export default EmbedPage;
