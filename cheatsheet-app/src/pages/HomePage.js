import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Make sure to create a CSS file for styling
import Footer from '../components/Footer';

const HomePage = () => {
  return (
    <div className="HomePage">
      <header>
        <h1>Cheatsheet Monster</h1>
        <div className="header-icons">
          <a href="https://www.buymeacoffee.com/emeria" target="_blank" rel="noopener noreferrer">
            <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style={{ height: '60px', width: '217px' }} />
          </a><span>&nbsp;</span>
          <a href="https://www.patreon.com/emeria" target="_blank" rel="noopener noreferrer">
            <img src={process.env.PUBLIC_URL + "/images/PATREON_SYMBOL_1_BLACK_RGB.png"} alt="Patreon" />
          </a>
        </div>
        <h4>by Thundersphinx</h4>
      </header>
      <div className="content">
        <h2>Choose a game:</h2>
        <div className="game-links">
          <Link to="/poe">
            <img src={process.env.PUBLIC_URL + "/images/path-of-exile-necropolis.png"} alt="Path of Exile" />
          </Link>
          <Link to="/lastepoch">
            <img src={process.env.PUBLIC_URL + "/images/last-epoch-placeholder.png"} alt="Last Epoch" />
          </Link>
        </div>
      </div>

    <Footer />
    </div>
  );
}

export default HomePage;
