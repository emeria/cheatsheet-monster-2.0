import React from 'react';
import './App.css';
import Header from './components/Header';
import ThemeSwitcher from './components/ThemeSwitcher';
import ClickableImage from './components/ClickableImage';

function App() {  
  return (
    <div className="App">
      <Header />
        <ThemeSwitcher />
      <main>
        <section>
          <h2>Welcome to the Cheatsheet App</h2>
          <p>This is a simple React app demonstrating theme switching.</p>
      <h3>Gallery One</h3>   
      <ClickableImage tag="VendorRecipeCheatsheetV1" />
      <ClickableImage tag="323Betrayal" />
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
