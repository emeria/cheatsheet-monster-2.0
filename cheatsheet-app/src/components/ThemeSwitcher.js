import React from 'react';

const ThemeSwitcher = () => {
  const switchTheme = (themeName) => {
    // Set the class on body element to the selected theme
    document.body.className = themeName;
  };

  return (
    <>
    <div className="theme-switcher">
    <div className="theme-buttons">
      <span>Theme</span>
      <button className="theme-button" onClick={() => switchTheme('lightTheme')}>
      😇 Light
      </button>
      <button className="theme-button" onClick={() => switchTheme('normalTheme')}>
      🧌 Neutral
      </button>
      <button className="theme-button" onClick={() => switchTheme('darkTheme')}>
      👿 Dark
      </button>
    </div>
    </div>
    </>
  );
};

export default ThemeSwitcher;
