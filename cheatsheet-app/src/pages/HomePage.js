import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Make sure to create a CSS file for styling
import Footer from '../components/Footer';
import Header from '../components/Header';

const HomePage = () => {
  return (
    <div className="HomePage">
        <Header />
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
