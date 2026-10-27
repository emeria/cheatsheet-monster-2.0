import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { createPlayer, loadManifest, loadSheets } from '../vendor/lmg-sprite-kit/web';

// The scroll mummy (Sprite Goblin export, vendored by `npm run sync:sprite-kit`). The frame size is
// repeated here so the canvas can hold its space before the manifest arrives; Mascot.test.js checks
// it against the manifest.
export const MASCOT_FRAME = { width: 32, height: 40 };

const base = `${import.meta.env.BASE_URL}assets/mascot/`;
const look = [{ layer: 'body', id: 'cheatsheet-monster' }];

let loading;
function loadMascot() {
  if (!loading) {
    loading = loadManifest(`${base}manifest.json`).then(async (manifest) => ({ manifest, images: await loadSheets(base, manifest, look) }));
    loading.catch(() => { loading = undefined; });
  }
  return loading;
}

// One moving thing per screen: a `featured` mascot (404, empty search, loading) is the star, and
// every other mascot on the screen holds a still frame while one is mounted.
let featuredCount = 0;
const listeners = new Set();
const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const setFeatured = (delta) => {
  featuredCount += delta;
  listeners.forEach((fn) => fn());
};

/**
 * Plays one of the mascot's animations on a canvas.
 * - `animation`: idle, wave, cast, hurt, sit or walk. `then` is what a one-shot settles into.
 * - `featured`: this is the screen's moving mascot. Others stand still while it is mounted.
 * - `still`: never moves. `stillFrame` is the frame shown, a number or 'last'.
 * Under prefers-reduced-motion everything shows a still frame (the kit loader handles that).
 */
function Mascot({ animation = 'idle', then, scale = 1, featured = false, still = false, stillFrame = 0, className = '' }) {
  const canvas = useRef(null);
  const loaded = useRef(null);
  const player = useRef(null);
  const othersFeatured = useSyncExternalStore(subscribe, () => featuredCount) > (featured ? 1 : 0);
  const quiet = still || othersFeatured;

  useEffect(() => {
    if (!featured) return undefined;
    setFeatured(1);
    return () => setFeatured(-1);
  }, [featured]);

  const start = () => {
    const { manifest } = loaded.current;
    const frame = stillFrame === 'last' ? manifest.animations[animation].frames - 1 : stillFrame;
    player.current.setReducedMotion(quiet ? true : 'auto');
    player.current.play(animation, { stillFrame: frame, onEnd: then && (() => player.current?.play(then)) });
  };
  const latest = useRef(start);
  latest.current = start;

  useEffect(() => {
    let cancelled = false;
    loadMascot()
      .then((m) => {
        if (cancelled) return;
        loaded.current = m;
        player.current = createPlayer(canvas.current, m.manifest, m.images, look, { scale });
        latest.current();
      })
      .catch(() => {}); // no mascot is better than a broken page
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [scale]);

  useEffect(() => {
    if (player.current) start();
    // start() reads exactly these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation, then, quiet, stillFrame]);

  return (
    <canvas
      ref={canvas}
      className={`mascot ${className}`.trim()}
      width={MASCOT_FRAME.width * scale}
      height={MASCOT_FRAME.height * scale}
      aria-hidden="true"
    />
  );
}

export default Mascot;
