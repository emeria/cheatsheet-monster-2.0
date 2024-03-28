import React from 'react';
import { Link } from 'react-router-dom'; // If you use Link inside the header

const Header = () => {
  return (
    <header>
      <h1>Cheatsheet Monster</h1>
      <h4>by Thundersphinx</h4>
      <div className="header-icons">
        <a href="https://www.buymeacoffee.com/emeria" target="_blank" rel="noopener noreferrer">
          <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" />
        </a><span>&nbsp;</span>
        <a href="https://www.patreon.com/emeria" target="_blank" rel="noopener noreferrer">
          <img src={process.env.PUBLIC_URL + "/images/PATREON_SYMBOL_1_BLACK_RGB.png"} alt="Patreon" />
        </a>
      </div>
    </header>
  );
};

export default Header;
