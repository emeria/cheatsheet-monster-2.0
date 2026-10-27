import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import SheetPage from './pages/SheetPage';
import EmbedPage from './pages/EmbedPage';
import games from './content/games';

const withTools = games.filter((g) => g.tools?.length);

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {games.map((game) => (
          <Route key={game.id} path={game.id} element={<GamePage game={game} />} />
        ))}
        {withTools.map((game) => (
          <Route key={game.id} path={`${game.id}/tools`} element={<GamePage game={game} tools />} />
        ))}
        {games.map((game) => (
          <Route key={game.id} path={`${game.id}/:sheet`} element={<SheetPage game={game} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      {/* Embeds sit outside the site layout: no header, theme switcher or analytics. */}
      {withTools.map((game) => (
        <Route key={game.id} path={`${game.id}/embed/:tool`} element={<EmbedPage game={game} />} />
      ))}
    </Routes>
  );
}

export default App;
