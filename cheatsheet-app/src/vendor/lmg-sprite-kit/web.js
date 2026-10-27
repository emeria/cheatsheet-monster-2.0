// lmg-sprite-kit web loader (v1). Copy into the site's source (with web.d.ts for TypeScript).
// Reads an exported manifest.json, loads only the sheets a character uses, stacks them in layer
// order (swapping ramps for colorways), and plays an animation on a <canvas>. No dependencies.
// The sprite is drawn at a whole-number scale with smoothing off, so pixels stay square.
//
//   const m = await loadManifest('/sprites/mascot/manifest.json');
//   const look = [{ layer: 'body', id: 'mascot', ramp: 'ember' }];   // ramp is optional
//   const sheets = await loadSheets('/sprites/mascot/', m, look);
//   const player = createPlayer(canvas, m, sheets, look, { scale: 4, animation: 'idle' });
//   player.play('wave', { onEnd: () => player.play('idle') });
//   player.setLook([{ layer: 'body', id: 'mascot', ramp: 'frost' }]);   // recolor, e.g. on a theme change
//   player.destroy();                                                    // on unmount
//
// Reduced motion: by default (`reducedMotion: 'auto'`) the player follows the visitor's
// prefers-reduced-motion setting, live. While it is on nothing animates: the canvas shows one
// still frame (frame 0 of the animation, or `stillFrame` from the options), and `onEnd` is
// called straight away so a "wave, then back to idle" chain still finishes. Pass `true` or
// `false` to force it, or call `player.setReducedMotion(bool)`.

const sheetFor = (manifest, pick) => {
  const s = manifest.sheets.find((x) => x.layer === pick.layer && x.id === pick.id);
  if (!s) throw new Error(`No sheet ${pick.layer}/${pick.id} in the manifest`);
  return s;
};

/** Fetches and parses a manifest. */
export async function loadManifest(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status})`);
  return res.json();
}

/** Loads the sheets for these picks (or every sheet). Resolves to a Map of file -> image. */
export async function loadSheets(baseUrl, manifest, picks) {
  const sheets = picks ? picks.map((p) => sheetFor(manifest, p)) : manifest.sheets;
  const images = new Map();
  await Promise.all([...new Set(sheets.map((s) => s.file))].map((file) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { images.set(file, img); resolve(); };
    img.onerror = () => reject(new Error(`Couldn't load ${baseUrl + file}`));
    img.src = baseUrl + file;
  })));
  return images;
}

const rgb = (hex) => parseInt(hex.slice(1), 16);

/** Swaps each color of `from` for the same step of `to` in RGBA bytes, in place. A `to` ramp
 *  shorter than `from` repeats its last color. Colors not in `from`, and see-through pixels, stay. */
export function recolorPixels(data, from, to) {
  const swap = new Map(from.map((col, i) => [rgb(col), rgb(to[Math.min(i, to.length - 1)])]));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const next = swap.get((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    if (next === undefined) continue;
    data[i] = next >> 16; data[i + 1] = (next >> 8) & 255; data[i + 2] = next & 255;
  }
  return data;
}

function recolored(source, width, height, from, to) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, width, height);
  recolorPixels(img.data, from, to);
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Stacks the picked sheets (in the manifest's layer order) into one canvas, the size of a sheet.
 *  A pick's `ramp` swaps the sheet's own ramp for it. Sheets that aren't in `images` are left off. */
export function bake(manifest, images, picks) {
  const { width: fw, height: fh } = manifest.frame;
  const w = fw * manifest.columns, h = fh * manifest.directions.length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const order = (p) => manifest.layers.indexOf(p.layer);
  for (const pick of [...picks].sort((a, b) => order(a) - order(b))) {
    const sheet = sheetFor(manifest, pick);
    let source = images.get(sheet.file);
    if (!source) continue;
    if (pick.ramp && sheet.ramp && pick.ramp !== sheet.ramp) {
      const from = manifest.ramps[sheet.ramp], to = manifest.ramps[pick.ramp];
      if (!to) throw new Error(`No ramp "${pick.ramp}" in the manifest`);
      source = recolored(source, w, h, from, to);
    }
    ctx.drawImage(source, 0, 0);
  }
  return c;
}

/** The frame number for a direction, animation, and frame within it (as in the Phaser loader). */
export function frameIndex(manifest, direction, animation, frame) {
  const row = manifest.directions.indexOf(direction);
  const a = manifest.animations[animation];
  if (row < 0 || !a) throw new Error(`No ${direction}/${animation} in the manifest`);
  return row * manifest.columns + a.start + (frame % a.frames);
}

/** The frame within an animation where an event happens (manifest `events`, e.g. 'hit'), or -1. */
export function eventFrame(manifest, animation, event) {
  const f = manifest.animations[animation]?.events?.[event];
  return f === undefined ? -1 : f;
}

/** The anchor as fractions of the frame (the point between the feet), or the center. */
export function originOf(manifest) {
  const a = manifest.anchor;
  return a ? [a.x / manifest.frame.width, a.y / manifest.frame.height] : [0.5, 0.5];
}

/** Which frame of an animation shows `ms` after it started, and whether a one-shot has finished.
 *  Looping animations never finish; one-shots hold their last frame. */
export function frameAt(animation, ms) {
  const step = Math.floor((Math.max(0, ms) * animation.frameRate) / 1000);
  if (animation.loop === false) return { frame: Math.min(step, animation.frames - 1), done: step >= animation.frames };
  return { frame: step % animation.frames, done: false };
}

const QUERY = '(prefers-reduced-motion: reduce)';

/** Plays animations on a canvas. Options: `scale` (whole number, default 1), `direction` (default
 *  the manifest's first), `animation` (default the manifest's first), `reducedMotion` ('auto',
 *  true, false), `stillFrame` (the frame shown while motion is reduced, default 0). Returns
 *  { play, setLook, setReducedMotion, get reduced, destroy }. */
export function createPlayer(canvas, manifest, images, picks, options = {}) {
  const { width: fw, height: fh } = manifest.frame;
  const scale = Math.max(1, Math.round(options.scale ?? 1));
  canvas.width = fw * scale; canvas.height = fh * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const media = typeof matchMedia === 'function' ? matchMedia(QUERY) : null;
  const setting = options.reducedMotion ?? 'auto';
  let forced = setting === 'auto' ? null : !!setting;
  const isReduced = () => (forced === null ? !!media?.matches : forced);

  let sheet = bake(manifest, images, picks);
  let direction = options.direction ?? manifest.directions[0];
  let name = options.animation ?? Object.keys(manifest.animations)[0];
  let stillFrame = options.stillFrame ?? 0;
  let onEnd, onEvent;
  let raf = 0, startedAt = 0, lastFrame = -1, destroyed = false;

  function draw(frame) {
    const index = frameIndex(manifest, direction, name, frame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sheet, (index % manifest.columns) * fw, Math.floor(index / manifest.columns) * fh, fw, fh, 0, 0, fw * scale, fh * scale);
  }

  function tick(now) {
    raf = 0;
    if (destroyed || isReduced()) return;
    const a = manifest.animations[name];
    const { frame, done } = frameAt(a, now - startedAt);
    if (frame !== lastFrame) {
      draw(frame);
      for (const [event, at] of Object.entries(a.events ?? {})) if (at === frame && onEvent) onEvent(event, frame);
      lastFrame = frame;
    }
    if (done) { const cb = onEnd; onEnd = undefined; cb?.(); return; }
    raf = requestAnimationFrame(tick);
  }

  function restart() {
    cancelAnimationFrame(raf); raf = 0;
    lastFrame = -1;
    if (isReduced()) { draw(Math.min(stillFrame, manifest.animations[name].frames - 1)); return; }
    startedAt = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function onMediaChange() {
    if (forced !== null || destroyed) return;
    restart();
    if (isReduced()) { const cb = onEnd; onEnd = undefined; cb?.(); }
  }
  media?.addEventListener?.('change', onMediaChange);

  const player = {
    /** Starts an animation. `onEnd` runs when a one-shot finishes (or at once while motion is reduced);
     *  `onEvent(name, frame)` runs on the manifest's events; `direction` and `stillFrame` are optional. */
    play(animation, opts = {}) {
      if (destroyed) return;
      if (!manifest.animations[animation]) throw new Error(`No animation "${animation}" in the manifest`);
      name = animation;
      direction = opts.direction ?? direction;
      stillFrame = opts.stillFrame ?? options.stillFrame ?? 0;
      onEnd = opts.onEnd; onEvent = opts.onEvent;
      restart();
      if (isReduced()) { const cb = onEnd; onEnd = undefined; cb?.(); }
    },
    /** Re-bakes with new picks (a different ramp, say) and redraws the current frame. */
    setLook(next) {
      picks = next;
      sheet = bake(manifest, images, picks);
      if (isReduced() || lastFrame < 0) draw(Math.min(stillFrame, manifest.animations[name].frames - 1));
      else draw(lastFrame);
    },
    /** Forces reduced motion on or off, or back to following the visitor's setting with 'auto'. */
    setReducedMotion(value) {
      forced = value === 'auto' ? null : !!value;
      restart();
      if (isReduced()) { const cb = onEnd; onEnd = undefined; cb?.(); }
    },
    get reduced() { return isReduced(); },
    /** Stops the loop and the media-query listener. Call when the canvas goes away. */
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf); raf = 0;
      media?.removeEventListener?.('change', onMediaChange);
    },
  };
  restart();
  return player;
}
