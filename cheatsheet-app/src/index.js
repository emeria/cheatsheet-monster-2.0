import React from 'react';
import { createRoot } from 'react-dom/client'; // Updated import
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LastEpochPage from './pages/LastEpochPage';
import PathOfExilePage from './pages/PathofExilePage';
import HomePage from './pages/HomePage';

// Get a reference to the root DOM element
const rootElement = document.getElementById('root');
// Create a root
const root = createRoot(rootElement);

// Render your app
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/poe" element={<PathOfExilePage />} />
        <Route path="/lastepoch" element={<LastEpochPage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
