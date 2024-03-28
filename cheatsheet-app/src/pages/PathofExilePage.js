import React from 'react';
import './App.css'; // Reuse the same CSS or create a specific one for Last Epoch
import Header from '../components/Header';
import ThemeSwitcher from '../components/ThemeSwitcher';
import CheatsheetComponent from '../components/Cheatsheet'; // Assuming you have specific cheatsheets for Last Epoch
import Navbar from '../components/Navbar';
import BackToTopButton from '../components/BackToTopButton';
import Footer from '../components/Footer';

function PathofExilePage() {
  return (
    <div className="PathofExilePage">
      <Header />
      <ThemeSwitcher />
      <br></br>
      <Navbar />
      <BackToTopButton />
      <main>
        <section>
          <h3>Cheatsheets</h3>
          <CheatsheetComponent id="leveling" />
       <CheatsheetComponent id="vendor_recipes" />
       <CheatsheetComponent id="betrayal" />
       <CheatsheetComponent id="heist" />
       <CheatsheetComponent id="incursion" />
       <CheatsheetComponent id="tattoos" />
       <CheatsheetComponent id="essences" />
       <CheatsheetComponent id="strongboxes" />
       <CheatsheetComponent id="flasks" />
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default PathofExilePage;
