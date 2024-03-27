import React from 'react';
import './App.css';
import Header from './components/Header';
import ThemeSwitcher from './components/ThemeSwitcher';
import CheatsheetComponent from './components/Cheatsheet';
import Navbar from './components/Navbar';
import BackToTopButton from './components/BackToTopButton';
import Footer from './components/Footer';

function App() {  
  return (
    <div className="App">
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

export default App;
