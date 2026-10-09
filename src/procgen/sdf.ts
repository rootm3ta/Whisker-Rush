/**
 * Smooth implicit characters: a union of ellipsoids and tapered capsules (smooth-min blended),
 * polygonised once with surface nets, vertices snapped onto the surface, normals from the SDF
 * gradient (so shading is smooth with no primitive seams), and distance-based skin weights.
 */

export type V3 = readonly [number, number, number];

export interface Ellipsoid {
  kind: 'ell';
  c: V3;
  r: V3;
  bone: number;
  /** Blend radius into the rest of the shape (default: the spec's k). */
  k?: number;
}

export interface Capsule {
  kind: 'cap';
  a: V3;
  b: V3;
  ra: number;
  rb: number;
  bone: number;
  k?: number;
}

export type Prim = Ellipsoid | Capsule;

function sdEll(p: Ellipsoid, x: number, y: number, z: number): number {
  const px = (x - p.c[0]) / p.r[0];
  const py = (y - p.c[1]) / p.r[1];
  const pz = (z - p.c[2]) / p.r[2];
  const k0 = Math.sqrt(px * px + py * py + pz * pz);
  const qx = px / p.r[0];
  const qy = py / p.r[1];
  const qz = pz / p.r[2];
  const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(p.r[0], p.r[1], p.r[2]);
}

function sdCap(p: Capsule, x: number, y: number, z: number): number {
  const bax = p.b[0] - p.a[0];
  const bay = p.b[1] - p.a[1];
  const baz = p.b[2] - p.a[2];
  const pax = x - p.a[0];
  const pay = y - p.a[1];
  const paz = z - p.a[2];
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (p.ra + (p.rb - p.ra) * h);
}

export function primDist(p: Prim, x: number, y: number, z: number): number {
  return p.kind === 'ell' ? sdEll(p, x, y, z) : sdCap(p, x, y, z);
}

function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Signed distance of the blended shape. */
export function shapeDist(prims: readonly Prim[], k: number, x: number, y: number, z: number): number {
  let d = 1e9;
  for (const p of prims) d = smin(d, primDist(p, x, y, z), p.k ?? k);
  return d;
}

export interface Polygonized {
  positions: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
  skinIndex: Uint16Array;
  skinWeight: Float32Array;
  /** Which primitive is nearest each vertex (for colouring). */
  nearest: Int16Array;
}

/**
 * Surface nets over a regular grid of `cell` size covering the primitives' bounds.
 * `boneCount` sizes the per-vertex weight accumulator; weights fall off with the distance of each
 * primitive's surface relative to the nearest one (`sigma`), top four bones kept.
 */
export function polygonize(prims: readonly Prim[], k: number, cell: number, boneCount: number, sigma = 0.025, targetTris = 0): Polygonized {
  // Bounds.
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  for (const p of prims) {
    if (p.kind === 'ell') {
      x0 = Math.min(x0, p.c[0] - p.r[0]); x1 = Math.max(x1, p.c[0] + p.r[0]);
      y0 = Math.min(y0, p.c[1] - p.r[1]); y1 = Math.max(y1, p.c[1] + p.r[1]);
      z0 = Math.min(z0, p.c[2] - p.r[2]); z1 = Math.max(z1, p.c[2] + p.r[2]);
    } else {
      const r = Math.max(p.ra, p.rb);
      for (const q of [p.a, p.b]) {
        x0 = Math.min(x0, q[0] - r); x1 = Math.max(x1, q[0] + r);
        y0 = Math.min(y0, q[1] - r); y1 = Math.max(y1, q[1] + r);
        z0 = Math.min(z0, q[2] - r); z1 = Math.max(z1, q[2] + r);
      }
    }
  }
  const pad = cell * 2;
  x0 -= pad; y0 -= pad; z0 -= pad; x1 += pad; y1 += pad; z1 += pad;
  const nx = Math.ceil((x1 - x0) / cell) + 1;
  const ny = Math.ceil((y1 - y0) / cell) + 1;
  const nz = Math.ceil((z1 - z0) / cell) + 1;
  const at = (i: number, j: number, l: number) => i + nx * (j + ny * l);
  const f = new Float32Array(nx * ny * nz);
  for (let l = 0; l < nz; l++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) f[at(i, j, l)] = shapeDist(prims, k, x0 + i * cell, y0 + j * cell, z0 + l * cell);
  {
    const cellIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const cat = (i: number, j: number, l: number) => i + (nx - 1) * (j + (ny - 1) * l);
    const pos: number[] = [];
    const corners: [number, number, number][] = [];
    for (let c = 0; c < 8; c++) corners.push([c & 1, (c >> 1) & 1, (c >> 2) & 1]);
    const edges: [number, number][] = [
      [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    const v = new Float32Array(8);
    for (let l = 0; l < nz - 1; l++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          let inside = 0;
          for (let c = 0; c < 8; c++) {
            const q = corners[c];
            v[c] = f[at(i + q[0], j + q[1], l + q[2])];
            if (v[c] < 0) inside++;
          }
          if (inside === 0 || inside === 8) continue;
          let sx = 0, sy = 0, sz = 0, n = 0;
          for (const [a, b] of edges) {
            if (v[a] < 0 === v[b] < 0) continue;
            const t = v[a] / (v[a] - v[b]);
            const qa = corners[a];
            const qb = corners[b];
            sx += qa[0] + (qb[0] - qa[0]) * t;
            sy += qa[1] + (qb[1] - qa[1]) * t;
            sz += qa[2] + (qb[2] - qa[2]) * t;
            n++;
          }
          cellIdx[cat(i, j, l)] = pos.length / 3;
          pos.push(x0 + (i + sx / n) * cell, y0 + (j + sy / n) * cell, z0 + (l + sz / n) * cell);
        }
    const tri: number[] = [];
    const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      if (flip) tri.push(a, c, b, a, d, c);
      else tri.push(a, b, c, a, c, d);
    };
    for (let l = 1; l < nz - 1; l++)
      for (let j = 1; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const a = f[at(i, j, l)] < 0;
          if (a === f[at(i + 1, j, l)] < 0) continue;
          quad(cellIdx[cat(i, j - 1, l - 1)], cellIdx[cat(i, j, l - 1)], cellIdx[cat(i, j, l)], cellIdx[cat(i, j - 1, l)], !a);
        }
    for (let l = 1; l < nz - 1; l++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const a = f[at(i, j, l)] < 0;
          if (a === f[at(i, j + 1, l)] < 0) continue;
          quad(cellIdx[cat(i - 1, j, l - 1)], cellIdx[cat(i - 1, j, l)], cellIdx[cat(i, j, l)], cellIdx[cat(i, j, l - 1)], !a);
        }
    for (let l = 0; l < nz - 1; l++)
      for (let j = 1; j < ny - 1; j++)
        for (let i = 1; i < nx - 1; i++) {
          const a = f[at(i, j, l)] < 0;
          if (a === f[at(i, j, l + 1)] < 0) continue;
          quad(cellIdx[cat(i - 1, j - 1, l)], cellIdx[cat(i, j - 1, l)], cellIdx[cat(i, j, l)], cellIdx[cat(i - 1, j, l)], !a);
        }

    // Snap vertices onto the surface and take normals from the gradient.
    const nv = pos.length / 3;
    const P = new Float32Array(pos);
    const N = new Float32Array(nv * 3);
    const e = cell * 0.25;
    const grad = (x: number, y: number, z: number, out: Float32Array, o: number) => {
      out[o] = shapeDist(prims, k, x + e, y, z) - shapeDist(prims, k, x - e, y, z);
      out[o + 1] = shapeDist(prims, k, x, y + e, z) - shapeDist(prims, k, x, y - e, z);
      out[o + 2] = shapeDist(prims, k, x, y, z + e) - shapeDist(prims, k, x, y, z - e);
      const len = Math.hypot(out[o], out[o + 1], out[o + 2]) || 1;
      out[o] /= len;
      out[o + 1] /= len;
      out[o + 2] /= len;
    };
    for (let i = 0; i < nv; i++) {
      for (let it = 0; it < 2; it++) {
        const d = shapeDist(prims, k, P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
        grad(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N, i * 3);
        const step = Math.max(-cell, Math.min(cell, d));
        P[i * 3] -= N[i * 3] * step;
        P[i * 3 + 1] -= N[i * 3 + 1] * step;
        P[i * 3 + 2] -= N[i * 3 + 2] * step;
      }
      grad(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N, i * 3);
    }

    // Winding: make every triangle face along the surface normal.
    for (let t = 0; t < tri.length; t += 3) {
      const a = tri[t] * 3, b = tri[t + 1] * 3, c = tri[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
      const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      if (fx * (N[a] + N[b] + N[c]) + fy * (N[a + 1] + N[b + 1] + N[c + 1]) + fz * (N[a + 2] + N[b + 2] + N[c + 2]) < 0) {
        const tmp = tri[t + 1];
        tri[t + 1] = tri[t + 2];
        tri[t + 2] = tmp;
      }
    }

    // Decimate to the triangle budget, keeping vertices on the true surface.
    if (targetTris > 0 && tri.length / 3 > targetTris) {
      const d = decimate(P, N, tri, targetTris, (x, y, z) => shapeDist(prims, k, x, y, z), cell);
      return weigh(d.P, d.N, d.tri);
    }
    return weigh(P, N, tri);
  }

  function weigh(P: Float32Array, N: Float32Array, tri: ArrayLike<number>): Polygonized {
    const nv = P.length / 3;
    // Skin weights by relative primitive distance.
    const skinIndex = new Uint16Array(nv * 4);
    const skinWeight = new Float32Array(nv * 4);
    const nearest = new Int16Array(nv);
    const acc = new Float32Array(boneCount);
    const dist = new Float32Array(prims.length);
    for (let i = 0; i < nv; i++) {
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      let dmin = Infinity;
      for (let p = 0; p < prims.length; p++) {
        dist[p] = primDist(prims[p], x, y, z);
        if (dist[p] < dmin) {
          dmin = dist[p];
          nearest[i] = p;
        }
      }
      acc.fill(0);
      for (let p = 0; p < prims.length; p++) {
        const w = Math.exp(-(dist[p] - dmin) / sigma);
        if (w > 1e-3) acc[prims[p].bone] += w;
      }
      let total = 0;
      for (let s = 0; s < 4; s++) {
        let best = -1;
        let bw = 0;
        for (let b = 0; b < boneCount; b++) if (acc[b] > bw) {
          bw = acc[b];
          best = b;
        }
        if (best < 0) break;
        skinIndex[i * 4 + s] = best;
        skinWeight[i * 4 + s] = bw;
        total += bw;
        acc[best] = 0;
      }
      for (let s = 0; s < 4; s++) skinWeight[i * 4 + s] /= total || 1;
    }
    return { positions: P, normals: N, index: new Uint32Array(tri), skinIndex, skinWeight, nearest };
  }
}

/**
 * Edge-collapse decimation. Cheapest edges first, where cost is length scaled up by the normal
 * change across the edge (so tight curvature like a thin tail keeps its rings). Each collapse moves
 * the merged vertex onto the true surface (one Newton step on `sdf`) and is rejected if it would
 * flip a face or pinch the mesh (link condition).
 */
export function decimate(
  P0: Float32Array,
  N0: Float32Array,
  tri0: number[],
  target: number,
  sdf: (x: number, y: number, z: number) => number,
  cell: number,
): { P: Float32Array; N: Float32Array; tri: Uint32Array } {
  const nv = P0.length / 3;
  const P = Float32Array.from(P0);
  const N = Float32Array.from(N0);
  const T = Int32Array.from(tri0);
  const nt = T.length / 3;
  const triAlive = new Uint8Array(nt).fill(1);
  let alive = nt;
  const vTris: number[][] = Array.from({ length: nv }, () => []);
  for (let t = 0; t < nt; t++) for (let c = 0; c < 3; c++) vTris[T[t * 3 + c]].push(t);
  const vAlive = new Uint8Array(nv).fill(1);
  const ver = new Uint32Array(nv);

  // Binary min-heap of [cost, a, b, verA, verB].
  const heap: number[][] = [];
  const push = (e: number[]) => {
    heap.push(e);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): number[] | undefined => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length && last) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  const cost = (a: number, b: number) => {
    const dx = P[a * 3] - P[b * 3], dy = P[a * 3 + 1] - P[b * 3 + 1], dz = P[a * 3 + 2] - P[b * 3 + 2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const nd = N[a * 3] * N[b * 3] + N[a * 3 + 1] * N[b * 3 + 1] + N[a * 3 + 2] * N[b * 3 + 2];
    return len * (1 + 6 * (1 - nd));
  };
  const neighbours = (v: number, out: Set<number>) => {
    out.clear();
    for (const t of vTris[v]) if (triAlive[t]) for (let c = 0; c < 3; c++) if (T[t * 3 + c] !== v) out.add(T[t * 3 + c]);
    return out;
  };
  const na = new Set<number>();
  const nb = new Set<number>();
  for (let v = 0; v < nv; v++) {
    neighbours(v, na);
    for (const u of na) if (u > v) push([cost(v, u), v, u, 0, 0]);
  }
  const g = new Float32Array(3);
  const e = cell * 0.25;
  const faceN = (t: number, sub: number, by: number, px: number, py: number, pz: number, out: Float32Array) => {
    const ix = [T[t * 3], T[t * 3 + 1], T[t * 3 + 2]];
    const q = ix.map((i) => (i === sub || i === by ? [px, py, pz] : [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]]));
    const ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2];
    const vx = q[2][0] - q[0][0], vy = q[2][1] - q[0][1], vz = q[2][2] - q[0][2];
    out[0] = uy * vz - uz * vy;
    out[1] = uz * vx - ux * vz;
    out[2] = ux * vy - uy * vx;
    const l = Math.hypot(out[0], out[1], out[2]) || 1;
    out[0] /= l;
    out[1] /= l;
    out[2] /= l;
  };
  const before = new Float32Array(3);
  const after = new Float32Array(3);
  while (alive > target && heap.length) {
    const ed = pop()!;
    const a = ed[1];
    const b = ed[2];
    if (!vAlive[a] || !vAlive[b] || ver[a] !== ed[3] || ver[b] !== ed[4]) {
      // Stale entry: requeue with fresh versions if both ends still live and still adjacent.
      if (vAlive[a] && vAlive[b] && (ver[a] !== ed[3] || ver[b] !== ed[4]) && neighbours(a, na).has(b)) push([cost(a, b), a, b, ver[a], ver[b]]);
      continue;
    }
    // Link condition: exactly two shared neighbours (manifold edge).
    neighbours(a, na);
    if (!na.has(b)) continue;
    neighbours(b, nb);
    let shared = 0;
    for (const u of na) if (nb.has(u)) shared++;
    if (shared !== 2) continue;
    // Midpoint projected onto the surface.
    let px = (P[a * 3] + P[b * 3]) / 2, py = (P[a * 3 + 1] + P[b * 3 + 1]) / 2, pz = (P[a * 3 + 2] + P[b * 3 + 2]) / 2;
    g[0] = sdf(px + e, py, pz) - sdf(px - e, py, pz);
    g[1] = sdf(px, py + e, pz) - sdf(px, py - e, pz);
    g[2] = sdf(px, py, pz + e) - sdf(px, py, pz - e);
    const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    g[0] /= gl;
    g[1] /= gl;
    g[2] /= gl;
    const d = sdf(px, py, pz);
    px -= g[0] * d;
    py -= g[1] * d;
    pz -= g[2] * d;
    // Reject flips.
    let ok = true;
    for (const v of [a, b]) {
      for (const t of vTris[v]) {
        if (!triAlive[t]) continue;
        const ta = T[t * 3], tb = T[t * 3 + 1], tc = T[t * 3 + 2];
        if ((ta === a || tb === a || tc === a) && (ta === b || tb === b || tc === b)) continue;
        faceN(t, -1, -1, 0, 0, 0, before);
        faceN(t, a, b, px, py, pz, after);
        if (before[0] * after[0] + before[1] * after[1] + before[2] * after[2] < 0.3) {
          ok = false;
          break;
        }
      }
      if (!ok) break;
    }
    if (!ok) continue;
    // Collapse b into a.
    P[a * 3] = px;
    P[a * 3 + 1] = py;
    P[a * 3 + 2] = pz;
    N[a * 3] = g[0];
    N[a * 3 + 1] = g[1];
    N[a * 3 + 2] = g[2];
    for (const t of vTris[b]) {
      if (!triAlive[t]) continue;
      let hasA = false;
      for (let c = 0; c < 3; c++) if (T[t * 3 + c] === a) hasA = true;
      if (hasA) {
        triAlive[t] = 0;
        alive--;
      } else {
        for (let c = 0; c < 3; c++) if (T[t * 3 + c] === b) T[t * 3 + c] = a;
        vTris[a].push(t);
      }
    }
    vTris[a] = vTris[a].filter((t) => triAlive[t]);
    vAlive[b] = 0;
    vTris[b] = [];
    ver[a]++;
    for (const u of neighbours(a, na)) {
      ver[u]++;
      push([cost(a, u), a, u, ver[a], ver[u]]);
    }
  }
  // Compact.
  const remap = new Int32Array(nv).fill(-1);
  let n = 0;
  const outP: number[] = [];
  const outN: number[] = [];
  const outT: number[] = [];
  for (let t = 0; t < nt; t++) {
    if (!triAlive[t]) continue;
    for (let c = 0; c < 3; c++) {
      const v = T[t * 3 + c];
      if (remap[v] < 0) {
        remap[v] = n++;
        outP.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
        outN.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]);
      }
      outT.push(remap[v]);
    }
  }
  return { P: new Float32Array(outP), N: new Float32Array(outN), tri: new Uint32Array(outT) };
}
