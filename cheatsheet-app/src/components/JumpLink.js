import React from 'react';
import { revealSection } from '../lib/reveal';

// An in-page link that also opens the target section, and keeps the #id in the URL for sharing.
function JumpLink({ id, children }) {
  const onClick = (event) => {
    event.preventDefault();
    if (revealSection(id)) window.history.replaceState(window.history.state, '', `#${id}`);
  };

  return (
    <a href={`#${id}`} onClick={onClick}>
      {children}
    </a>
  );
}

export default JumpLink;
