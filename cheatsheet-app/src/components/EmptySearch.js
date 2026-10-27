import React from 'react';
import Mascot from './Mascot';

// Shown when a search finds nothing. The mascot casts once, then idles.
const EmptySearch = ({ query }) => (
  <div className="mascot-note" role="status">
    <Mascot animation="cast" then="idle" scale={2} featured />
    <span>{query ? `Nothing matches "${query}". Try a shorter word or a game name.` : 'Nothing found.'}</span>
  </div>
);

export default EmptySearch;
