import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { applyTheme, savedTheme } from './components/ThemeSwitcher';
import './styles/theme.css';
import './styles/app.css';

applyTheme(savedTheme());

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={process.env.PUBLIC_URL || '/'}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
