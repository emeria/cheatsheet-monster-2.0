import React from 'react';
import './App.css';
import Header from './components/Header';
import ThemeSwitcher from './components/ThemeSwitcher';
// import ClickableImage from './components/ClickableImage';
import CheatsheetComponent from './components/Cheatsheet';

function App() {  
  return (
    <div className="App">
      <Header />
        <ThemeSwitcher />
      <main>
        <section>
      <h3>Gallery One</h3>   
      {/* <ClickableImage tag="VendorRecipeCheatsheetV1" />
      <ClickableImage tag="323Betrayal" /> */}
       <CheatsheetComponent id="vendor_recipes" />
       <CheatsheetComponent id="betrayal" />
          {/* You can add more content here */}
        </section>
      </main>
      <footer>
        <p>Footer content goes here.</p>
      </footer>
    </div>
  );
}

export default App;
