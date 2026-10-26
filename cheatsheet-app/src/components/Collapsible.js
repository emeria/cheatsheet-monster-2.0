import React from 'react';

function Collapsible({ id, title, accent, open, intro, children }) {
  return (
    <details id={id} className="section" open={open}>
      <summary className={accent ? `collapsible accent-${accent}` : 'collapsible'}>{title}</summary>
      <div className="section-body">
        {intro && <p className="intro">{intro}</p>}
        {children}
      </div>
    </details>
  );
}

export default Collapsible;
