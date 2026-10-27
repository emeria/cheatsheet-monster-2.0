import React, { useState } from 'react';

// Colours for each skin live in styles/theme.css under [data-skin="..."].
export const SKINS = [
  { id: 'dusk', label: 'Dusk' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'ember', label: 'Ember' },
  { id: 'frost', label: 'Frost' },
  { id: 'light', label: 'Light' },
  { id: 'parchment', label: 'Parchment' },
  { id: 'grimoire', label: 'Grimoire' },
  { id: 'contrast', label: 'High contrast' },
];
export const STORAGE_KEY = 'skin';
const OLD_STORAGE_KEY = 'theme'; // dark | normal | light, before the eight skins

const isSkin = (id) => SKINS.some((s) => s.id === id);

// The viewer's pick, else Light for a light OS, else Dusk. Keep the same logic in index.html,
// which sets the skin before the first paint.
export function savedSkin() {
  try {
    const skin = localStorage.getItem(STORAGE_KEY);
    if (isSkin(skin)) return skin;
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old === 'light' || old === 'normal') return 'light';
    if (old === 'dark') return 'dusk';
  } catch {
    // Blocked storage: fall through to the OS preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dusk';
}

export function applySkin(skin) {
  document.documentElement.dataset.skin = skin;
}

function ThemeSwitcher() {
  const [skin, setSkin] = useState(savedSkin);

  const choose = (id) => {
    setSkin(id);
    applySkin(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private mode or blocked storage: the skin still applies for this visit.
    }
  };

  return (
    <label className="skin-picker">
      <span>Theme</span>
      <select value={skin} onChange={(e) => choose(e.target.value)}>
        {SKINS.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default ThemeSwitcher;
