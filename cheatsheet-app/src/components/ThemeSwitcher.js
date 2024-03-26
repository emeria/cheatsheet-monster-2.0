import React from 'react';

const ThemeSwitcher = () => {
  const switchTheme = (themeName) => {
    // Set the class on body element to the selected theme
    document.body.className = themeName;
  };

  return (
    <div>
      <button className="styled-button" onClick={() => switchTheme('lightTheme')}>
        Light Theme
      </button>
      <button className="styled-button" onClick={() => switchTheme('normalTheme')}>
        Normal Theme
      </button>
      <button className="styled-button" onClick={() => switchTheme('darkTheme')}>
        Dark Theme
      </button>
    </div>
  );
};

export default ThemeSwitcher;
