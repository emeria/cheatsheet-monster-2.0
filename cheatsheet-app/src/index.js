import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { getSearchIndex } from './lib/searchIndex';
import { applySkin, savedSkin } from './components/ThemeSwitcher';
import './styles/theme.css';
import './styles/app.css';

applySkin(savedSkin());
getSearchIndex();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
