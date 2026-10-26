import React from 'react';
import site from '../content/site';

function Footer({ lastUpdated = site.lastUpdated }) {
  return (
    <footer className="site-footer">
      <span>Version 1.00, Last Updated {lastUpdated}.</span> <span>{site.copyright}</span>
    </footer>
  );
}

export default Footer;
