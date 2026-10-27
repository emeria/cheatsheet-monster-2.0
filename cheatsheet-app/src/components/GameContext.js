import { createContext } from 'react';

// The game whose page a widget is on, for widgets that link back to it (tree share and
// embed links). Null outside a game page.
const GameContext = createContext(null);

export default GameContext;
