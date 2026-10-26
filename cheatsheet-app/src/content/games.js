import poe from './poe';
import poe2 from './poe2';
import lastepoch from './lastepoch';
import wow from './wow';

// Every game page. Each gets a route at /<id>; games with a `tile` show on the home page, in this order.
const games = [poe, poe2, lastepoch, wow];

export default games;
