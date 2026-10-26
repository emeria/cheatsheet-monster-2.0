// Every image and CSV lives under public/assets. Content files use paths relative to it,
// e.g. asset('poe/pics/heist.webp').
export function asset(path) {
  return `${import.meta.env.BASE_URL}assets/${path}`;
}
