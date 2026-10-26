// Uploaded art (Phase C): calibrate a tree's resolved layout to an image from
// a few clicked points, then snap nodes to the art's slots. Pure functions
// with no DOM. One dependency-free ES module, like tree-core.js.
//
// Matrices are [a, b, c, d, e, f], as in a layout's `calibration.m`:
// x' = a x + c y + e, y' = b x + d y + f.

/** Apply a matrix to a point. */
export function transformPoint(m, [x, y]) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

const mean = (list, k) => list.reduce((s, p) => s + p[k], 0) / list.length;

/**
 * Fit a transform from tree coordinates to image pixels by least squares.
 *
 * `pairs`: `[{ node?, at: [x, y], px: [x, y] }]`, where `at` is the node's
 * resolved layout position and `px` the point clicked on the art.
 * `kind`: `similarity` (scale, rotation, translation; 2+ points) or
 * `affine` (adds shear and uneven scale; 3+ points not all on a line).
 *
 * Returns `{ kind, m, points, rms, max }`. `points` holds each pair's
 * `{ node, px, residual }` (the distance in pixels between where the fit puts
 * the node and where it was clicked), in the shape a layout's `calibration`
 * saves. Throws a RangeError when the points can't fix the transform.
 */
export function calibrate(pairs, { kind = 'similarity' } = {}) {
  if (kind !== 'similarity' && kind !== 'affine') throw new RangeError(`unknown fit kind ${kind}`);
  const need = kind === 'affine' ? 3 : 2;
  if (!Array.isArray(pairs) || pairs.length < need) throw new RangeError(`a ${kind} fit needs at least ${need} points`);
  const src = pairs.map((p) => p.at);
  const dst = pairs.map((p) => p.px);
  const sx = mean(src, 0);
  const sy = mean(src, 1);
  const dx = mean(dst, 0);
  const dy = mean(dst, 1);
  const P = src.map(([x, y]) => [x - sx, y - sy]);
  const Q = dst.map(([x, y]) => [x - dx, y - dy]);
  // A scale-free tolerance for degenerate input.
  const spread = P.reduce((s, [x, y]) => s + x * x + y * y, 0);
  if (!(spread > 1e-12)) throw new RangeError('the points are all in one place');
  let m;
  if (kind === 'similarity') {
    let a = 0;
    let b = 0;
    P.forEach(([x, y], i) => {
      a += x * Q[i][0] + y * Q[i][1];
      b += x * Q[i][1] - y * Q[i][0];
    });
    a /= spread;
    b /= spread;
    m = [a, b, -b, a, dx - (a * sx - b * sy), dy - (b * sx + a * sy)];
  } else {
    let xx = 0;
    let xy = 0;
    let yy = 0;
    let xX = 0;
    let yX = 0;
    let xY = 0;
    let yY = 0;
    P.forEach(([x, y], i) => {
      const [X, Y] = Q[i];
      xx += x * x;
      xy += x * y;
      yy += y * y;
      xX += x * X;
      yX += y * X;
      xY += x * Y;
      yY += y * Y;
    });
    const det = xx * yy - xy * xy;
    if (!(Math.abs(det) > 1e-12 * spread * spread)) throw new RangeError('an affine fit needs 3 points not all on one line');
    const a = (xX * yy - yX * xy) / det;
    const c = (yX * xx - xX * xy) / det;
    const b = (xY * yy - yY * xy) / det;
    const d = (yY * xx - xY * xy) / det;
    m = [a, b, c, d, dx - a * sx - c * sy, dy - b * sx - d * sy];
  }
  const points = pairs.map((p) => {
    const [x, y] = transformPoint(m, p.at);
    const out = { node: p.node, px: p.px, residual: Math.hypot(x - p.px[0], y - p.px[1]) };
    if (out.node === undefined) delete out.node;
    return out;
  });
  const sq = points.reduce((s, p) => s + p.residual * p.residual, 0);
  return { kind, m, points, rms: Math.sqrt(sq / points.length), max: Math.max(...points.map((p) => p.residual)) };
}

// Minimum-cost assignment on a square cost matrix (flat, n x n): the
// Hungarian method with potentials, O(n^3). Returns col -> row. Ties go to
// the lower index, so the result is the same for the same input.
function hungarian(cost, n) {
  const u = new Float64Array(n + 1);
  const v = new Float64Array(n + 1);
  const p = new Int32Array(n + 1);
  const way = new Int32Array(n + 1);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Float64Array(n + 1).fill(Infinity);
    const used = new Uint8Array(n + 1);
    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[(i0 - 1) * n + (j - 1)] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const rowOf = new Int32Array(n);
  for (let j = 1; j <= n; j++) rowOf[j - 1] = p[j] - 1;
  return rowOf;
}

/**
 * Snap nodes to the art's slots.
 *
 * `nodes`: `[{ id, at: [x, y], manual? }]`, positions in the slots' space
 * (image pixels, after calibration). `slots`: `[[x, y]]` or `[{ id?, at }]`.
 * Each node goes to at most one slot within `tolerance`, and each slot takes
 * at most one node. The assignment snaps as many nodes as it can, then
 * minimises the total distance. `manual` nodes don't move: each claims the
 * nearest free slot within tolerance, in order, before the rest are assigned.
 *
 * Returns `{ placements, unsnapped, leftover, manual, problems }`:
 * - `placements`: `[{ node, slot, at, distance }]`, `slot` an index into `slots`;
 * - `unsnapped`: node ids with no slot; `leftover`: slot indexes with no node;
 * - `manual`: the manual node ids, left where they are;
 * - `problems`: `{ code: 'unsnapped', node }` and `{ code: 'leftover-slot', slot }`.
 */
export function snap(nodes, slots, { tolerance = Infinity } = {}) {
  const S = slots.map((s) => (Array.isArray(s) ? s : s.at));
  const taken = new Set();
  const manual = [];
  const free = [];
  for (const n of nodes) {
    if (!n.manual) {
      free.push(n);
      continue;
    }
    manual.push(n.id);
    let best = -1;
    let bestD = Infinity;
    S.forEach((s, j) => {
      const d = Math.hypot(s[0] - n.at[0], s[1] - n.at[1]);
      if (!taken.has(j) && d <= tolerance && d < bestD) {
        best = j;
        bestD = d;
      }
    });
    if (best >= 0) taken.add(best);
  }
  const open = S.map((_, j) => j).filter((j) => !taken.has(j));
  const n = free.length;
  const m = open.length;
  const dist = (i, j) => Math.hypot(S[open[j]][0] - free[i].at[0], S[open[j]][1] - free[i].at[1]);

  // Rows: nodes, then one stand-in per slot (the slot stays empty). Columns:
  // slots, then one stand-in per node (the node stays unsnapped). Leaving a
  // node unsnapped costs more than any set of snaps could save, so the most
  // nodes get snapped first, then the total distance is as small as it can be.
  let far = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const d = dist(i, j);
    if (d <= tolerance && d > far) far = d;
  }
  const skip = far * (n + 1) + 1;
  const never = skip * (n + m + 2) * 4;
  const N = n + m;
  const cost = new Float64Array(N * N).fill(never);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const d = dist(i, j);
      if (d <= tolerance) cost[i * N + j] = d;
    }
    cost[i * N + m + i] = skip;
  }
  for (let k = 0; k < m; k++) {
    cost[(n + k) * N + k] = 0;
    for (let l = 0; l < n; l++) cost[(n + k) * N + m + l] = 0;
  }
  const rowOf = N ? hungarian(cost, N) : new Int32Array(0);

  const placements = [];
  const snapped = new Set();
  const filled = new Set();
  for (let j = 0; j < m; j++) {
    const i = rowOf[j];
    if (i < 0 || i >= n || cost[i * N + j] >= never) continue;
    snapped.add(i);
    filled.add(j);
    placements.push({ node: free[i].id, slot: open[j], at: S[open[j]], distance: cost[i * N + j] });
  }
  const order = new Map(free.map((x, i) => [x.id, i]));
  placements.sort((a, b) => order.get(a.node) - order.get(b.node));
  const unsnapped = free.filter((_, i) => !snapped.has(i)).map((x) => x.id);
  const leftover = open.filter((_, j) => !filled.has(j));
  const problems = [
    ...unsnapped.map((node) => ({ code: 'unsnapped', node })),
    ...leftover.map((slot) => ({ code: 'leftover-slot', slot })),
  ];
  return { placements, unsnapped, leftover, manual, problems };
}
