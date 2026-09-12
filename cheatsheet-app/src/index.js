import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LastEpochPage from './pages/LastEpochPage';
import PathOfExilePage from './pages/PathofExilePage';
import HomePage from './pages/HomePage';
import './index.css';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <Router basename="/cheatsheet-monster-2.0">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/poe" element={<PathOfExilePage />} />
        <Route path="/lastepoch" element={<LastEpochPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);