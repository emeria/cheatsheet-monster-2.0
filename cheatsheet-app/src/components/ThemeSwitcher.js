import React, { useState } from 'react';

// Colours for each theme live in styles/theme.css under [data-theme="..."].
const THEMES = [
  { id: 'light', label: '😇 Light' },
  { id: 'normal', label: '🧌 Neutral' },
  { id: 'dark', label: '👿 Dark' },
];
const STORAGE_KEY = 'theme';

export function savedTheme() {
  try {
    const theme = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === theme) ? theme : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

function ThemeSwitcher() {
  const [theme, setTheme] = useState(savedTheme);

  const choose = (id) => {
    setTheme(id);
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private mode or blocked storage: the theme still applies for this visit.
    }
  };

  return (
    <div className="theme-switcher">
      <span>Theme</span>
      {THEMES.map(({ id, label }) => (
        <button key={id} className="theme-button" aria-pressed={theme === id} onClick={() => choose(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default ThemeSwitcher;
