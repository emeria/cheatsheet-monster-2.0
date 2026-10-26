// Every image and CSV lives under public/assets. Content files use paths relative to it,
// e.g. asset('poe/pics/heist.jpg').
export function asset(path) {
  return `${process.env.PUBLIC_URL}/assets/${path}`;
}
