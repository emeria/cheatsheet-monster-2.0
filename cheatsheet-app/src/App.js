import React from 'react';
import './App.css';
import Header from './components/Header';
import ThemeSwitcher from './components/ThemeSwitcher';
// import ClickableImage from './components/ClickableImage';
import CheatsheetComponent from './components/Cheatsheet';
import Navbar from './components/Navbar';

function App() {  
  return (
    <div className="App">
      <Header />
        <ThemeSwitcher />
        <br></br>
        <Navbar />
      <main>
        <section>
      <h3>Cheatsheets</h3>   
      {/* <ClickableImage tag="VendorRecipeCheatsheetV1" />
      <ClickableImage tag="323Betrayal" /> */}
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
      <footer>
        <p>Footer content goes here.</p>
      </footer>
    </div>
  );
}

export default App;
