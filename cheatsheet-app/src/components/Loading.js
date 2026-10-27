import React from 'react';
import Mascot from './Mascot';

// The mascot walks while something loads. It is the screen's moving mascot.
const Loading = ({ children = 'Loading…' }) => (
  <p className="mascot-note" role="status">
    <Mascot animation="walk" featured />
    <span>{children}</span>
  </p>
);

export default Loading;
