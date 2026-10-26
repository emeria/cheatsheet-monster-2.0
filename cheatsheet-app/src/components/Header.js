import React from 'react';
import { Link } from 'react-router-dom';
import site from '../content/site';
import { asset } from '../lib/assets';

const Header = () => {
  return (
    <header className="site-header">
      <h1>
        <Link to="/">{site.name}</Link>
      </h1>
      <h4>by {site.author}</h4>
      <div className="header-icons">
        <a href="https://www.buymeacoffee.com/emeria" target="_blank" rel="noopener noreferrer">
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" />
        </a>
        <a href="https://www.patreon.com/emeria" target="_blank" rel="noopener noreferrer">
          <img src={asset('home/PATREON_SYMBOL_1_BLACK_RGB.png')} alt="Patreon" />
        </a>
      </div>
    </header>
  );
};

export default Header;
