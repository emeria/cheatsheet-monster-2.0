import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import games from '../content/games';
import site from '../content/site';
import { asset } from '../lib/assets';

const HomePage = () => {
  useEffect(() => {
    document.title = `${site.name} by ${site.author}`;
  }, []);

  return (
    <>
      <main className="home-page">
        <h2>Choose a game:</h2>
        <div className="game-links">
          {games
            .filter((game) => game.tile)
            .map((game) => (
              <Link key={game.id} to={`/${game.id}`}>
                <img src={asset(game.tile)} alt={game.name} />
                <span className="game-name">{game.name}</span>
              </Link>
            ))}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;
