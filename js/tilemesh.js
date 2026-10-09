// Geometria procedural das peças — versão "dark neon": mais arestas (esferas,
// tubos, frustos, chanfros, folhas), biomas redesenhados e partes animáveis.
// Três malhas por peça: "lit" (iluminada), "glow" (neon, sem luz) e "water"
// (shader de água animada). Cor por vértice, flat shading.
import { edgeAngle, vertexAngle, APO } from './hex.js';
import { RNG } from './rng.js';

const THREE = window.THREE;
export const TILE_H = 0.16;
const SCALE = 0.985;
const PI2 = Math.PI * 2;
const col = (h) => new THREE.Color(h);
const shade = (c, f) => c.clone().multiplyScalar(f);

export const PAL = {
  // Baldio herdou o estuque (chão claro, quase vazio, flores numa cor do arco-íris por peça) e o
  // Solarpunk voltou a ser verde vivo — os dois trocaram de chão, e continuam inconfundíveis.
  ground: { plain: '#9dbdd6', grass: '#cdb68c', cyber: '#14162e', solar: '#4fc43f', rock: '#9a6538', pool: '#0d5a4c' },
  sideOf: { plain: '#7896b0', grass: '#9a8360', cyber: '#23264a', solar: '#2f8a2c', rock: '#70471f', pool: '#1a6a5c' },
  rim: { plain: '#6fd2f5', grass: '#ffd98a', cyber: '#ff2bd6', solar: '#9dff4a', rock: '#ff9a3c', pool: '#2dffb8' },
  iris: ['#ff3b4f', '#ff8a1a', '#ffe02a', '#5cf04a', '#22c8ff', '#5a6bff', '#c45cff'], // flores do Baldio: UMA cor por peça
  lawn: ['#6fdc52', '#5fd048', '#82e85e'], meadow: ['#ffe45c', '#ff6fb5', '#ffffff', '#ff9a3c', '#c85cff'], sunflower: '#ffcf1f', sunCore: '#6b3a12',
  duck: '#ffd21f', duckShade: '#f0b400', duckBeak: '#ff7a1a', tugHull: ['#ff3b5c', '#ff7a1a', '#22c8ff', '#ffe02a'], tugCabin: '#f2f4fb',
  neon: ['#ff2bd6', '#22f3ff', '#ffe93a', '#ff7a1a', '#9dff2b', '#b66bff', '#ff3b5c', '#38ff9b'],
  // Uma peca de cidade sorteia UM esquema: dois matizes dominantes + um apoio raro.
  // Sem isso cada torre puxava uma cor de PAL.neon e o tile lia como confete.
  neonSchemes: [
    { key: '#22f3ff', accent: '#ff2bd6', warm: '#ffe93a' },
    { key: '#ff2bd6', accent: '#22f3ff', warm: '#ff7a1a' },
    { key: '#b66bff', accent: '#38ff9b', warm: '#ffe93a' },
    { key: '#ff3b5c', accent: '#ffe93a', warm: '#22f3ff' },
    { key: '#38ff9b', accent: '#b66bff', warm: '#ff7a1a' },
  ],
  warmWin: '#ffb35c', coolWin: '#5cc8ff',
  bld: ['#171a30', '#1d1935', '#141c2e', '#221733', '#1a2438', '#2a1730', '#14262c'],
  roof: ['#3a1226', '#122a33', '#28123f', '#3a1f12', '#4a162b'],
  ice: '#cfe6f5', iceDark: '#9dbfd4', crystal: '#bfe9ff', crystalGlow: '#9ff5ff', snow: '#e9f3fb', crack: '#3f9dc4', iceRock: ['#a7c9dd', '#8fb5cc', '#c2dcea', '#7ea6bf'], pine: '#2f7a63', pineDark: '#215c4c', iceHole: '#2dd9ff', // agulha escura: a neve entra por cima, em PAL.snow
  trunk: '#5b3a22', palmTrunk: '#7a5a3a', leaf: ['#1f8a3f', '#2ea44f', '#3fbf5a', '#55d46a', '#1d7a4a'], jungle: ['#176b35', '#1f8a3f', '#28a04a'],
  flower: ['#ff4fa3', '#ff8a3c', '#ffe45c', '#ff5c5c', '#c85cff'], ipe: ['#ffd21f', '#ffc21a', '#ff7fbf', '#c070ff', '#fff4f8'], // ipê amarelo (mais comum), rosa, roxo, branco
  // sucata a vapor do Baldio: latão, cobre, azinhavre e ferro — fosco, para não competir com o neon
  brass: ['#c8963e', '#b8873a', '#d4a24c'], copper: ['#b8673a', '#a85a32', '#c4774a'], patina: '#5fbfa8', iron: '#3a3632', steam: '#f2efe8',
  cream: '#efe7d3', glass: '#9fe3ff', vine: '#2f9e4f', panel: '#1b2f6b', panelGlow: '#5fa8ff', string: '#ffd27a',
  stucco: ['#efe7d3', '#e6d9bd', '#f2ece0', '#dcc9a8', '#e8dcc4'], stuccoShade: '#c9b998',
  terracotta: ['#c96f4a', '#b35a3c', '#d98a5c', '#a84f34'], wood: ['#9c6b40', '#8a5c36', '#b07d4e'], woodDark: '#6b4527',
  verdigris: '#5fbfa8', verdigrisDark: '#3d8a78', awning: ['#e08a3c', '#d4614a', '#5fa8c4', '#e0b45c', '#c96f8a'],
  soil: '#4a3524', planter: '#8a5c36', tank: '#c4cbd6', lantern: '#ffc76a',
  grass: '#7dc24a', grassDark: '#4f8a2a', grassRim: '#b8ff5c', tuft: ['#8fd35a', '#a6e06a', '#6fb43a', '#c9b46a'],
  rock: ['#a0673a', '#b87a45', '#8a5632', '#c48b52', '#7d4e2c'], rockDark: '#5a3620', rockLight: '#d9a066', ore: '#ffb347', oreGlow: '#ff9a3c', beacon: '#ff3b5c',
  // Mesopotâmia: tijolo cru, ocre queimado, lápis-lazúli e ouro (a paleta do Portal de Ishtar).
  // O marrom só vira "antigo" com esses três juntos: barro fosco, azul profundo e um ponto de dourado.
  brick: ['#c68a52', '#b57a45', '#d29a63', '#a66c3b'], brickDark: '#7c4c28', brickLight: '#e0b47e',
  lapis: '#26398f', lapisGlow: '#4f7bff', gold: '#d9a441', goldGlow: '#ffcf6e', glyph: '#ffc061',
  scrap: ['#7d828f', '#6c7280', '#8a8f9c'], rust: ['#9a5a34', '#874b2b', '#a8693f'], cloth: ['#d9c7a3', '#c98a5a', '#b5352b', '#e0b45c'],
  sandTrail: '#c39257', sandTrailDark: '#9c6d3c', oasisWater: '#12414d', reed: '#8fa356',
  snowTrail: '#dbeaf6', snowTrailDark: '#a8c4d8', inuksukStone: ['#6b7486', '#5a6273', '#7d8798', '#4e5666'], auroraCols: ['#38ff9b', '#22f3ff', '#b66bff', '#5fffd0'],
  camelHide: ['#c9a06a', '#b8905c', '#d8b077'], camelDark: '#8a6a42', camelRug: ['#b5352b', '#b5651d', '#6d3c98'],
  bearFur: '#fbf3e0', bearShade: '#ddcfb4', bearNose: '#2a2d3a',
  // O iéti puxa para o azul para não virar "urso grande" a três metros de distância.
  yetiFur: '#e2edf7', yetiShade: '#b6cde0', yetiSkin: '#54617d',
  birdBody: '#eef3fb', birdWing: '#dbe6f2', birdTip: '#2b3352', birdBeak: '#ffb347',
  concrete: '#4a4f66', curb: '#5c6280', hazard: '#ff7a1a', barrel: '#23262f', barrelRing: '#38ff9b', algae: '#5cffc4', pipe: '#6b7186',
  ballast: '#4a4e62', railSteel: '#c9cfe0', sleeper: '#3a2a20', catenary: '#22f3ff', station: '#2a2d44',
  train: '#f2f4fb', trainRoof: '#d9dde8', trainStripe: '#2b6cff', trainDark: '#1d2030', trainWin: '#7fd3ff',
  asphalt: '#262a3e', roadLine: '#22f3ff', dash: '#ffe36a', carColors: ['#ff2bd6', '#22f3ff', '#ffe93a', '#ff7a1a', '#f2f4fb', '#b66bff', '#ff3b5c'], carGlass: '#151a2e', headlight: '#fff6c0', tail: '#ff2a4a', post: '#2c3042', lampWarm: '#ffd27a', lampCool: '#9ff5ff',
};

// ---------- utilidades ----------
function rect(cx, cz, w, d, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry), hw = w / 2, hd = d / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
}
function chamfer(cx, cz, w, d, ry = 0, ch = 0.02) {
  const c = Math.cos(ry), s = Math.sin(ry), hw = w / 2, hd = d / 2, k = Math.min(ch, hw * 0.45, hd * 0.45);
  return [[-hw + k, -hd], [hw - k, -hd], [hw, -hd + k], [hw, hd - k], [hw - k, hd], [-hw + k, hd], [-hw, hd - k], [-hw, -hd + k]].map(([x, z]) => [cx + x * c - z * s, cz + x * s + z * c]);
}
function ngon(cx, cz, r, n, ry = 0) {
  const out = [];
  for (let i = 0; i < n; i++) { const a = ry + (i / n) * PI2; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return out;
}
function offsetLine(pts, d) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; let dx = 0, dz = 0;
    if (i > 0) { dx += p[0] - pts[i - 1][0]; dz += p[1] - pts[i - 1][1]; }
    if (i < pts.length - 1) { dx += pts[i + 1][0] - p[0]; dz += pts[i + 1][1] - p[1]; }
    const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
    out.push([p[0] - dz * d, p[1] + dx * d]);
  }
  return out;
}
function pathLength(p) { let L = 0; for (let i = 0; i < p.length - 1; i++) L += Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); return L; }
function pointAt(path, s) {
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (acc + L >= s || i === path.length - 2) {
      const t = Math.max(0, Math.min(1, (s - acc) / L));
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    acc += L;
  }
}
function samplePath(path, spacing, start = spacing / 2) {
  const L = pathLength(path), out = [];
  for (let s = start; s < L - start * 0.5; s += spacing) out.push(pointAt(path, s));
  return out;
}
function distToPath(path, x, z) {
  let best = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}
const v3 = { sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; } };

class Builder {
  constructor() { this.lit = { pos: [], col: [] }; this.glow = { pos: [], col: [] }; this.water = { pos: [], col: [] }; this.anims = []; this.buildings = 0; }
  tri(tgt, a, b, c, color, hint) {
    if (this.yf) { const f = this.yf; a = [a[0], a[1] + f(a[0], a[2]), a[2]]; b = [b[0], b[1] + f(b[0], b[2]), b[2]]; c = [c[0], c[1] + f(c[0], c[2]), c[2]]; } // rampa do viaduto
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { const t = b; b = c; c = t; }
    tgt.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    tgt.col.push(color.r, color.g, color.b, color.r, color.g, color.b, color.r, color.g, color.b);
  }
  quad(tgt, a, b, c, d, color, hint) { this.tri(tgt, a, b, c, color, hint); this.tri(tgt, a, c, d, color, hint); }
  extrude(tgt, poly, y0, h, color, opts = {}) {
    const n = poly.length; let cx = 0, cz = 0;
    for (const p of poly) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
    const top = [cx, y0 + h, cz], topCol = opts.topCol || color, sideCol = opts.sideCol || color;
    for (let i = 0; i < n; i++) {
      const p = poly[i], q = poly[(i + 1) % n];
      if (!opts.noTop) this.tri(tgt, top, [p[0], y0 + h, p[1]], [q[0], y0 + h, q[1]], topCol, [0, 1, 0]);
      this.quad(tgt, [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y0 + h, q[1]], [p[0], y0 + h, p[1]], opts.sideShade ? shade(sideCol, 0.85 + 0.3 * ((i % 2))) : sideCol, [(p[0] + q[0]) / 2 - cx, 0, (p[1] + q[1]) / 2 - cz]);
    }
  }
  cone(tgt, cx, y0, cz, r, h, color, segs = 8, ry = 0) {
    const apex = [cx, y0 + h, cz];
    for (let i = 0; i < segs; i++) {
      const a0 = ry + (i / segs) * PI2, a1 = ry + ((i + 1) / segs) * PI2, m = (a0 + a1) / 2;
      this.tri(tgt, apex, [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], shade(color, 0.9 + 0.2 * Math.abs(Math.cos(m))), [Math.cos(m), r / h, Math.sin(m)]);
    }
  }
  frustum(tgt, cx, y0, cz, rb, rt, h, segs, color, ry = 0, opts = {}) {
    for (let i = 0; i < segs; i++) {
      const a0 = ry + (i / segs) * PI2, a1 = ry + ((i + 1) / segs) * PI2, m = (a0 + a1) / 2;
      const b0 = [cx + Math.cos(a0) * rb, y0, cz + Math.sin(a0) * rb], b1 = [cx + Math.cos(a1) * rb, y0, cz + Math.sin(a1) * rb];
      const t0 = [cx + Math.cos(a0) * rt, y0 + h, cz + Math.sin(a0) * rt], t1 = [cx + Math.cos(a1) * rt, y0 + h, cz + Math.sin(a1) * rt];
      const sc = opts.flat ? color : shade(color, 0.88 + 0.24 * Math.abs(Math.cos(m)));
      const k = opts.inner ? -1 : 1;
      this.quad(tgt, b0, b1, t1, t0, sc, [k * Math.cos(m), (k * (rb - rt)) / Math.max(h, 1e-4), k * Math.sin(m)]);
      if (rt > 0 && !opts.noTop) this.tri(tgt, [cx, y0 + h, cz], t0, t1, opts.topCol || color, [0, 1, 0]);
      if (opts.bottom) this.tri(tgt, [cx, y0, cz], b0, b1, opts.bottom, [0, -1, 0]);
    }
  }
  sphere(tgt, cx, cy, cz, r, color, segs = 10, rings = 6, opts = {}) {
    const sy = opts.sy || 1, p0s = opts.dome ? 0 : -Math.PI / 2, p1s = Math.PI / 2;
    const P = (p, t) => [cx + r * Math.cos(p) * Math.cos(t), cy + r * sy * Math.sin(p), cz + r * Math.cos(p) * Math.sin(t)];
    for (let j = 0; j < rings; j++) {
      const p0 = p0s + ((p1s - p0s) * j) / rings, p1 = p0s + ((p1s - p0s) * (j + 1)) / rings, pm = (p0 + p1) / 2;
      const t = (j + 0.5) / rings;
      // `under` clareia as faces viradas para baixo: elas só pegam a cor de chão da hemisférica
      // e, sem isso, a barriga dos bichos fica preta quando a câmera desce.
      const c = shade(color, (0.85 + 0.3 * t) * (opts.under ? 1 + opts.under * (1 - t) : 1));
      for (let i = 0; i < segs; i++) {
        const t0 = (i / segs) * PI2, t1 = ((i + 1) / segs) * PI2, tm = (t0 + t1) / 2;
        const a = P(p0, t0), b = P(p0, t1), cc = P(p1, t1), d = P(p1, t0), hint = [Math.cos(pm) * Math.cos(tm), Math.sin(pm), Math.cos(pm) * Math.sin(tm)];
        if (j === rings - 1) this.tri(tgt, a, b, cc, c, hint);
        else if (j === 0 && !opts.dome) this.tri(tgt, a, cc, d, c, hint);
        else this.quad(tgt, a, b, cc, d, c, hint);
      }
    }
  }
  // A costura do tubo é transportada de anel em anel (parallel transport). Escolher a referência
  // ponto a ponto (`dir` vertical ou não) fazia o anel girar 90 graus no meio de uma curva que
  // cruzasse a vertical — era o vinco que aparecia no pescoço dos bichos.
  tube(tgt, pts, radii, segs, color, opts = {}) {
    let prevU = null;
    const rings = pts.map((p, i) => {
      const dir = v3.norm(i < pts.length - 1 ? v3.sub(pts[i + 1], p) : v3.sub(p, pts[i - 1]));
      let u;
      if (prevU) {
        const d = prevU[0] * dir[0] + prevU[1] * dir[1] + prevU[2] * dir[2];
        const pr = [prevU[0] - dir[0] * d, prevU[1] - dir[1] * d, prevU[2] - dir[2] * d];
        u = Math.hypot(pr[0], pr[1], pr[2]) > 1e-5 ? v3.norm(pr) : v3.norm(v3.cross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      } else u = v3.norm(v3.cross(dir, Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      prevU = u;
      const v = v3.cross(dir, u), r = radii[Math.min(i, radii.length - 1)];
      const ring = [];
      for (let k = 0; k < segs; k++) { const a = (k / segs) * PI2; ring.push([p[0] + (u[0] * Math.cos(a) + v[0] * Math.sin(a)) * r, p[1] + (u[1] * Math.cos(a) + v[1] * Math.sin(a)) * r, p[2] + (u[2] * Math.cos(a) + v[2] * Math.sin(a)) * r]); }
      return ring;
    });
    for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < segs; k++) {
      const k1 = (k + 1) % segs, a = rings[i][k], b = rings[i][k1], c = rings[i + 1][k1], d = rings[i + 1][k];
      const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], cen = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2, (pts[i][2] + pts[i + 1][2]) / 2];
      const rad = v3.sub(mid, cen), ny = rad[1] / (Math.hypot(rad[0], rad[1], rad[2]) || 1);
      this.quad(tgt, a, b, c, d, shade(color, (0.85 + 0.3 * (k % 2)) * (opts.under ? 1 + opts.under * Math.max(0, -ny) : 1)), rad);
    }
    if (opts.capEnd) { const last = pts.length - 1, ring = rings[last], dir = v3.norm(v3.sub(pts[last], pts[last - 1])); for (let k = 0; k < segs; k++) this.tri(tgt, pts[last], ring[k], ring[(k + 1) % segs], color, dir); }
  }
  leaf(tgt, base, ang, len, width, color, opts = {}) {
    const segs = opts.segs || 4, lift = opts.lift ?? 0.1, droop = opts.droop ?? 0.3, px = -Math.sin(ang), pz = Math.cos(ang), L = [], R = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs, d = len * t, w = width * Math.sin(Math.PI * (0.08 + 0.92 * t)) * (opts.taper ?? 1) + (i === 0 ? 0.004 : 0);
      const y = base[1] + lift * t - droop * t * t, x = base[0] + Math.cos(ang) * d, z = base[2] + Math.sin(ang) * d;
      L.push([x + px * w / 2, y, z + pz * w / 2]); R.push([x - px * w / 2, y, z - pz * w / 2]);
    }
    const back = shade(color, 0.7);
    for (let i = 0; i < segs; i++) { this.quad(tgt, L[i], R[i], R[i + 1], L[i + 1], color, [0, 1, 0]); this.quad(tgt, L[i], R[i], R[i + 1], L[i + 1], back, [0, -1, 0]); }
  }
  annulus(tgt, cx, y, cz, ri, ro, segs, color) {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * PI2, a1 = ((i + 1) / segs) * PI2;
      this.quad(tgt, [cx + Math.cos(a0) * ro, y, cz + Math.sin(a0) * ro], [cx + Math.cos(a1) * ro, y, cz + Math.sin(a1) * ro], [cx + Math.cos(a1) * ri, y, cz + Math.sin(a1) * ri], [cx + Math.cos(a0) * ri, y, cz + Math.sin(a0) * ri], color, [0, 1, 0]);
    }
  }
  strip(tgt, A, B, y, color) {
    for (let i = 0; i < A.length - 1; i++)
      this.quad(tgt, [A[i][0], y, A[i][1]], [B[i][0], y, B[i][1]], [B[i + 1][0], y, B[i + 1][1]], [A[i + 1][0], y, A[i + 1][1]], color, [0, 1, 0]);
  }
  ribbon(tgt, pts, w, y, color) { this.strip(tgt, offsetLine(pts, w / 2), offsetLine(pts, -w / 2), y, color); }
  wall(tgt, pts, y0, y1, color, side) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1], dx = q[0] - p[0], dz = q[1] - p[1];
      this.quad(tgt, [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], color, [-dz * side, 0, dx * side]);
    }
  }
  panel(tgt, cx, y0, cz, w, h, ang, color, thick = 0.012) { this.extrude(tgt, rect(cx, cz, thick, w, ang), y0, h, color); }
  build() {
    const mk = (t) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(t.pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(t.col, 3));
      g.computeVertexNormals();
      return g;
    };
    return { lit: mk(this.lit), glow: mk(this.glow), water: mk(this.water), anims: this.anims, buildings: this.buildings };
  }
}

function edgePoint(e, R = APO * SCALE) { const a = edgeAngle(e); return [Math.cos(a) * R, Math.sin(a) * R]; }
// pontos ao longo do raio da aresta `e`, do raio r0 ao r1 (fração do apótema)
function radial(e, r0, r1, n = 4) { const P = edgePoint(e), out = []; for (let i = 0; i <= n; i++) { const t = r0 + (r1 - r0) * (i / n); out.push([P[0] * t, P[1] * t]); } return out; }
function curvePath(A, B, straight) {
  const pts = [], N = straight ? 4 : 12;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    if (straight) pts.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
    else { const u = 1 - t; pts.push([u * u * A[0] + t * t * B[0], u * u * A[1] + t * t * B[1]]); }
  }
  return pts;
}
// Traçado do conector: 'line' (2 saídas), 'fork' (3 saídas, junção no centro) ou 'end' (1 saída, terminal no centro).
// `polys` servem para afastar cenário; `routes` são os caminhos que os veículos percorrem (to = -1: ponto final).
function connectorLayout(conn) {
  const ex = conn.exits;
  const withL = (r) => { r.L = pathLength(r.pts); return r; };
  if (ex.length === 2) {
    const straight = (ex[1] - ex[0] + 6) % 6 === 3, pts = curvePath(edgePoint(ex[0]), edgePoint(ex[1]), straight);
    return { kind: 'line', exits: ex, polys: [pts], routes: [withL({ from: ex[0], to: ex[1], pts })] };
  }
  if (ex.length === 1) {
    const pts = radial(ex[0], 1, 0.22);
    return { kind: 'end', exits: ex, polys: [pts], routes: [withL({ from: ex[0], to: -1, pts })], end: { x: 0, z: 0, a: edgeAngle(ex[0]) } };
  }
  const n = ex.length, branches = ex.map((e) => radial(e, 0, 1)); // bifurcação (3 saídas) ou cruzamento (4)
  const routes = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) routes.push(withL({ from: ex[i], to: ex[j], pts: radial(ex[i], 1, 0.12, 3).concat([[0, 0]], radial(ex[j], 0.12, 1, 3)) }));
  return { kind: 'fork', exits: ex, polys: branches, routes };
}
function distToPolys(polys, x, z) { let b = Infinity; for (const p of polys) b = Math.min(b, distToPath(p, x, z)); return b; }
function sectorPoints(rng, i, count, occupied, polys, minDist, keep) {
  const a = edgeAngle(i), dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, out = [];
  let tries = 0;
  while (out.length < count && tries < 48) {
    tries++;
    const t = rng.range(0.3, 0.8) * APO, hw = Math.max(0, t * 0.577 * 0.8 - 0.05), s = rng.range(-hw, hw);
    const x = dx * t + px * s, z = dz * t + pz * s;
    if (polys && distToPolys(polys, x, z) < 0.24) continue;
    if (keep && !keep(x, z)) continue; // não plantar em cima da trilha da fauna
    let ok = true;
    for (const o of occupied) if (Math.hypot(o.x - x, o.z - z) < o.r + minDist) { ok = false; break; }
    if (!ok) continue;
    const p = { x, z, a, r: minDist * 0.5 };
    occupied.push(p); out.push(p);
  }
  return out;
}
const H = TILE_H;

// ---------- TRILHAS DE FAUNA ----------
// Camelos e ursos vão do meio de uma aresta do seu bioma ao meio de outra. Quando a peça tem um
// marco (ou um entroncamento de conector) ocupando o miolo, a rota não corta pelo centro: ela
// contorna por um anel — o que dá a imagem certa, a caravana circundando o monumento.
// `WALK_GROUND` são os biomas que ganham trilha; pássaros voam e não precisam de nenhuma.
const WALK_GROUND = { rock: 'rock', plain: 'plain' };
const HUB_R = 0.5;                 // raio do anel quando o centro está ocupado
const TRAIL_R0 = 0.17, PLAZA_R = 0.21, RAD = APO * SCALE;
const SPUR_CLEAR = 0.125, RING_CLEAR = 0.095;
// Rota (coordenadas relativas ao centro da peça, já na orientação do mundo) entre duas arestas.
export function walkRoute(a, b, hub) {
  const P = (ang, r) => [Math.cos(ang) * r, Math.sin(ang) * r], aa = edgeAngle(a), ab = edgeAngle(b);
  if (a === b) { const inner = Math.max(hub, 0.26); return [P(aa, APO), P(aa, inner), P(aa, APO)]; } // sem saída: entra, dá meia-volta e sai pelo mesmo lado
  if (!hub) return [P(aa, APO), [0, 0], P(ab, APO)];
  let d = ab - aa;
  while (d > Math.PI) d -= PI2;
  while (d < -Math.PI) d += PI2;
  const n = Math.max(1, Math.round(Math.abs(d) / 0.35)), pts = [P(aa, APO)];
  for (let i = 0; i <= n; i++) pts.push(P(aa + (d * i) / n, hub));
  pts.push(P(ab, APO));
  return pts;
}
function ringPath(hub, n = 20) { const o = []; for (let i = 0; i <= n; i++) { const a = (i / n) * PI2; o.push([Math.cos(a) * hub, Math.sin(a) * hub]); } return o; }
// Desenha a trilha e devolve o teste de espaço livre usado por sectorPoints/groundDetail.
function walkTrails(B, rng, tile, walk, hub, draw) {
  const spurs = [];
  for (let i = 0; i < 6; i++) {
    if (!walk[i]) continue;
    const path = radial(i, Math.max(hub, TRAIL_R0) / RAD, 1, 5);
    spurs.push(path);
    if (!draw) continue;
    const sand = tile.ground[i] === 'rock';
    const c = col(sand ? PAL.sandTrail : PAL.snowTrail), cd = col(sand ? PAL.sandTrailDark : PAL.snowTrailDark);
    B.ribbon(B.lit, path, 0.105, H + 0.0018, c);
    for (const sd of [1, -1]) B.ribbon(B.lit, offsetLine(path, sd * 0.05), 0.013, H + 0.0024, cd); // sulcos
    let k = 0;
    for (const s of samplePath(path, 0.08, 0.05)) { // pegadas alternadas
      const sg = k++ % 2 ? 1 : -1, nx = -Math.sin(s.a) * 0.022 * sg, nz = Math.cos(s.a) * 0.022 * sg;
      B.extrude(B.lit, ngon(s.x + nx, s.z + nz, rng.range(0.008, 0.012), 5, s.a), H + 0.0026, 0.0012, cd);
    }
    const a0 = vertexAngle(i), a1 = vertexAngle(i + 1);
    if (hub > 0) { // trecho do anel sob este setor
      const arc = [];
      for (let j = 0; j <= 4; j++) { const a = a0 + ((a1 - a0) * j) / 4; arc.push([Math.cos(a) * hub, Math.sin(a) * hub]); }
      B.ribbon(B.lit, arc, 0.105, H + 0.0016, c);
      for (const sd of [1, -1]) B.ribbon(B.lit, offsetLine(arc, sd * 0.05), 0.013, H + 0.0022, cd);
    } else for (let j = 0; j < 3; j++) { // largo central onde as trilhas se encontram
      const b0 = a0 + ((a1 - a0) * j) / 3, b1 = a0 + ((a1 - a0) * (j + 1)) / 3;
      B.tri(B.lit, [0, H + 0.0012, 0], [Math.cos(b0) * PLAZA_R, H + 0.0012, Math.sin(b0) * PLAZA_R], [Math.cos(b1) * PLAZA_R, H + 0.0012, Math.sin(b1) * PLAZA_R], c, [0, 1, 0]);
    }
  }
  const ring = spurs.length && hub > 0 ? ringPath(hub) : null;
  return (x, z) => (!spurs.length || distToPolys(spurs, x, z) > SPUR_CLEAR) && (!ring || distToPath(ring, x, z) > RING_CLEAR);
}

// ---------- GELO: morros gelados, pinheiros nevados, iglus, buracos no gelo ----------
const iceCol = (rng) => col(rng.pick(PAL.iceRock));
function icePeak(B, rng, p, s = 1) {
  // Maciço de gelo em degraus, com a neve só no coroamento. O cone liso que estava aqui repetia
  // a silhueta do pinheiro e do cristal — o gelo inteiro lia como um campo de triângulos iguais.
  const c = iceCol(rng), ry = rng.float() * PI2, segs = 5 + rng.int(2);
  const r0 = rng.range(0.1, 0.15) * s, h0 = rng.range(0.09, 0.15) * s;
  B.frustum(B.lit, p.x, H, p.z, r0, r0 * rng.range(0.62, 0.78), h0, segs, c, ry, { topCol: shade(c, 1.2) });
  const ox = rng.range(-0.03, 0.03) * s, oz = rng.range(-0.03, 0.03) * s;
  const r1 = r0 * rng.range(0.55, 0.72), h1 = rng.range(0.07, 0.14) * s;
  B.frustum(B.lit, p.x + ox, H + h0, p.z + oz, r1, r1 * rng.range(0.45, 0.66), h1, segs, shade(c, 1.1), ry + 0.8, { topCol: col(PAL.snow) });
  let top = H + h0 + h1, tx = p.x + ox, tz = p.z + oz, tr = r1;
  if (rng.chance(0.65)) { // lasca do cume, fora do eixo
    const r2 = r1 * rng.range(0.42, 0.6), h2 = rng.range(0.06, 0.14) * s;
    B.frustum(B.lit, p.x + ox * 1.9, top, p.z + oz * 1.9, r2, r2 * rng.range(0.1, 0.4), h2, segs, shade(c, 0.94), ry + 1.5, { topCol: col(PAL.snow) });
    top += h2; tx = p.x + ox * 1.9; tz = p.z + oz * 1.9; tr = r2;
  }
  B.sphere(B.lit, tx, top - 0.008, tz, tr * 0.78, col(PAL.snow), segs, 3, { dome: true, sy: 0.5 }); // carga de neve no topo
  for (let k = 0, n = 1 + rng.int(2); k < n; k++) { // contrafortes
    const ang = ry + rng.float() * PI2, d = r0 * rng.range(0.7, 1.0);
    B.frustum(B.lit, p.x + Math.cos(ang) * d, H, p.z + Math.sin(ang) * d, r0 * rng.range(0.3, 0.46), r0 * 0.1, h0 * rng.range(0.4, 0.8), 5, shade(c, rng.range(0.86, 1.02)), ang, { topCol: col(PAL.snow) });
  }
  if (rng.chance(0.5)) { const ang = ry + rng.float() * PI2; B.panel(B.glow, p.x + Math.cos(ang) * r0 * 0.55, H + (top - H) * 0.14, p.z + Math.sin(ang) * r0 * 0.55, 0.022, (top - H) * 0.24, ang + Math.PI / 2, col(PAL.crystalGlow), 0.006); } // veio de cristal
}
function iceRidge(B, rng, p) { // cordilheira: três morrinhos em fila
  const ang = p.a + Math.PI / 2 + rng.range(-0.4, 0.4);
  for (let k = 0; k < 3; k++) { const t = (k - 1) * 0.11; icePeak(B, rng, { x: p.x + Math.cos(ang) * t, z: p.z + Math.sin(ang) * t, a: p.a }, k === 1 ? 0.9 : 0.6); }
}
function snowPine(B, rng, x, z, s = 1) {
  // Conífera de agulha escura com a neve pousada por cima. Antes a árvore era branca como o chão
  // e o gelo — sem o contraste de cor ela desaparecia e só sobrava mais um triângulo claro.
  const h = rng.range(0.18, 0.32) * s, narrow = rng.chance(0.4), tiers = 3 + rng.int(2);
  const c = col(PAL.pine), d = col(PAL.pineDark), sn = col(PAL.snow);
  B.extrude(B.lit, ngon(x, z, 0.012 * s, 5), H, h * 0.28, col(PAL.trunk));
  for (let k = 0; k < tiers; k++) {
    const f = k / tiers, r = (narrow ? 0.056 : 0.08) * (1 - f * 0.6) * s, y = H + h * (0.16 + f * 0.74), th = h * (0.36 - f * 0.05);
    B.cone(B.lit, x, y, z, r, th, k % 2 ? d : c, 6, k * 0.5 + rng.float());
    B.cone(B.lit, x, y + th * 0.5, z, r * 0.6, th * 0.56, sn, 6, k * 0.5); // neve acumulada no galho
  }
  if (rng.chance(0.25)) B.sphere(B.glow, x, H + h * 1.04, z, 0.011 * s, col(rng.pick(PAL.neon)), 6, 3); // estrela de neon
}
// Seracs: blocos de gelo empurrados e tombados. Massa ortogonal azul — o contraponto de
// silhueta num bioma que só tinha cone (pinheiro, pico, cristal).
function seracs(B, rng, p) {
  const ang = p.a + rng.range(-0.8, 0.8);
  for (let k = 0, n = 3 + rng.int(3); k < n; k++) {
    const a2 = ang + rng.range(-1.3, 1.3), dd = rng.range(0, 0.075);
    const x = p.x + Math.cos(a2) * dd, z = p.z + Math.sin(a2) * dd;
    const w = rng.range(0.04, 0.075), de = rng.range(0.032, 0.058), hh = rng.range(0.05, 0.17);
    const c = shade(iceCol(rng), rng.range(0.92, 1.12)), ry = a2 + rng.range(-0.7, 0.7);
    B.extrude(B.lit, rect(x, z, w, de, ry), H - rng.range(0, 0.014), hh, c, { topCol: col(PAL.snow), sideShade: true });
    if (rng.chance(0.45)) B.panel(B.glow, x + Math.cos(ry) * (w / 2 + 0.001), H + hh * 0.16, z + Math.sin(ry) * (w / 2 + 0.001), de * 0.5, hh * 0.44, ry, shade(col(PAL.crystalGlow), 0.55), 0.004); // fenda acesa
  }
}
function pines(B, rng, p) { for (let k = 0, n = 2 + rng.int(2); k < n; k++) snowPine(B, rng, p.x + rng.range(-0.07, 0.07), p.z + rng.range(-0.07, 0.07), rng.range(0.8, 1.2)); }
function igloo(B, rng, p, sc = 1) {
  const ry = p.a + Math.PI + rng.range(-0.4, 0.4), c = Math.cos(ry), s = Math.sin(ry), r = rng.range(0.07, 0.09) * sc, snow = col(PAL.snow);
  B.sphere(B.lit, p.x, H, p.z, r, snow, 10, 5, { dome: true, sy: 0.75 });
  for (const ph of [0.35, 0.8]) B.annulus(B.lit, p.x, H + r * 0.75 * Math.sin(ph), p.z, r * Math.cos(ph) * 0.96, r * Math.cos(ph) * 1.03, 10, shade(snow, 0.84)); // fiadas de blocos
  B.sphere(B.lit, p.x + c * r * 0.85, H, p.z + s * r * 0.85, r * 0.45, shade(snow, 0.95), 8, 4, { dome: true, sy: 0.9 }); // túnel de entrada
  B.panel(B.glow, p.x + c * (r * 0.85 + r * 0.36), H + 0.004, p.z + s * (r * 0.85 + r * 0.36), 0.034 * sc, 0.028 * sc, ry, col(rng.pick(['#ffb35c', '#ff2bd6', '#22f3ff'])), 0.006); // porta iluminada
  B.annulus(B.glow, p.x, H + 0.004, p.z, r + 0.004, r + 0.018, 12, col(PAL.crystalGlow));
  if (sc > 0.85 && rng.chance(0.45)) { B.extrude(B.lit, ngon(p.x - s * 0.02, p.z + c * 0.02, 0.005, 5), H + r * 0.7, 0.09, col(PAL.post)); B.sphere(B.glow, p.x - s * 0.02, H + r * 0.7 + 0.095, p.z + c * 0.02, 0.009, col('#ff3b5c'), 6, 3); } // antena
}
function iceHole(B, rng, p) { // buraco no gelo com luz saindo de dentro
  const r = rng.range(0.06, 0.09);
  B.annulus(B.lit, p.x, H + 0.004, p.z, r, r + 0.03, 10, col(PAL.iceDark));
  B.extrude(B.glow, ngon(p.x, p.z, r, 10), H - 0.01, 0.012, col(PAL.iceHole));
  for (let k = 0; k < 3; k++) { const ang = rng.float() * PI2; B.sphere(B.lit, p.x + Math.cos(ang) * (r + 0.04), H, p.z + Math.sin(ang) * (r + 0.04), rng.range(0.012, 0.024), col(PAL.snow), 6, 3, { dome: true, sy: 0.7 }); } // blocos soltos
}
function snowbot(B, rng, p) { // boneco de neve robô
  const c = col(PAL.snow), ry = p.a + Math.PI, cx = Math.cos(ry), cz = Math.sin(ry);
  B.sphere(B.lit, p.x, H + 0.055, p.z, 0.058, c, 8, 4); B.sphere(B.lit, p.x, H + 0.145, p.z, 0.044, c, 8, 4); B.sphere(B.lit, p.x, H + 0.212, p.z, 0.032, c, 8, 4);
  B.panel(B.glow, p.x + cx * 0.03, H + 0.208, p.z + cz * 0.03, 0.03, 0.009, ry, col('#22f3ff'), 0.006); // visor
  for (let k = 0; k < 3; k++) B.sphere(B.glow, p.x + cx * 0.042, H + 0.12 + k * 0.02, p.z + cz * 0.042, 0.005, col('#ff3b5c'), 5, 3); // botões
  B.extrude(B.lit, ngon(p.x, p.z, 0.03, 8), H + 0.24, 0.028, col('#2a2d3a')); B.annulus(B.lit, p.x, H + 0.241, p.z, 0.03, 0.042, 8, col('#2a2d3a')); // cartola
  for (const sd of [1, -1]) B.tube(B.lit, [[p.x - cz * sd * 0.04, H + 0.15, p.z + cx * sd * 0.04], [p.x - cz * sd * 0.1, H + 0.2, p.z + cx * sd * 0.1]], [0.005, 0.004], 4, col(PAL.trunk)); // braços
}
function inuksuk(B, rng, p) { // marco de pedras empilhadas: o "poste indicativo" do gelo
  const c = col(rng.pick(PAL.inuksukStone)), ry = p.a + rng.range(-0.5, 0.5), s = rng.range(0.85, 1.25);
  const blk = (y, w, d, hh) => B.extrude(B.lit, rect(p.x, p.z, w * s, d * s, ry), H + y * s, hh * s, shade(c, rng.range(0.86, 1.14)), { topCol: col(PAL.snow), sideShade: true });
  blk(0, 0.05, 0.062, 0.05); blk(0.05, 0.045, 0.09, 0.028); blk(0.078, 0.03, 0.17, 0.026);
  blk(0.104, 0.042, 0.05, 0.032); blk(0.136, 0.05, 0.072, 0.04);
  B.panel(B.glow, p.x + Math.cos(ry) * 0.026 * s, H + 0.148 * s, p.z + Math.sin(ry) * 0.026 * s, 0.04 * s, 0.011 * s, ry, col(PAL.crystalGlow), 0.005); // visor aceso
}

function fishingHut(B, rng, p) { // cabana de pesca no gelo, com buraco e vara
  const ry = p.a + Math.PI + rng.range(-0.4, 0.4), c = Math.cos(ry), s = Math.sin(ry);
  const wood = col(rng.pick(PAL.wood)), w = 0.1, d = 0.086, h = 0.072;
  B.extrude(B.lit, rect(p.x, p.z, w, d, ry), H, h, wood, { topCol: shade(wood, 1.1), sideShade: true });
  prismRoof(B, B.lit, p.x, p.z, w + 0.018, d + 0.018, ry, H + h, 0.042, col(PAL.terracotta[3]));
  B.extrude(B.lit, rect(p.x, p.z, w + 0.022, d * 0.5, ry), H + h + 0.04, 0.007, col(PAL.snow)); // neve acumulada na cumeeira
  B.panel(B.glow, p.x + c * (w / 2 + 0.003), H + 0.01, p.z + s * (w / 2 + 0.003), 0.048, 0.04, ry, col(PAL.lantern), 0.005);
  B.extrude(B.lit, ngon(p.x - s * 0.062, p.z + c * 0.062, 0.006, 6), H, 0.11, col(PAL.post));
  B.sphere(B.glow, p.x - s * 0.062, H + 0.118, p.z + c * 0.062, 0.012, col(PAL.lampWarm), 6, 3);
  const hx = p.x + c * 0.135, hz = p.z + s * 0.135; // buraco de pesca
  B.annulus(B.lit, hx, H + 0.004, hz, 0.026, 0.046, 9, col(PAL.iceDark));
  B.extrude(B.glow, ngon(hx, hz, 0.026, 9), H - 0.006, 0.01, col(PAL.iceHole));
  B.tube(B.lit, [[p.x + c * 0.062, H + 0.052, p.z + s * 0.062], [hx, H + 0.062, hz]], [0.0045, 0.002], 4, col(PAL.woodDark)); // vara
}

function sled(B, rng, p) { // trenó carregado, patins acesos
  const ry = p.a + rng.range(-0.7, 0.7), c = Math.cos(ry), s = Math.sin(ry), px = -s, pz = c, wood = col(rng.pick(PAL.wood));
  for (const sd of [1, -1]) {
    B.extrude(B.lit, rect(p.x + px * sd * 0.028, p.z + pz * sd * 0.028, 0.115, 0.009, ry), H + 0.012, 0.009, col(PAL.woodDark));
    B.extrude(B.glow, rect(p.x + px * sd * 0.028, p.z + pz * sd * 0.028, 0.115, 0.012, ry), H + 0.007, 0.004, shade(col(PAL.crystalGlow), 0.8));
  }
  B.extrude(B.lit, rect(p.x, p.z, 0.095, 0.058, ry), H + 0.021, 0.011, wood, { topCol: shade(wood, 1.14) });
  for (let k = 0, n = 2 + rng.int(2); k < n; k++) B.extrude(B.lit, chamfer(p.x + rng.range(-0.028, 0.028), p.z + rng.range(-0.016, 0.016), 0.034, 0.03, ry + rng.range(-0.5, 0.5), 0.006), H + 0.032, rng.range(0.02, 0.042), col(rng.pick(['#6b4527', '#8a5c36', '#4a4f66'])));
  B.extrude(B.lit, ngon(p.x + c * 0.056, p.z + s * 0.056, 0.005, 5), H + 0.021, 0.05, col(PAL.post));
  B.sphere(B.glow, p.x + c * 0.056, H + 0.075, p.z + s * 0.056, 0.01, col(PAL.lampWarm), 6, 3);
}

// Cortina de aurora: UMA folha translúcida e ondulada (não fitas empilhadas — os retângulos de neon
// flutuando liam como um vulto glitchado). Aqui só se registra onde ela fica; a malha e o shader
// aditivo que a faz ondular e esmaecer para cima estão em main.js (buildAuroraGeometry + auroraMat).
function aurora(B, rng, p, s = 1) {
  B.anims.push({ type: 'aurora', x: p.x, z: p.z, a: p.a + rng.range(-0.6, 0.6), len: rng.range(0.5, 0.75) * s, h: rng.range(0.36, 0.5) * s, y: H + rng.range(0.3, 0.42), amp: rng.range(0.04, 0.07) * s, ph: rng.float() * PI2, hue: rng.int(3) });
}
export function buildAuroraGeometry(a) {
  const N = 28, pos = [], uv = [], idx = [], dx = Math.cos(a.a), dz = Math.sin(a.a), px = -dz, pz = dx;
  for (let i = 0; i <= N; i++) {
    const u = i / N, t = (u - 0.5) * a.len, w = Math.sin(u * 7.0 + a.ph) * a.amp + Math.sin(u * 2.3 + a.ph * 1.7) * a.amp * 0.6;
    const x = a.x + dx * t + px * w, z = a.z + dz * t + pz * w;
    pos.push(x, a.y, z, x, a.y + a.h, z); uv.push(u, 0, u, 1);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('perp', new THREE.Float32BufferAttribute(new Array(N + 1).fill(0).flatMap(() => [px, pz, px, pz]), 2));
  g.setAttribute('aph', new THREE.Float32BufferAttribute(new Array((N + 1) * 2).fill(a.ph), 1));
  g.setIndex(idx);
  return g;
}

function iglooCamp(B, rng, p) { // acampamento: um iglu grande, um ou dois menores e a fogueira no meio
  igloo(B, rng, p, 1);
  for (let k = 0, n = 1 + rng.int(2); k < n; k++) {
    const a = p.a + 1.7 + k * 1.9 + rng.range(-0.3, 0.3), d = rng.range(0.115, 0.155);
    igloo(B, rng, { x: p.x + Math.cos(a) * d, z: p.z + Math.sin(a) * d, a: a + Math.PI }, rng.range(0.58, 0.78));
  }
  const fa = p.a + rng.range(0.6, 1.2), fx = p.x + Math.cos(fa) * 0.085, fz = p.z + Math.sin(fa) * 0.085;
  B.annulus(B.lit, fx, H + 0.003, fz, 0.026, 0.046, 10, shade(col(PAL.snow), 0.84));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * PI2 + rng.float(); B.tube(B.lit, [[fx + Math.cos(a) * 0.02, H, fz + Math.sin(a) * 0.02], [fx, H + 0.032, fz]], [0.004, 0.0025], 4, col(PAL.woodDark)); }
  B.sphere(B.glow, fx, H + 0.03, fz, 0.017, col('#ff7a1a'), 7, 4);
}

// ---------- SNOWPUNK: tecnologia ártica ----------
// O gelo é snowpunk: além de neve e bicho, posto de pesquisa sobre palafitas, oleoduto aquecido
// e quebra-gelo preso no gelo. Cor fria escura (aço, casco vermelho) para contrastar com o branco.
function probeStation(B, rng, p) { // módulo habitável sobre palafitas com antena parabólica
  const ry = p.a + rng.range(-0.5, 0.5), c = Math.cos(ry), s = Math.sin(ry), hull = col('#5a6478'), y = H + 0.07;
  for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) B.extrude(B.lit, ngon(p.x + c * u * 0.05 - s * v * 0.03, p.z + s * u * 0.05 + c * v * 0.03, 0.006, 5), H, 0.07, col(PAL.post));
  B.extrude(B.lit, chamfer(p.x, p.z, 0.15, 0.09, ry, 0.03), y, 0.05, hull, { topCol: col(PAL.snow), sideShade: true });
  for (let k = -1; k <= 1; k++) B.panel(B.glow, p.x + c * k * 0.04 - s * 0.046, y + 0.02, p.z + s * k * 0.04 + c * 0.046, 0.022, 0.014, ry + Math.PI / 2, col(PAL.warmWin), 0.004);
  B.frustum(B.lit, p.x - c * 0.05, y + 0.05, p.z - s * 0.05, 0.005, 0.004, 0.08, 5, col(PAL.post));
  B.sphere(B.lit, p.x - c * 0.05, y + 0.13, p.z - s * 0.05, 0.035, col('#dfe6f0'), 8, 3, { dome: true, sy: 0.4 }); // parabólica
  B.sphere(B.glow, p.x - c * 0.05, y + 0.15, p.z - s * 0.05, 0.008, col(PAL.beacon), 5, 3);
  B.extrude(B.glow, rect(p.x, p.z, 0.16, 0.004, ry), y - 0.002, 0.003, col(PAL.crystalGlow));
}
function heatPipe(B, rng, p) { // oleoduto aquecido sobre cavaletes: derrete uma faixa de neve por baixo
  const ang = p.a + Math.PI / 2 + rng.range(-0.5, 0.5), c = Math.cos(ang), s = Math.sin(ang), L = rng.range(0.24, 0.32), y = H + 0.05;
  B.extrude(B.lit, rect(p.x, p.z, L + 0.02, 0.05, ang), H, 0.003, col(PAL.iceDark)); // chão derretido
  B.tube(B.lit, [[p.x - c * L / 2, y, p.z - s * L / 2], [p.x + c * L / 2, y, p.z + s * L / 2]], [0.016, 0.016], 8, col('#6b7186'));
  for (const f of [-0.35, 0, 0.35]) {
    const x = p.x + c * L * f, z = p.z + s * L * f;
    B.extrude(B.lit, rect(x, z, 0.012, 0.05, ang), H, y - H - 0.01, col(PAL.post));
    B.annulus(B.glow, x, y, z, 0.016, 0.021, 8, col('#ff7a1a')); // junta aquecida
  }
}
function icebreaker(B, rng, p) { // quebra-gelo preso: casco vermelho tombado, ponte de comando, gelo rachado em volta
  const ang = p.a + rng.range(-0.8, 0.8), c = Math.cos(ang), s = Math.sin(ang), red = col('#b8323a'), L = 0.26, W = 0.09;
  B.extrude(B.lit, ngon(p.x, p.z, 0.17, 9, ang), H, 0.003, col(PAL.iceDark));
  for (let k = 0; k < 4; k++) { const a2 = ang + k * 1.6; B.extrude(B.glow, rect(p.x + Math.cos(a2) * 0.14, p.z + Math.sin(a2) * 0.14, 0.12, 0.004, a2 + 0.4), H + 0.003, 0.002, shade(col(PAL.crack), 0.9)); }
  const hx = W / 2, bow = [[-L / 2, -hx], [L * 0.3, -hx], [L / 2, 0], [L * 0.3, hx], [-L / 2, hx]].map(([u, v]) => [p.x + u * c - v * s, p.z + u * s + v * c]);
  B.extrude(B.lit, bow, H - 0.01, 0.05, red, { topCol: col('#3a3e4a'), sideShade: true });
  B.extrude(B.lit, rect(p.x, p.z, L * 0.98, W * 1.02, ang), H + 0.012, 0.006, col('#f2f4fb')); // faixa branca no casco
  B.extrude(B.lit, chamfer(p.x - c * 0.05, p.z - s * 0.05, 0.08, 0.07, ang, 0.012), H + 0.04, 0.05, col('#e8ecf3'), { topCol: col(PAL.snow), sideShade: true }); // ponte
  B.panel(B.glow, p.x - c * 0.009, H + 0.07, p.z - s * 0.009, 0.06, 0.012, ang, col(PAL.coolWin), 0.004);
  B.frustum(B.lit, p.x - c * 0.07, H + 0.09, p.z - s * 0.07, 0.016, 0.013, 0.05, 8, col('#2a2d3a')); // chaminé
  B.sphere(B.glow, p.x + c * 0.12, H + 0.06, p.z + s * 0.12, 0.009, col(PAL.beacon), 5, 3);
}
function drawIce(B, rng, pts) {
  for (const p of pts) {
    const r = rng.float();
    if (r < 0.13) icePeak(B, rng, p, rng.range(0.9, 1.3));
    else if (r < 0.18) iceRidge(B, rng, p);
    else if (r < 0.28) pines(B, rng, p);
    else if (r < 0.36) seracs(B, rng, p);
    else if (r < 0.42) probeStation(B, rng, p);
    else if (r < 0.47) heatPipe(B, rng, p);
    else if (r < 0.505) icebreaker(B, rng, p);
    else if (r < 0.55) { // cristais
      const n = 2 + rng.int(2);
      for (let k = 0; k < n; k++) {
        const x = p.x + rng.range(-0.05, 0.05), z = p.z + rng.range(-0.05, 0.05), h = rng.range(0.08, 0.26), cr = rng.range(0.025, 0.05), ry = rng.float() * 6;
        B.extrude(B.lit, ngon(x, z, cr, 6, ry), H, h, col(PAL.crystal), { topCol: col('#e6f7ff'), sideShade: true });
        B.cone(B.glow, x, H + h, z, cr * 0.9, cr * 1.6, col(PAL.crystalGlow), 6, ry);
      }
    } else if (r < 0.6) { // montes de neve
      B.sphere(B.lit, p.x, H - 0.02, p.z, rng.range(0.06, 0.11), col(PAL.snow), 9, 4, { dome: true, sy: 0.6 });
      if (rng.chance(0.5)) B.sphere(B.lit, p.x + 0.07, H - 0.02, p.z + 0.03, rng.range(0.04, 0.07), col(PAL.snow), 8, 3, { dome: true, sy: 0.6 });
    } else if (r < 0.72) iglooCamp(B, rng, p);
    else if (r < 0.78) inuksuk(B, rng, p);
    else if (r < 0.83) fishingHut(B, rng, p);
    else if (r < 0.865) sled(B, rng, p);
    else if (r < 0.895) iceHole(B, rng, p);
    else if (r < 0.925) aurora(B, rng, p);
    else if (r < 0.952) { // letreiro antigo meio enterrado
      const c = rng.pick(PAL.neon);
      B.extrude(B.lit, rect(p.x, p.z, 0.03, 0.14, p.a + 0.4), H, 0.12, col('#2a2d3a'));
      B.panel(B.glow, p.x + Math.cos(p.a + 0.4) * 0.018, H + 0.02, p.z + Math.sin(p.a + 0.4) * 0.018, 0.11, 0.08, p.a + 0.4, col(c), 0.006);
    } else if (r < 0.982) { // poste com luz fria
      B.extrude(B.lit, ngon(p.x, p.z, 0.012, 8), H, 0.34, col(PAL.post));
      B.sphere(B.glow, p.x, H + 0.35, p.z, 0.022, col(PAL.lampCool), 8, 4);
    } else snowbot(B, rng, p);
  }
}

// ---------- BALDIO (terreno de estuque livre: respiro) ----------
// Continua o bioma mais vazio do jogo (1-2 pontos por setor, contra 2-4 dos outros), mas agora com
// folhagem leve e flores de UMA cor do arco-íris sorteada pela peça — cada baldio tem a sua.
// ---------- BALDIO (com um quê de steampunk) ----------
// Terreno vago: pouca coisa, mas viva. Flores numa cor do arco-íris sorteada por peça (a cor nova é a
// graça de cada Baldio que sai da pilha), mudinhas, capim, e sucata de uma era a vapor que ficou para
// trás — engrenagens tombadas com flor brotando, caldeira soltando vapor, lampião a gás, cano com registro.
function wildFlower(B, rng, x, z, fc, h = rng.range(0.035, 0.06)) {
  B.extrude(B.lit, ngon(x, z, 0.004, 5), H, h, col(PAL.grassDark));
  B.leaf(B.lit, [x, H + 0.006, z], rng.float() * PI2, 0.032, 0.015, col(rng.pick(PAL.tuft)), { lift: 0.012, droop: 0.01, segs: 2 });
  const ph = rng.float() * PI2;
  for (let j = 0; j < 5; j++) { const a = ph + (j / 5) * PI2; B.sphere(B.glow, x + Math.cos(a) * 0.02, H + h, z + Math.sin(a) * 0.02, 0.017, fc, 5, 2); }
  B.sphere(B.lit, x, H + h + 0.005, z, 0.011, col('#fff3b0'), 5, 2);
}
function sapling(B, rng, x, z) { // mudinha: tronco fino e três tufos redondos
  const h = rng.range(0.08, 0.12), c = col(rng.pick(['#7fbf4a', '#93cf5a', '#6aa93e']));
  B.tube(B.lit, [[x, H, z], [x + rng.range(-0.008, 0.008), H + h * 0.6, z + rng.range(-0.008, 0.008)], [x, H + h, z]], [0.007, 0.006, 0.005], 5, col(PAL.trunk));
  for (let k = 0; k < 3; k++) { const a = rng.float() * PI2; B.sphere(B.lit, x + Math.cos(a) * 0.02, H + h + rng.range(-0.01, 0.015), z + Math.sin(a) * 0.02, rng.range(0.022, 0.03), shade(c, rng.range(0.9, 1.12)), 7, 4); }
}
function cog(B, x, z, r, y0, h, color, teeth = 10, ry = 0) { // engrenagem deitada (o topo é leque a partir do centro: a estrela é convexa o bastante)
  const poly = [], st = PI2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = ry + i * st;
    poly.push([x + Math.cos(a) * r, z + Math.sin(a) * r], [x + Math.cos(a + st * 0.2) * r * 1.25, z + Math.sin(a + st * 0.2) * r * 1.25], [x + Math.cos(a + st * 0.45) * r * 1.25, z + Math.sin(a + st * 0.45) * r * 1.25], [x + Math.cos(a + st * 0.65) * r, z + Math.sin(a + st * 0.65) * r]);
  }
  B.extrude(B.lit, poly, y0, h, color, { topCol: shade(color, 1.1) });
  B.annulus(B.lit, x, y0 + h + 0.001, z, r * 0.45, r * 0.72, 12, shade(color, 0.62));
  B.extrude(B.lit, ngon(x, z, r * 0.22, 8), y0 + h, 0.006, shade(color, 0.8));
}
function brassGears(B, rng, p, iris) {
  const c1 = col(rng.pick(PAL.brass)), r = rng.range(0.06, 0.08);
  cog(B, p.x, p.z, r, H, 0.018, c1, 10, rng.float());
  cog(B, p.x + r * 0.95, p.z + r * 0.5, r * 0.5, H, 0.03, col(rng.pick(PAL.copper)), 7, rng.float());
  B.sphere(B.lit, p.x - r * 0.8, H, p.z + r * 0.4, 0.02, col(PAL.patina), 6, 3, { dome: true, sy: 0.5 }); // azinhavre
  wildFlower(B, rng, p.x + rng.range(-0.02, 0.02), p.z + rng.range(-0.02, 0.02), col(iris), 0.07); // flor brotando pelo furo
}
function steamBoiler(B, rng, p) {
  const c = col(rng.pick(PAL.copper)), brass = col(PAL.brass[0]), ox = Math.cos(p.a) * 0.03, oz = Math.sin(p.a) * 0.03;
  B.frustum(B.lit, p.x, H, p.z, 0.042, 0.042, 0.085, 12, c);
  B.sphere(B.lit, p.x, H + 0.085, p.z, 0.042, shade(c, 1.08), 12, 4, { dome: true, sy: 0.6 });
  for (const y of [0.015, 0.06]) B.frustum(B.lit, p.x, H + y, p.z, 0.045, 0.045, 0.008, 12, brass);
  B.frustum(B.lit, p.x + ox, H + 0.09, p.z + oz, 0.012, 0.014, 0.08, 8, col(PAL.iron));
  B.frustum(B.lit, p.x + ox, H + 0.17, p.z + oz, 0.02, 0.014, 0.012, 8, col(PAL.iron));
  B.sphere(B.glow, p.x - Math.sin(p.a) * 0.043, H + 0.05, p.z + Math.cos(p.a) * 0.043, 0.009, col('#ffcf6e'), 6, 3); // manômetro
  for (let k = 0; k < 3; k++) B.sphere(B.lit, p.x + ox + k * 0.012, H + 0.2 + k * 0.035, p.z + oz - k * 0.006, 0.018 + k * 0.007, col(PAL.steam), 7, 4); // vapor
}
function gasLamp(B, rng, p) {
  const iron = col(PAL.iron), h = 0.2;
  B.frustum(B.lit, p.x, H, p.z, 0.016, 0.01, 0.02, 8, iron);
  B.extrude(B.lit, ngon(p.x, p.z, 0.006, 6), H + 0.02, h - 0.02, iron);
  B.frustum(B.lit, p.x, H + h, p.z, 0.012, 0.018, 0.035, 6, shade(col(PAL.lantern), 0.9));
  B.sphere(B.glow, p.x, H + h + 0.017, p.z, 0.013, col(PAL.lantern), 6, 3);
  B.cone(B.lit, p.x, H + h + 0.035, p.z, 0.024, 0.025, iron, 6);
}
function pipeValve(B, rng, p) {
  const c = col(rng.pick(PAL.copper)), dx = Math.cos(p.a) * 0.07, dz = Math.sin(p.a) * 0.07;
  B.tube(B.lit, [[p.x - dx, H - 0.01, p.z - dz], [p.x - dx, H + 0.06, p.z - dz], [p.x - dx * 0.5, H + 0.09, p.z - dz * 0.5], [p.x + dx * 0.5, H + 0.09, p.z + dz * 0.5], [p.x + dx, H + 0.06, p.z + dz], [p.x + dx, H - 0.01, p.z + dz]], [0.013], 8, c);
  B.extrude(B.lit, ngon(p.x, p.z, 0.005, 6), H + 0.09, 0.03, col(PAL.iron));
  B.annulus(B.lit, p.x, H + 0.122, p.z, 0.016, 0.024, 10, col('#c43a2a')); // volante do registro
  B.extrude(B.lit, rect(p.x, p.z, 0.044, 0.005, p.a + 0.8), H + 0.12, 0.004, col('#c43a2a'));
}
function drawGrass(B, rng, pts, iris) {
  for (const p of pts) {
    const r = rng.float();
    if (r < 0.3) { // canteiro de flores na cor da peça
      for (let k = 0, n = 4 + rng.int(4); k < n; k++) wildFlower(B, rng, p.x + rng.range(-0.07, 0.07), p.z + rng.range(-0.07, 0.07), col(iris));
    } else if (r < 0.46) { // tufos de capim com uma flor ou outra
      for (let k = 0, n = 3 + rng.int(3); k < n; k++) { const x = p.x + rng.range(-0.06, 0.06), z = p.z + rng.range(-0.06, 0.06); B.cone(B.lit, x, H, z, rng.range(0.012, 0.02), rng.range(0.03, 0.06), col(rng.pick(PAL.tuft)), 4, rng.float() * 6); }
      wildFlower(B, rng, p.x, p.z, col(iris));
    } else if (r < 0.58) { sapling(B, rng, p.x, p.z); if (rng.chance(0.6)) wildFlower(B, rng, p.x + 0.05, p.z - 0.03, col(iris)); }
    else if (r < 0.74) { // sucata a vapor (uma por ponto, raras no tile inteiro)
      const s = rng.float();
      if (s < 0.32) brassGears(B, rng, p, iris); else if (s < 0.58) steamBoiler(B, rng, p); else if (s < 0.8) gasLamp(B, rng, p); else pipeValve(B, rng, p);
    } else if (r < 0.86) { // moita baixa florida
      const c = col(rng.pick(PAL.tuft));
      B.sphere(B.lit, p.x, H + 0.01, p.z, rng.range(0.035, 0.05), c, 7, 3, { dome: true, sy: 0.7 });
      for (let k = 0; k < 3; k++) B.sphere(B.glow, p.x + rng.range(-0.03, 0.03), H + 0.042, p.z + rng.range(-0.03, 0.03), 0.012, col(iris), 5, 2);
    } else if (r < 0.92) { // pedra lisa
      B.sphere(B.lit, p.x, H, p.z, rng.range(0.03, 0.05), col('#a89c86'), 6, 3, { dome: true, sy: 0.5 });
    } // (o resto fica vazio de propósito)
  }
}

// ---------- CIDADE NEON ----------
// Cor de neon dentro do esquema da peca: dominante, secundaria, e um apoio raro.
const schemeCol = (rng, sch) => { const r = rng.float(); return col(r < 0.75 ? sch.key : r < 0.94 ? sch.accent : sch.warm); };
// Poca de luz no asfalto. Vai em B.lit (nao B.glow): o neon precisa PINTAR o chao, nao so brilhar.
function lightPool(B, x, z, r, color, strength = 1) {
  const base = col(PAL.ground.cyber), N = 10;
  for (let k = N; k >= 1; k--) {
    const t = k / N, mix = base.clone().lerp(color, strength * 0.26 * (1 - t) ** 1.7);
    B.extrude(B.lit, ngon(x, z, r * t, 18, 0), H + 0.0002 * (N + 1 - k), 0.00015, mix);
  }
}
// Faixas horizontais de neon empilhadas na fachada (motivo central das duas referencias).
function neonBands(B, rng, x, z, w, d, ry, y0, h, c) {
  const n = 2 + rng.int(4), gap = h / (n + 1);
  for (let k = 1; k <= n; k++) B.extrude(B.glow, chamfer(x, z, w + 0.008, d + 0.008, ry, 0.03), y0 + gap * k, 0.005, c);
}
function windows(B, rng, x, z, w, d, ry, y0, h) {
  const c = Math.cos(ry), s = Math.sin(ry), faces = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [fx, fz] of faces) {
    if (!rng.chance(0.7)) continue;
    const color = col(rng.chance(0.5) ? PAL.warmWin : PAL.coolWin), cols = 1 + rng.int(2);
    for (let k = 0; k < cols; k++) {
      const along = (k - (cols - 1) / 2) * 0.05;
      const lx = fx * (w / 2 + 0.004) + (fx === 0 ? along : 0), lz = fz * (d / 2 + 0.004) + (fz === 0 ? along : 0);
      const wx = x + lx * c - lz * s, wz = z + lx * s + lz * c, ang = fx !== 0 ? ry + Math.PI / 2 : ry;
      B.panel(B.glow, wx, y0 + h * 0.12, wz, 0.022, h * rng.range(0.5, 0.75), ang, shade(color, 0.75), 0.006);
    }
  }
}
function tower(B, rng, p, sch) {
  B.buildings++;
  let w = rng.range(0.14, 0.24), d = rng.range(0.14, 0.24), h = rng.range(0.28, 0.85);
  const ry = p.a + rng.range(-0.3, 0.3), base = col(rng.pick(PAL.bld)), tiers = 1 + rng.int(3);
  let y = H;
  for (let t = 0; t < tiers; t++) {
    const th = t === tiers - 1 ? h - (y - H) : h * rng.range(0.35, 0.55);
    B.extrude(B.lit, chamfer(p.x, p.z, w, d, ry, 0.03), y, th, base, { topCol: shade(base, 2.2), sideShade: true });
    if (rng.chance(0.4)) neonBands(B, rng, p.x, p.z, w, d, ry, y, th, schemeCol(rng, sch));
    else windows(B, rng, p.x, p.z, w, d, ry, y, th);
    B.extrude(B.glow, chamfer(p.x, p.z, w + 0.012, d + 0.012, ry, 0.03), y + th - 0.02, 0.016, schemeCol(rng, sch));
    y += th; w *= 0.82; d *= 0.82;
  }
  const r = rng.float();
  if (r < 0.35) { B.extrude(B.lit, ngon(p.x, p.z, 0.012, 6), y, 0.14, col('#8d93ad')); B.sphere(B.glow, p.x, y + 0.15, p.z, 0.014, col(sch.warm), 6, 3); }
  else if (r < 0.6) { B.sphere(B.lit, p.x, y, p.z, Math.min(w, d) * 0.45, shade(base, 1.6), 10, 4, { dome: true }); B.annulus(B.glow, p.x, y + 0.004, p.z, Math.min(w, d) * 0.42, Math.min(w, d) * 0.5, 12, schemeCol(rng, sch)); }
  else if (r < 0.8) { B.cone(B.glow, p.x, y, p.z, 0.03, 0.22, schemeCol(rng, sch), 6); }
  else { B.extrude(B.lit, rect(p.x, p.z, w * 0.5, d * 0.5, ry), y, 0.04, shade(base, 0.8)); B.extrude(B.lit, ngon(p.x + 0.02, p.z, 0.02, 8), y + 0.04, 0.02, col('#8d93ad')); }
  if (rng.chance(0.5)) { // letreiro vertical
    const c = Math.cos(ry), s = Math.sin(ry), sw = 0.03;
    B.extrude(B.lit, rect(p.x + c * (w / 2 + 0.02), p.z + s * (w / 2 + 0.02), 0.016, 0.05, ry), H + h * 0.2, Math.min(h * 0.55, 0.32), col('#2a2d44'));
    B.panel(B.glow, p.x + c * (w / 2 + 0.03), H + h * 0.22, p.z + s * (w / 2 + 0.03), 0.05, Math.min(h * 0.5, 0.3), ry, schemeCol(rng, sch), sw);
  }
}
function cylTower(B, rng, p, sch) {
  B.buildings++;
  const r = rng.range(0.07, 0.11), h = rng.range(0.35, 0.8), base = col(rng.pick(PAL.bld));
  B.extrude(B.lit, ngon(p.x, p.z, r, 14, rng.float()), H, h, base, { topCol: shade(base, 2.1), sideShade: true });
  const n = 2 + rng.int(3);
  for (let k = 0; k < n; k++) B.annulus(B.glow, p.x, H + h * (0.15 + 0.7 * k / n), p.z, r + 0.002, r + 0.016, 14, schemeCol(rng, sch));
  B.sphere(B.lit, p.x, H + h, p.z, r * 0.95, shade(base, 1.7), 12, 4, { dome: true, sy: 0.7 });
  B.sphere(B.glow, p.x, H + h + r * 0.62, p.z, r * 0.25, schemeCol(rng, sch), 8, 4);
}
function pagoda(B, rng, p, sch) {
  B.buildings++;
  const tiers = 2 + rng.int(2), ry = p.a + rng.range(-0.3, 0.3), roof = col(rng.pick(PAL.roof)), wallc = col(rng.pick(PAL.bld)), edge = schemeCol(rng, sch);
  let y = H, s = 0.2;
  for (let t = 0; t < tiers; t++) {
    B.extrude(B.lit, rect(p.x, p.z, s * 0.75, s * 0.75, ry), y, 0.09, wallc, { topCol: shade(wallc, 1.2) });
    if (rng.chance(0.6)) B.panel(B.glow, p.x + Math.cos(ry) * (s * 0.375 + 0.006), y + 0.02, p.z + Math.sin(ry) * (s * 0.375 + 0.006), s * 0.5, 0.05, ry, shade(col(PAL.warmWin), 0.8), 0.006);
    y += 0.09;
    B.frustum(B.lit, p.x, y, p.z, s * 0.62, s * 0.2, 0.06, 4, roof, ry + Math.PI / 4, { flat: false });
    B.frustum(B.glow, p.x, y - 0.006, p.z, s * 0.63, s * 0.63, 0.008, 4, edge, ry + Math.PI / 4, { noTop: true });
    y += 0.05; s *= 0.8;
  }
  B.extrude(B.lit, ngon(p.x, p.z, 0.008, 6), y, 0.1, col('#c9a03a'));
  B.sphere(B.glow, p.x, y + 0.11, p.z, 0.014, edge, 6, 3);
}
function billboard(B, rng, p, sch) {
  const ry = p.a + rng.range(-0.5, 0.5), h = rng.range(0.25, 0.45), c1 = col(sch.key), c2 = col(rng.chance(0.75) ? sch.accent : sch.warm);
  B.extrude(B.lit, ngon(p.x, p.z, 0.014, 8), H, h, col(PAL.post));
  B.extrude(B.lit, rect(p.x, p.z, 0.02, 0.3, ry), H + h, 0.18, col('#2a2d44'));
  B.panel(B.glow, p.x + Math.cos(ry) * 0.014, H + h + 0.015, p.z + Math.sin(ry) * 0.014, 0.27, 0.15, ry, c1, 0.006);
  B.panel(B.glow, p.x + Math.cos(ry) * 0.022, H + h + 0.05, p.z + Math.sin(ry) * 0.022, 0.12, 0.05, ry, c2, 0.006);
  B.panel(B.glow, p.x - Math.cos(ry) * 0.014, H + h + 0.015, p.z - Math.sin(ry) * 0.014, 0.27, 0.15, ry, c2, 0.006);
}
function stall(B, rng, p, sch) {
  const ry = p.a + rng.range(-0.3, 0.3), c = Math.cos(ry), s = Math.sin(ry), body = col(rng.pick(['#3a1d5a', '#1d3a4a', '#4a2a1d']));
  B.extrude(B.lit, chamfer(p.x, p.z, 0.16, 0.1, ry, 0.015), H, 0.07, body, { topCol: shade(body, 1.2) });
  B.frustum(B.lit, p.x, H + 0.07, p.z, 0.12, 0.05, 0.05, 4, col(rng.pick(PAL.roof)), ry + Math.PI / 4);
  B.panel(B.glow, p.x + c * 0.085, H + 0.03, p.z + s * 0.085, 0.12, 0.035, ry, schemeCol(rng, sch), 0.006);
  for (const sd of [1, -1]) B.sphere(B.glow, p.x + c * 0.07 - s * sd * 0.06, H + 0.1, p.z + s * 0.07 + c * sd * 0.06, 0.014, col(rng.pick(['#ff3b5c', '#ffb35c'])), 6, 3);
}
// Quarteirao: volumes ENCOSTADOS sobre um plinto comum, com rua na frente — nas referencias
// a cidade e um bloco, nao um alfineteiro de torres soltas.
// Devolve false quando nao cabe no setor, e o chamador volta pro espalhado.
function cityBlock(B, rng, p, sch) {
  const rad = p.x * Math.cos(p.a) + p.z * Math.sin(p.a);   // quanto o ancoradouro esta afastado do centro
  const room = Math.max(0, rad * 0.577 * 0.8 - 0.05);      // meia-largura util do setor nesse raio
  const W = Math.min(rng.range(0.28, 0.36), room * 1.7);
  if (W < 0.17) return false;
  const a = p.a + Math.PI / 2 + rng.range(-0.18, 0.18), c = Math.cos(a), s = Math.sin(a);
  const D = rng.range(0.17, 0.22), plinth = col('#0d0f1e'), y0 = H + 0.018;
  lightPool(B, p.x, p.z, W * 0.8, schemeCol(rng, sch), 1.1);
  B.extrude(B.lit, chamfer(p.x, p.z, W + 0.022, D + 0.022, a, 0.02), H, 0.018, plinth, { topCol: shade(plinth, 2.0) });
  B.extrude(B.glow, chamfer(p.x, p.z, W + 0.03, D + 0.03, a, 0.02), H + 0.013, 0.004, schemeCol(rng, sch));
  const lots = rng.chance(0.5) ? 2 : 1, cw = W / lots;
  for (let i = 0; i < lots; i++) {
    B.buildings++;
    const u = -W / 2 + cw * (i + 0.5), bx = p.x + c * u, bz = p.z + s * u;
    const base = col(rng.pick(PAL.bld)), tiers = 1 + rng.int(2), h = rng.range(0.16, 0.58);
    let w = cw * 0.97, d = D * rng.range(0.82, 1), y = y0;
    for (let t = 0; t < tiers; t++) {
      const th = t === tiers - 1 ? h - (y - y0) : h * rng.range(0.4, 0.6);
      B.extrude(B.lit, chamfer(bx, bz, w, d, a, 0.02), y, th, base, { topCol: shade(base, 2.2), sideShade: true });
      if (rng.chance(0.5)) neonBands(B, rng, bx, bz, w, d, a, y, th, schemeCol(rng, sch));
      else windows(B, rng, bx, bz, w, d, a, y, th);
      y += th; w *= 0.9; d *= 0.87;
    }
    B.extrude(B.glow, chamfer(bx, bz, w + 0.01, d + 0.01, a, 0.02), y - 0.012, 0.01, schemeCol(rng, sch));
    if (rng.chance(0.45)) { // letreiro vertical na fachada da frente
      const fx = bx - s * (D / 2 + 0.014), fz = bz + c * (D / 2 + 0.014);
      B.panel(B.glow, fx, y0 + h * 0.22, fz, 0.038, Math.min(h * 0.55, 0.26), a + Math.PI / 2, schemeCol(rng, sch), 0.006);
    }
    if (rng.chance(0.28)) B.cone(B.glow, bx, y, bz, 0.018, 0.11, schemeCol(rng, sch), 6);
    else if (rng.chance(0.3)) { B.extrude(B.lit, ngon(bx, bz, 0.009, 6), y, 0.1, col('#8d93ad')); B.sphere(B.glow, bx, y + 0.11, bz, 0.011, col(sch.warm), 6, 3); }
  }
  // rua molhada na frente (lado de dentro da peca, pra nunca vazar pela borda)
  if (lots === 1) { // lote unico ganha um podio baixo encostado: massa de quarteirao sem virar outro predio
    const pw = W * rng.range(0.42, 0.55), px2 = p.x + c * (W / 2 - pw / 2) * rng.pick([1, -1]), pz2 = p.z + s * (W / 2 - pw / 2);
    const pc = col(rng.pick(PAL.bld));
    B.extrude(B.lit, chamfer(px2, pz2, pw, D * 0.9, a, 0.02), y0, rng.range(0.05, 0.09), pc, { topCol: shade(pc, 2.2), sideShade: true });
    B.extrude(B.glow, chamfer(px2, pz2, pw + 0.008, D * 0.9 + 0.008, a, 0.02), y0 + rng.range(0.05, 0.085), 0.005, schemeCol(rng, sch));
  }
  const nx = -Math.cos(p.a), nz = -Math.sin(p.a), rx = p.x + nx * (D / 2 + 0.06), rz = p.z + nz * (D / 2 + 0.06);
  B.extrude(B.lit, rect(rx, rz, W + 0.05, 0.085, a), H, 0.0015, col('#0b0d1a'));
  for (let k = -1; k <= 1; k += 2) lightPool(B, rx + c * k * W * 0.3, rz + s * k * W * 0.3, 0.065, col(sch.warm), 0.9);
  return true;
}
function drawCyber(B, rng, pts, sector, sch) {
  const asBlock = pts.length >= 2 && rng.chance(0.62) && cityBlock(B, rng, pts[0], sch);
  for (const p of pts.slice(asBlock ? 2 : 0)) {
    // num setor com quarteirao as sobras viram mobiliario urbano (nao contam como predio)
    const r = asBlock ? 0.75 + rng.float() * 0.25 : rng.float();
    lightPool(B, p.x, p.z, r < 0.6 ? rng.range(0.2, 0.3) : rng.range(0.13, 0.2), schemeCol(rng, sch), asBlock ? 0.8 : 1);
    if (r < 0.45) tower(B, rng, p, sch); else if (r < 0.6) cylTower(B, rng, p, sch); else if (r < 0.75) pagoda(B, rng, p, sch); else if (r < 0.88) billboard(B, rng, p, sch); else stall(B, rng, p, sch);
  }
  if (pts.length && rng.chance(0.4)) { const p = pts[0]; B.anims.push({ type: 'drone', x: p.x, y: H + rng.range(0.6, 0.9), z: p.z, r: rng.range(0.1, 0.22), speed: rng.range(0.6, 1.4) * (rng.chance(0.5) ? 1 : -1), color: sch.key }); }
}

// ---------- SOLARPUNK: VILAREJO ----------
// Telhado de duas aguas (cumeeira ao longo de d). frustum nao da gablete.
function prismRoof(B, tgt, cx, cz, w, d, ry, y0, h, color) {
  const c = Math.cos(ry), s = Math.sin(ry), P = (u, v, y) => [cx + u * c - v * s, y, cz + u * s + v * c];
  const a = P(-w / 2, -d / 2, y0), b = P(w / 2, -d / 2, y0), e = P(w / 2, d / 2, y0), f = P(-w / 2, d / 2, y0);
  const r0 = P(0, -d / 2, y0 + h), r1 = P(0, d / 2, y0 + h);
  B.quad(tgt, a, f, r1, r0, shade(color, 1.08), [-c, 0.6, -s]);
  B.quad(tgt, b, e, r1, r0, shade(color, 0.88), [c, 0.6, s]);
  B.tri(tgt, a, b, r0, shade(color, 0.96), [s, 0, -c]);
  B.tri(tgt, f, e, r1, shade(color, 0.96), [-s, 0, c]);
}
// Plano inclinado (painel solar de telhado ou toldo de pergolado).
function tiltPanel(B, cx, cz, w, d, ry, y0, rise, color, glowCol) {
  const c = Math.cos(ry), s = Math.sin(ry), P = (u, v, y) => [cx + u * c - v * s, y, cz + u * s + v * c];
  const A = P(-w / 2, -d / 2, y0), Bp = P(w / 2, -d / 2, y0 + rise), C = P(w / 2, d / 2, y0 + rise), D = P(-w / 2, d / 2, y0);
  B.quad(B.lit, A, Bp, C, D, color, [0, 1, 0]);
  B.quad(B.lit, D, C, Bp, A, shade(color, 0.7), [0, -1, 0]);
  if (glowCol) for (let k = -1; k <= 1; k++) {
    const u = (k * w) / 3.2, y = y0 + rise * (u / w + 0.5);
    B.quad(B.glow, P(u - 0.003, -d / 2 * 0.9, y + 0.001), P(u + 0.003, -d / 2 * 0.9, y + 0.001), P(u + 0.003, d / 2 * 0.9, y + 0.001), P(u - 0.003, d / 2 * 0.9, y + 0.001), glowCol, [0, 1, 0]);
  }
}
const stuccoCol = (rng) => col(rng.pick(PAL.stucco));
// Canteiro elevado de horta (refs 3 e 4) — o detalhe que mais diz "solarpunk habitado".
function planterBed(B, rng, x, z, a, w = 0.1, d = 0.06) {
  const wood = col(rng.pick(PAL.wood)), h = 0.026;
  B.extrude(B.lit, rect(x, z, w, d, a), H, h, wood, { topCol: shade(wood, 1.15), sideShade: true });
  B.extrude(B.lit, rect(x, z, w - 0.012, d - 0.012, a), H + h, 0.004, col(PAL.soil));
  for (let k = 0; k < 3; k++) for (let j = -1; j <= 1; j++) {
    const u = (k - 1) * w * 0.28, v = j * d * 0.26;
    B.sphere(B.lit, x + u * Math.cos(a) - v * Math.sin(a), H + h + 0.012, z + u * Math.sin(a) + v * Math.cos(a), rng.range(0.009, 0.015), col(rng.pick(PAL.leaf)), 6, 3);
  }
}
// Painel solar como cobertura sobre pilares, nao deitado na laje (ref 4).
function solarCanopy(B, rng, x, z, a, w = 0.16, d = 0.12, y = H) {
  const post = col(PAL.woodDark);
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const px = x + (Math.cos(a) * sx * w / 2 - Math.sin(a) * sz * d / 2), pz = z + (Math.sin(a) * sx * w / 2 + Math.cos(a) * sz * d / 2);
    B.extrude(B.lit, ngon(px, pz, 0.006, 5), y, 0.085, post);
  }
  tiltPanel(B, x, z, w, d, a, y + 0.085, 0.035, col(PAL.panel), col(PAL.panelGlow));
}
// Estufa de vidro (ref 3).
function greenhouse(B, rng, x, z, a, w = 0.12, d = 0.09) {
  const g = col(PAL.glass);
  B.extrude(B.lit, rect(x, z, w, d, a), H, 0.045, g, { topCol: shade(g, 1.1), sideShade: true });
  prismRoof(B, B.lit, x, z, w + 0.006, d + 0.006, a, H + 0.045, 0.04, shade(g, 1.18));
  B.extrude(B.glow, rect(x, z, w * 0.05, d * 0.9, a), H + 0.047, 0.002, col('#b8f5e0'));
  for (let k = -1; k <= 1; k += 2) B.sphere(B.lit, x + Math.cos(a) * k * w * 0.25, H + 0.055, z + Math.sin(a) * k * w * 0.25, 0.016, col(rng.pick(PAL.leaf)), 6, 3);
}
// Caixas d'agua / tanques na cobertura (ref 2).
function waterTanks(B, rng, x, z, y, s = 1) {
  for (let k = 0, n = 1 + rng.int(2); k < n; k++) {
    const tx = x + rng.range(-0.035, 0.035) * s, tz = z + rng.range(-0.035, 0.035) * s;
    B.frustum(B.lit, tx, y, tz, 0.019 * s, 0.019 * s, 0.03 * s, 9, col(PAL.tank), 0, { topCol: shade(col(PAL.tank), 1.15) });
    B.sphere(B.lit, tx, y + 0.03 * s, tz, 0.019 * s, shade(col(PAL.tank), 1.1), 9, 4, { dome: true, sy: 0.6 });
  }
}
// Toldo listrado sobre porta/vitrine (refs 1 e 4).
function awning(B, rng, x, z, a, w, y) {
  const c1 = col(rng.pick(PAL.awning)), cc = Math.cos(a), ss = Math.sin(a);
  const P = (u, v, yy) => [x + u * cc - v * ss, yy, z + u * ss + v * cc];
  const n = 4;
  for (let k = 0; k < n; k++) {
    const u0 = -w / 2 + (w * k) / n, u1 = -w / 2 + (w * (k + 1)) / n, c = k % 2 ? c1 : shade(c1, 1.25);
    B.quad(B.lit, P(u0, 0, y), P(u1, 0, y), P(u1, 0.05, y - 0.024), P(u0, 0.05, y - 0.024), c, [0, 1, 0]);
  }
}
// Turbina de eixo vertical torcida — a silhueta que abre a ref 1.
function vaxTurbine(B, rng, p) {
  const mast = col('#e4e9f2'), h = rng.range(0.1, 0.15), s = rng.range(0.55, 0.75);
  B.frustum(B.lit, p.x, H, p.z, 0.014, 0.008, h, 7, mast);
  B.anims.push({ type: 'rotor', geo: 'vax', x: p.x, y: H + h + 0.11 * s, z: p.z, a: p.a, speed: rng.range(0.7, 1.5) * (rng.chance(0.5) ? 1 : -1), axis: 'y', scale: s });
}
// Casa de estuque: BAIXA e LARGA de proposito — contra a verticalidade das torres neon,
// pra os dois biomas continuarem distinguiveis de longe agora que solar tambem e construido.
function stuccoHouse(B, rng, p) {
  const a = p.a + rng.range(-0.3, 0.3), c = Math.cos(a), s = Math.sin(a);
  const w = rng.range(0.19, 0.25), d = rng.range(0.14, 0.18), h = rng.range(0.08, 0.11), wall = stuccoCol(rng);
  B.extrude(B.lit, rect(p.x, p.z, w + 0.03, d + 0.03, a), H, 0.012, col(rng.pick(PAL.wood)), { topCol: col(PAL.wood[2]) }); // deck
  B.extrude(B.lit, chamfer(p.x, p.z, w, d, a, 0.02), H + 0.012, h, wall, { topCol: shade(wall, 0.92), sideShade: true });
  let topY = H + 0.012 + h;
  if (rng.chance(0.55)) { // segundo volume recuado
    const ox = -c * w * 0.17, oz = -s * w * 0.17, h2 = rng.range(0.055, 0.08);
    B.extrude(B.lit, chamfer(p.x + ox, p.z + oz, w * 0.6, d * 0.72, a, 0.02), topY, h2, shade(wall, 0.96), { topCol: shade(wall, 0.9), sideShade: true });
    B.panel(B.glow, p.x + ox + c * (w * 0.3 + 0.004), topY + h2 * 0.4, p.z + oz + s * (w * 0.3 + 0.004), w * 0.3, h2 * 0.45, a, shade(col(PAL.lantern), 0.85), 0.005);
    topY += h2;
    if (rng.chance(0.55)) prismRoof(B, B.lit, p.x + ox, p.z + oz, w * 0.64, d * 0.76, a, topY, 0.038, col(rng.pick(PAL.terracotta)));
    else waterTanks(B, rng, p.x + ox, p.z + oz, topY, 0.9);
    tiltPanel(B, p.x + c * w * 0.3, p.z + s * w * 0.3, w * 0.34, d * 0.7, a, H + 0.012 + h + 0.004, 0.022, col(PAL.panel), col(PAL.panelGlow));
  } else {
    prismRoof(B, B.lit, p.x, p.z, w + 0.02, d + 0.02, a, topY, 0.05, col(rng.pick(PAL.terracotta)));
    tiltPanel(B, p.x + c * w * 0.22, p.z + s * w * 0.22, w * 0.4, d * 0.6, a, topY + 0.016, 0.026, col(PAL.panel), col(PAL.panelGlow));
  }
  B.panel(B.glow, p.x + c * (w / 2 + 0.004), H + 0.012 + h * 0.4, p.z + s * (w / 2 + 0.004), w * 0.42, h * 0.4, a, shade(col(PAL.lantern), 0.85), 0.006);
  if (rng.chance(0.6)) awning(B, rng, p.x + c * (w / 2 + 0.006), p.z + s * (w / 2 + 0.006), a, w * 0.5, H + 0.012 + h * 0.72);
  for (let k = 0; k < 2; k++) { // trepadeiras na fachada
    const t = rng.range(-0.4, 0.4), vx = p.x - s * t * d + c * (w / 2 + 0.008), vz = p.z + c * t * d + s * (w / 2 + 0.008);
    B.tube(B.lit, [[vx, H + 0.012 + h, vz], [vx + rng.range(-0.01, 0.01), H + h * 0.5, vz + rng.range(-0.01, 0.01)], [vx + rng.range(-0.02, 0.02), H + 0.02, vz + rng.range(-0.02, 0.02)]], [0.007, 0.006, 0.005], 5, col(PAL.vine));
    B.sphere(B.lit, vx, H + 0.012 + h, vz, 0.018, col(rng.pick(PAL.leaf)), 6, 3);
  }
  if (rng.chance(0.5)) planterBed(B, rng, p.x - c * (w / 2 + 0.06), p.z - s * (w / 2 + 0.06), a + Math.PI / 2, 0.09, 0.05);
}
// Conteineres empilhados com escada externa (ref 4).
function containerHouse(B, rng, p) {
  const a = p.a + rng.range(-0.3, 0.3), c = Math.cos(a), s = Math.sin(a);
  const w = rng.range(0.2, 0.24), d = 0.085, boxes = [col(PAL.verdigris), col(rng.pick(PAL.terracotta)), col(rng.pick(PAL.wood))];
  const base = boxes[rng.int(3)], upper = boxes[rng.int(3)];
  B.extrude(B.lit, rect(p.x, p.z, w, d, a), H, 0.062, base, { topCol: shade(base, 1.15), sideShade: true });
  for (let k = -3; k <= 3; k++) B.extrude(B.lit, rect(p.x + (c * k * w) / 8, p.z + (s * k * w) / 8, 0.004, d + 0.004, a), H + 0.004, 0.054, shade(base, 0.82)); // frisos do conteiner
  const ox = -s * 0.03, oz = c * 0.03;
  B.extrude(B.lit, rect(p.x + ox, p.z + oz, w * 0.78, d, a), H + 0.062, 0.058, upper, { topCol: shade(upper, 1.15), sideShade: true });
  for (let k = -2; k <= 2; k++) B.extrude(B.lit, rect(p.x + ox + (c * k * w) / 8, p.z + oz + (s * k * w) / 8, 0.004, d + 0.004, a), H + 0.066, 0.05, shade(upper, 0.82));
  for (let k = 0; k < 5; k++) B.extrude(B.lit, rect(p.x - c * w * 0.42 + c * 0.004 * k, p.z - s * w * 0.42 + s * 0.004 * k, 0.03, 0.016, a + Math.PI / 2), H + 0.012 * k, 0.012, col(PAL.stuccoShade)); // escada externa
  B.panel(B.glow, p.x + c * 0.004 - s * (d / 2 + 0.004) * -1, H + 0.03, p.z + s * 0.004 + c * (d / 2 + 0.004), w * 0.3, 0.03, a, shade(col(PAL.lantern), 0.85), 0.005);
  solarCanopy(B, rng, p.x + ox, p.z + oz, a, w * 0.8, d + 0.03, H + 0.12);
  if (rng.chance(0.7)) planterBed(B, rng, p.x + c * w * 0.2 - s * (d * 0.9), p.z + s * w * 0.2 + c * (d * 0.9), a, 0.08, 0.045);
  for (let k = 0; k < 3; k++) { const t = rng.range(-0.45, 0.45); B.sphere(B.lit, p.x + c * t * w - s * (d / 2 + 0.01), H + 0.062, p.z + s * t * w + c * (d / 2 + 0.01), 0.016, col(rng.pick(PAL.leaf)), 6, 3); }
}
// ---------- SOLARPUNK TROPICAL (vegetacao) ----------
function palm(B, rng, x, z, s = 1) {
  const lean = rng.float() * PI2, k = rng.range(0.02, 0.07) * s, h = rng.range(0.3, 0.45) * s;
  const pts = [[x, H, z], [x + Math.cos(lean) * k * 0.4, H + h * 0.4, z + Math.sin(lean) * k * 0.4], [x + Math.cos(lean) * k, H + h * 0.75, z + Math.sin(lean) * k], [x + Math.cos(lean) * k * 1.4, H + h, z + Math.sin(lean) * k * 1.4]];
  B.tube(B.lit, pts, [0.03 * s, 0.026 * s, 0.022 * s, 0.018 * s], 7, col(PAL.palmTrunk));
  const top = pts[3], n = 6 + rng.int(3), ph = rng.float() * PI2;
  for (let i = 0; i < n; i++) B.leaf(B.lit, [top[0], top[1] + 0.01, top[2]], ph + (i / n) * PI2, rng.range(0.16, 0.24) * s, 0.06 * s, col(rng.pick(PAL.leaf)), { lift: 0.08 * s, droop: 0.32 * s, segs: 5 });
  for (let i = 0; i < 3; i++) B.sphere(B.lit, top[0] + rng.range(-0.02, 0.02), top[1] - 0.01, top[2] + rng.range(-0.02, 0.02), 0.014 * s, col('#6b4a2f'), 6, 3);
}
function broadleaf(B, rng, x, z, s = 1) {
  const n = 4 + rng.int(3), ph = rng.float() * PI2, c = col(rng.pick(PAL.jungle));
  for (let i = 0; i < n; i++) B.leaf(B.lit, [x, H + 0.01, z], ph + (i / n) * PI2, rng.range(0.1, 0.16) * s, 0.08 * s, shade(c, rng.range(0.9, 1.15)), { lift: 0.14 * s, droop: 0.12 * s, segs: 3 });
}
function bush(B, rng, x, z, s = 1) {
  const c = col(rng.pick(PAL.leaf));
  B.sphere(B.lit, x, H + 0.03 * s, z, 0.07 * s, c, 9, 5);
  B.sphere(B.lit, x + 0.05 * s, H + 0.02 * s, z + 0.03 * s, 0.05 * s, shade(c, 1.1), 8, 4);
  for (let k = 0; k < 3; k++) { const a = rng.float() * PI2; B.sphere(B.glow, x + Math.cos(a) * 0.06 * s, H + 0.07 * s + rng.range(-0.02, 0.02), z + Math.sin(a) * 0.06 * s, 0.012 * s, col(rng.pick(PAL.flower)), 6, 3); }
}
function bamboo(B, rng, x, z) {
  for (let k = 0; k < 3 + rng.int(2); k++) {
    const bx = x + rng.range(-0.04, 0.04), bz = z + rng.range(-0.04, 0.04), h = rng.range(0.26, 0.42), c = col(rng.pick(['#8fd36a', '#a3e07a', '#79c25a']));
    B.extrude(B.lit, ngon(bx, bz, 0.011, 7), H, h, c);
    for (let j = 1; j <= 2; j++) B.extrude(B.lit, ngon(bx, bz, 0.014, 7), H + (h * j) / 3, 0.008, shade(c, 0.8));
    B.leaf(B.lit, [bx, H + h, bz], rng.float() * PI2, 0.07, 0.025, shade(c, 1.1), { lift: 0.02, droop: 0.05, segs: 2 });
  }
}
function ecoBuilding(B, rng, p) {
  const ry = p.a + rng.range(-0.3, 0.3), c = Math.cos(ry), s = Math.sin(ry), cream = stuccoCol(rng);
  const w = rng.range(0.2, 0.26), d = rng.range(0.16, 0.2), h1 = rng.range(0.1, 0.14), h2 = rng.range(0.08, 0.12);
  B.extrude(B.lit, chamfer(p.x, p.z, w, d, ry, 0.03), H, h1, cream, { topCol: shade(cream, 0.9), sideShade: true });
  B.extrude(B.lit, chamfer(p.x, p.z, w + 0.03, d + 0.03, ry, 0.03), H + h1, 0.02, col(rng.pick(PAL.leaf)));
  const ox = -c * w * 0.15, oz = -s * w * 0.15;
  B.extrude(B.lit, chamfer(p.x + ox, p.z + oz, w * 0.6, d * 0.8, ry, 0.03), H + h1 + 0.02, h2, cream, { topCol: shade(cream, 0.9), sideShade: true });
  B.extrude(B.lit, chamfer(p.x + ox, p.z + oz, w * 0.6 + 0.03, d * 0.8 + 0.03, ry, 0.03), H + h1 + 0.02 + h2, 0.02, col(rng.pick(PAL.leaf)));
  const px = p.x + c * w * 0.28, pz = p.z + s * w * 0.28; // painel solar no terraço baixo
  B.extrude(B.lit, rect(px, pz, w * 0.3, d * 0.7, ry), H + h1 + 0.02, 0.012, col(PAL.panel), { topCol: col('#2a4aa8') });
  B.extrude(B.glow, rect(px, pz, w * 0.3, 0.006, ry), H + h1 + 0.032, 0.003, col(PAL.panelGlow));
  B.extrude(B.glow, rect(px, pz, 0.006, d * 0.7, ry), H + h1 + 0.032, 0.003, col(PAL.panelGlow));
  B.panel(B.glow, p.x + c * (w / 2 + 0.004), H + 0.03, p.z + s * (w / 2 + 0.004), w * 0.5, 0.045, ry, shade(col(PAL.warmWin), 0.85), 0.006);
  for (let k = 0; k < 2; k++) { // trepadeiras
    const t = rng.range(-0.4, 0.4), vx = p.x - s * t * d + c * (w / 2 + 0.01), vz = p.z + c * t * d + s * (w / 2 + 0.01);
    B.tube(B.lit, [[vx, H + h1 + 0.03, vz], [vx + rng.range(-0.01, 0.01), H + h1 * 0.5, vz + rng.range(-0.01, 0.01)], [vx + rng.range(-0.02, 0.02), H + 0.01, vz + rng.range(-0.02, 0.02)]], [0.008, 0.007, 0.006], 5, col(PAL.vine));
    B.sphere(B.lit, vx, H + h1 + 0.03, vz, 0.02, col(rng.pick(PAL.leaf)), 6, 3);
  }
  if (rng.chance(0.5)) { B.sphere(B.lit, p.x + ox, H + h1 + 0.04 + h2, p.z + oz, w * 0.22, col(PAL.glass), 12, 5, { dome: true }); B.annulus(B.glow, p.x + ox, H + h1 + 0.044 + h2, p.z + oz, w * 0.2, w * 0.24, 12, col('#38ff9b')); }
}
function stringLights(B, rng, p) {
  const ang = p.a + rng.range(-0.5, 0.5), L = 0.26, x0 = p.x - Math.cos(ang) * L / 2, z0 = p.z - Math.sin(ang) * L / 2, x1 = p.x + Math.cos(ang) * L / 2, z1 = p.z + Math.sin(ang) * L / 2, h = 0.2;
  B.extrude(B.lit, ngon(x0, z0, 0.009, 6), H, h, col(PAL.trunk)); B.extrude(B.lit, ngon(x1, z1, 0.009, 6), H, h, col(PAL.trunk));
  const n = 7;
  for (let i = 0; i <= n; i++) { const t = i / n; B.sphere(B.glow, x0 + (x1 - x0) * t, H + h - 0.05 * Math.sin(Math.PI * t), z0 + (z1 - z0) * t, 0.011, col(rng.chance(0.7) ? PAL.string : rng.pick(PAL.flower)), 6, 3); }
}
function turbine(B, rng, p) {
  const c = col('#f4f6fb');
  B.frustum(B.lit, p.x, H, p.z, 0.024, 0.014, 0.44, 8, c);
  B.extrude(B.lit, rect(p.x, p.z, 0.05, 0.035, p.a), H + 0.42, 0.035, shade(c, 0.9));
  B.anims.push({ type: 'rotor', x: p.x, y: H + 0.4375, z: p.z, a: p.a, speed: rng.range(1.2, 2.4) * (rng.chance(0.5) ? 1 : -1), axis: 'x', scale: 1 });
}
// Girassóis: o "sol" do solarpunk em escala de jardim — amarelo saturado que lê de longe no verde.
function sunflowers(B, rng, p) {
  for (let k = 0, n = 3 + rng.int(3); k < n; k++) {
    const x = p.x + rng.range(-0.06, 0.06), z = p.z + rng.range(-0.06, 0.06), h = rng.range(0.1, 0.17), face = p.a + rng.range(-0.6, 0.6);
    B.tube(B.lit, [[x, H, z], [x + rng.range(-0.006, 0.006), H + h * 0.55, z + rng.range(-0.006, 0.006)], [x, H + h, z]], [0.006, 0.005, 0.004], 4, col(PAL.vine));
    B.leaf(B.lit, [x, H + h * 0.4, z], face + 1.6, 0.04, 0.025, col(rng.pick(PAL.leaf)), { lift: 0.01, droop: 0.02, segs: 2 });
    const cx = x + Math.cos(face) * 0.008, cz = z + Math.sin(face) * 0.008;
    for (let j = 0; j < 8; j++) { const a = (j / 8) * PI2; B.sphere(B.glow, cx - Math.sin(face) * Math.cos(a) * 0.022, H + h + Math.sin(a) * 0.022, cz + Math.cos(face) * Math.cos(a) * 0.022, 0.011, col(PAL.sunflower), 5, 2); }
    B.sphere(B.lit, cx, H + h, cz, 0.014, col(PAL.sunCore), 6, 3);
  }
}
// Árvore frutífera de copa redonda, com frutas brilhando — horta comunitária.
function fruitTree(B, rng, x, z, s = 1) {
  const h = rng.range(0.12, 0.17) * s, c = col(rng.pick(PAL.leaf)), fruit = col(rng.pick(['#ff5c3a', '#ffb31f', '#ff3b8a']));
  B.tube(B.lit, [[x, H, z], [x + rng.range(-0.01, 0.01), H + h * 0.6, z], [x, H + h, z]], [0.016 * s, 0.013 * s, 0.01 * s], 6, col(PAL.trunk));
  B.sphere(B.lit, x, H + h + 0.04 * s, z, 0.075 * s, c, 9, 5);
  B.sphere(B.lit, x + 0.04 * s, H + h + 0.015 * s, z + 0.02 * s, 0.05 * s, shade(c, 1.12), 8, 4);
  for (let k = 0; k < 5; k++) { const a = rng.float() * PI2, e = rng.range(-0.3, 0.9); B.sphere(B.glow, x + Math.cos(a) * Math.cos(e) * 0.075 * s, H + h + 0.04 * s + Math.sin(e) * 0.07 * s, z + Math.sin(a) * Math.cos(e) * 0.075 * s, 0.011 * s, fruit, 5, 2); }
}
// Lago de jardim com vitórias-régias.
function gardenPond(B, rng, p) {
  const r = rng.range(0.07, 0.1);
  B.extrude(B.lit, ngon(p.x, p.z, r + 0.015, 10, rng.float()), H, 0.008, col('#d8cfb2'));
  B.extrude(B.lit, ngon(p.x, p.z, r, 10, rng.float()), H, 0.01, col('#1f8fb0'), { topCol: col('#3ab4d4') });
  for (let k = 0; k < 3; k++) { const a = rng.float() * PI2, d = rng.range(0, r * 0.6); B.extrude(B.lit, ngon(p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, 0.016, 7), H + 0.01, 0.002, col('#3fbf5a')); if (rng.chance(0.6)) B.sphere(B.glow, p.x + Math.cos(a) * d, H + 0.016, p.z + Math.sin(a) * d, 0.007, col('#ff6fb5'), 5, 2); }
}
// Ipê: a árvore que floresce inteira — copa de flor (amarela, rosa, roxa ou branca) e pétalas no chão.
function ipe(B, rng, x, z, s = 1) {
  const h = rng.range(0.15, 0.2) * s, fc = col(rng.pick(PAL.ipe)), lean = rng.float() * PI2, tx = x + Math.cos(lean) * 0.015 * s, tz = z + Math.sin(lean) * 0.015 * s;
  B.tube(B.lit, [[x, H, z], [x + Math.cos(lean) * 0.005, H + h * 0.5, z + Math.sin(lean) * 0.005], [tx, H + h, tz]], [0.016 * s, 0.012 * s, 0.009 * s], 6, col(PAL.trunk));
  for (let k = 0; k < 2; k++) { const a = lean + (k ? 2.2 : -2.2); B.tube(B.lit, [[x, H + h * 0.55, z], [x + Math.cos(a) * 0.045 * s, H + h * 0.95, z + Math.sin(a) * 0.045 * s]], [0.008 * s, 0.005 * s], 5, col(PAL.trunk)); }
  for (let k = 0; k < 6; k++) { const a = (k / 6) * PI2 + rng.float(), d = k ? rng.range(0.035, 0.06) * s : 0; B.sphere(B.lit, tx + Math.cos(a) * d, H + h + rng.range(0.01, 0.04) * s, tz + Math.sin(a) * d, rng.range(0.035, 0.05) * s, shade(fc, rng.range(0.92, 1.12)), 8, 4); }
  for (let k = 0; k < 6; k++) { const a = rng.float() * PI2; B.sphere(B.glow, tx + Math.cos(a) * 0.06 * s, H + h + rng.range(0.02, 0.06) * s, tz + Math.sin(a) * 0.06 * s, 0.01 * s, shade(fc, 1.2), 5, 2); }
  for (let k = 0; k < 7; k++) { const a = rng.float() * PI2, d = rng.range(0.04, 0.1) * s; B.extrude(B.lit, ngon(x + Math.cos(a) * d, z + Math.sin(a) * d, 0.007, 5, rng.float()), H, 0.002, fc); } // pétalas caídas
}
// Árvore de copa-nuvem: três ou quatro bolas de verdes diferentes, gordinha e baixa.
function cloudTree(B, rng, x, z, s = 1) {
  const h = rng.range(0.08, 0.12) * s, c = col(rng.pick(PAL.leaf));
  B.tube(B.lit, [[x, H, z], [x, H + h, z]], [0.018 * s, 0.013 * s], 6, col(PAL.trunk));
  B.sphere(B.lit, x, H + h + 0.06 * s, z, 0.07 * s, c, 9, 5);
  for (let k = 0, n = 3 + rng.int(2); k < n; k++) { const a = (k / n) * PI2 + rng.float(); B.sphere(B.lit, x + Math.cos(a) * 0.055 * s, H + h + rng.range(0.02, 0.05) * s, z + Math.sin(a) * 0.055 * s, rng.range(0.045, 0.058) * s, shade(c, rng.range(0.85, 1.18)), 8, 4); }
  if (rng.chance(0.5)) for (let k = 0; k < 4; k++) { const a = rng.float() * PI2; B.sphere(B.glow, x + Math.cos(a) * 0.08 * s, H + h + rng.range(0.03, 0.09) * s, z + Math.sin(a) * 0.08 * s, 0.01 * s, col(rng.pick(PAL.flower)), 5, 2); }
}
// Canteiro de flores em fileiras de cores (campo de tulipas de bairro).
function flowerBed(B, rng, p) {
  const a = p.a + rng.range(-0.4, 0.4), ca = Math.cos(a), sa = Math.sin(a), w = 0.16, d = 0.11;
  B.extrude(B.lit, chamfer(p.x, p.z, w, d, a, 0.02), H, 0.012, col(PAL.planter), { topCol: col(PAL.soil) });
  for (let row = 0; row < 3; row++) {
    const fc = col(rng.pick(PAL.meadow.concat(PAL.flower))), off = (row - 1) * 0.032;
    for (let k = 0; k < 5; k++) {
      const t = (k - 2) * 0.03, x = p.x + ca * t - sa * off, z = p.z + sa * t + ca * off;
      B.extrude(B.lit, ngon(x, z, 0.004, 4), H + 0.012, 0.03, col(PAL.vine));
      B.sphere(B.glow, x, H + 0.045, z, 0.012, fc, 6, 3);
    }
  }
}
function drawSolar(B, rng, pts) {
  for (const p of pts) {
    const r = rng.float();
    // ~40% construção, ~60% verde: o vilarejo é cercado de árvores e flores, não de casas
    if (r < 0.14) stuccoHouse(B, rng, p);
    else if (r < 0.2) containerHouse(B, rng, p);
    else if (r < 0.27) ecoBuilding(B, rng, p);
    else if (r < 0.3) greenhouse(B, rng, p.x, p.z, p.a);
    else if (r < 0.32) solarCanopy(B, rng, p.x, p.z, p.a);
    else if (r < 0.35) planterBed(B, rng, p.x, p.z, p.a);
    else if (r < 0.39) vaxTurbine(B, rng, p);
    else if (r < 0.41) turbine(B, rng, p);
    else if (r < 0.46) palm(B, rng, p.x, p.z, rng.range(0.7, 0.95));
    else if (r < 0.52) fruitTree(B, rng, p.x, p.z, rng.range(0.85, 1.15));
    else if (r < 0.6) ipe(B, rng, p.x, p.z, rng.range(1.1, 1.4));
    else if (r < 0.68) cloudTree(B, rng, p.x, p.z, rng.range(0.85, 1.15));
    else if (r < 0.72) broadleaf(B, rng, p.x, p.z, rng.range(0.8, 1.1));
    else if (r < 0.77) bush(B, rng, p.x, p.z, rng.range(0.8, 1.1));
    else if (r < 0.83) sunflowers(B, rng, p);
    else if (r < 0.89) flowerBed(B, rng, p);
    else if (r < 0.93) gardenPond(B, rng, p);
    else if (r < 0.96) bamboo(B, rng, p.x, p.z);
    else stringLights(B, rng, p);
  }
}

// ---------- MONTANHA (pedra laranja-marrom) ----------
const rockCol = (rng) => col(rng.pick(PAL.rock));
function peak(B, rng, p, s = 1) {
  // Rocha erodida em degraus, com a agulha do topo quebrada e fora do eixo. O cone liso que
  // estava aqui lia como pirâmide de longe e enchia o hexágono de triângulos iguais.
  const c = rockCol(rng), ry = rng.float() * PI2, segs = 5 + rng.int(2);
  const r0 = rng.range(0.12, 0.17) * s, h0 = rng.range(0.1, 0.17) * s;
  B.frustum(B.lit, p.x, H, p.z, r0, r0 * rng.range(0.66, 0.8), h0, segs, c, ry, { topCol: shade(c, 1.18) });
  const ox = rng.range(-0.028, 0.028) * s, oz = rng.range(-0.028, 0.028) * s;
  const r1 = r0 * rng.range(0.55, 0.72), h1 = rng.range(0.08, 0.16) * s;
  B.frustum(B.lit, p.x + ox, H + h0, p.z + oz, r1, r1 * rng.range(0.5, 0.7), h1, segs, shade(c, 1.09), ry + 0.7, { topCol: shade(c, 1.3) });
  let top = H + h0 + h1;
  if (rng.chance(0.72)) { // agulha do cume, inclinada e com a ponta calcinada pelo sol
    const r2 = r1 * rng.range(0.4, 0.6), h2 = rng.range(0.07, 0.17) * s;
    B.frustum(B.lit, p.x + ox * 1.9, H + h0 + h1, p.z + oz * 1.9, r2, r2 * rng.range(0.12, 0.4), h2, segs, shade(c, 0.93), ry + 1.4, { topCol: col(PAL.brickLight) });
    top += h2;
  }
  for (let k = 0, n = 1 + rng.int(2); k < n; k++) { // contrafortes na saia
    const ang = ry + rng.float() * PI2, d = r0 * rng.range(0.72, 1.0);
    B.frustum(B.lit, p.x + Math.cos(ang) * d, H, p.z + Math.sin(ang) * d, r0 * rng.range(0.3, 0.46), r0 * 0.12, h0 * rng.range(0.45, 0.85), 5, shade(c, rng.range(0.82, 0.96)), ang);
  }
  for (let k = 0, n = 1 + rng.int(2); k < n; k++) { // veios de minério âmbar brilhando
    const ang = ry + rng.float() * PI2, rr = r0 * rng.range(0.5, 0.66), y = H + (top - H) * rng.range(0.1, 0.45);
    B.panel(B.glow, p.x + Math.cos(ang) * rr, y, p.z + Math.sin(ang) * rr, 0.028, (top - H) * 0.18, ang + Math.PI / 2, col(PAL.ore), 0.006);
  }
}
function boulders(B, rng, x, z, s = 1) {
  const c = rockCol(rng), n = 2 + rng.int(3);
  for (let k = 0; k < n; k++) {
    const bx = x + rng.range(-0.06, 0.06) * s, bz = z + rng.range(-0.06, 0.06) * s, r = rng.range(0.03, 0.065) * s;
    B.sphere(B.lit, bx, H + r * 0.35, bz, r, shade(c, rng.range(0.85, 1.15)), 6, 3, { sy: rng.range(0.65, 0.9) });
  }
}
function mesa(B, rng, p) {
  const tiers = 2 + rng.int(2), ry = rng.float() * PI2; let r = rng.range(0.1, 0.15), y = H;
  for (let t = 0; t < tiers; t++) {
    const th = rng.range(0.05, 0.09), c = col(PAL.rock[(t * 2 + rng.int(2)) % PAL.rock.length]);
    B.extrude(B.lit, ngon(p.x, p.z, r, 7, ry + t * 0.3), y, th, c, { topCol: shade(c, 1.2), sideShade: true }); // estratos
    y += th; r *= rng.range(0.7, 0.82);
  }
  if (rng.chance(0.5)) { B.extrude(B.lit, ngon(p.x, p.z, 0.008, 6), y, 0.1, col(PAL.post)); B.sphere(B.glow, p.x, y + 0.11, p.z, 0.014, col(PAL.beacon), 6, 3); } // farol
}
function arch(B, rng, p) {
  const ang = p.a + rng.range(-0.6, 0.6), c = rockCol(rng), dx = Math.cos(ang) * 0.09, dz = Math.sin(ang) * 0.09, h = rng.range(0.14, 0.2);
  B.extrude(B.lit, ngon(p.x - dx, p.z - dz, 0.032, 6, ang), H, h, c, { sideShade: true }); B.extrude(B.lit, ngon(p.x + dx, p.z + dz, 0.03, 6, ang), H, h * 0.92, shade(c, 0.9), { sideShade: true });
  B.extrude(B.lit, chamfer(p.x, p.z, 0.26, 0.07, ang, 0.015), H + h * 0.92, 0.05, shade(c, 1.1), { topCol: shade(c, 1.25) });
  B.panel(B.glow, p.x, H + h * 0.92 + 0.012, p.z, 0.18, 0.02, ang, col(PAL.ore), 0.075); // faixa âmbar no lintel
}
function mine(B, rng, p) {
  const ry = p.a + Math.PI + rng.range(-0.3, 0.3), c = Math.cos(ry), s = Math.sin(ry), rock = col(PAL.rockDark);
  B.extrude(B.lit, chamfer(p.x, p.z, 0.15, 0.11, ry, 0.02), H, 0.11, rock, { topCol: shade(rock, 1.3), sideShade: true });
  B.sphere(B.lit, p.x - c * 0.03, H + 0.06, p.z - s * 0.03, 0.07, rockCol(rng), 7, 3, { dome: true, sy: 0.8 });
  B.panel(B.glow, p.x + c * 0.077, H + 0.012, p.z + s * 0.077, 0.06, 0.065, ry, col(PAL.ore), 0.006); // boca iluminada
  for (const sd of [1, -1]) B.ribbon(B.lit, [[p.x + c * 0.08 - s * sd * 0.02, p.z + s * 0.08 + c * sd * 0.02], [p.x + c * 0.2 - s * sd * 0.02, p.z + s * 0.2 + c * sd * 0.02]], 0.008, H + 0.003, col(PAL.railSteel)); // trilhos da mina
  B.extrude(B.lit, ngon(p.x - s * 0.09 + c * 0.04, p.z + c * 0.09 + s * 0.04, 0.009, 6), H, 0.2, col(PAL.post)); B.sphere(B.glow, p.x - s * 0.09 + c * 0.04, H + 0.21, p.z + c * 0.09 + s * 0.04, 0.016, col(PAL.lampWarm), 6, 3);
}
function mast(B, rng, p) {
  boulders(B, rng, p.x, p.z, 0.9);
  const h = rng.range(0.36, 0.5);
  B.frustum(B.lit, p.x, H + 0.02, p.z, 0.014, 0.006, h, 4, col('#c9cfe0'), Math.PI / 4);
  for (const f of [0.45, 0.7]) B.extrude(B.lit, rect(p.x, p.z, 0.09 * (1 - f * 0.5), 0.008, p.a), H + 0.02 + h * f, 0.006, col('#8d93ad'));
  B.annulus(B.glow, p.x, H + 0.02 + h * 0.58, p.z, 0.012, 0.024, 8, col(PAL.oreGlow));
  B.sphere(B.glow, p.x, H + 0.03 + h, p.z, 0.016, col(PAL.beacon), 6, 3);
}
// ---------- SANDPUNK: tecnologia remendada vivendo dentro das ruínas ----------
// O bioma é sandpunk: o deserto antigo (zigurates, tijolo cru, lápis) habitado por nômades com
// tecnologia de sucata — torres coletoras de umidade, cascos gigantes meio enterrados, tendas
// com velas solares. Metal entra fosco e desbotado (PAL.scrap/rust); o neon só em pontos.
function vaporator(B, rng, p) { // fazenda de umidade: torres finas com anéis e coletor no topo
  for (let k = 0, n = 1 + rng.int(3); k < n; k++) {
    const ang = p.a + rng.range(-1.6, 1.6), d = k ? rng.range(0.06, 0.1) : 0, x = p.x + Math.cos(ang) * d, z = p.z + Math.sin(ang) * d;
    const h = rng.range(0.16, 0.26) * (k ? 0.75 : 1), m = col(rng.pick(PAL.scrap));
    B.frustum(B.lit, x, H, z, 0.024, 0.02, 0.03, 8, col(rng.pick(PAL.cloth))); // base enrolada em pano
    B.frustum(B.lit, x, H + 0.03, z, 0.012, 0.01, h, 8, m, 0, { topCol: shade(m, 1.2) });
    for (const f of [0.35, 0.7]) B.frustum(B.lit, x, H + 0.03 + h * f, z, 0.022, 0.022, 0.012, 8, shade(m, 0.85));
    B.annulus(B.glow, x, H + 0.03 + h * 0.52, z, 0.012, 0.02, 8, shade(col('#22f3ff'), 0.75)); // condensador aceso
    B.frustum(B.lit, x, H + 0.03 + h, z, 0.008, 0.028, 0.02, 8, shade(m, 1.1)); // coletor
    B.sphere(B.glow, x, H + 0.055 + h, z, 0.008, col(PAL.beacon), 5, 3);
  }
}
function wreck(B, rng, p) { // casco de máquina gigante afundado na areia, com costelas à mostra
  const ang = p.a + rng.range(-1, 1), c = Math.cos(ang), s = Math.sin(ang), L = rng.range(0.2, 0.28), r = rng.range(0.05, 0.07), tilt = rng.range(0.02, 0.06);
  const hull = col(rng.pick(PAL.rust)), pts = [], rad = [];
  for (let i = 0; i <= 4; i++) { const t = i / 4 - 0.5; pts.push([p.x + c * t * L, H - r * 0.35 + tilt * t * 2, p.z + s * t * L]); rad.push(r * (1 - Math.abs(t) * 0.5)); }
  B.tube(B.lit, pts, rad, 8, hull, { capEnd: true });
  for (let k = 0; k < 3; k++) { // costelas
    const t = (k - 1) * 0.28, x = p.x + c * t * L, z = p.z + s * t * L;
    const yc = H - r * 0.35 + tilt * t * 2, R = r * (1 - Math.abs(t) * 0.5) * 1.15, arc = [];
    for (let j = 0; j <= 6; j++) { const th = (j / 6) * Math.PI; arc.push([x - s * Math.cos(th) * R, yc + Math.sin(th) * R, z + c * Math.cos(th) * R]); }
    B.tube(B.lit, arc, arc.map(() => 0.006), 4, shade(col(rng.pick(PAL.scrap)), 0.8));
  }
  B.sphere(B.glow, p.x + c * L * 0.42, H + r * 0.3 + tilt, p.z + s * L * 0.42, 0.012, col(PAL.oreGlow), 6, 3); // luz que ainda pisca
  for (let k = 0; k < 3; k++) { const a2 = ang + rng.range(-2.5, 2.5), dd = rng.range(0.08, 0.14); B.extrude(B.lit, rect(p.x + Math.cos(a2) * dd, p.z + Math.sin(a2) * dd, rng.range(0.02, 0.04), rng.range(0.012, 0.02), a2), H, rng.range(0.006, 0.014), col(rng.pick(PAL.scrap))); } // sucata espalhada
  B.sphere(B.lit, p.x, H - 0.01, p.z, L * 0.55, shade(col(PAL.sandTrail), 1.02), 9, 3, { dome: true, sy: 0.16 }); // duna que engole o casco
}
function nomadCamp(B, rng, p) { // tenda nômade + vela solar de pano esticada num mastro
  const ang = p.a + rng.range(-0.6, 0.6), c = Math.cos(ang), s = Math.sin(ang), cloth = col(rng.pick(PAL.cloth));
  B.extrude(B.lit, rect(p.x, p.z, 0.11, 0.08, ang), H, 0.012, shade(cloth, 0.7));
  prismRoof(B, B.lit, p.x, p.z, 0.12, 0.09, ang, H + 0.012, 0.05, cloth);
  B.panel(B.glow, p.x + c * 0.061, H + 0.014, p.z + s * 0.061, 0.03, 0.03, ang, col(PAL.lantern), 0.004); // entrada acesa
  const mx = p.x - c * 0.1 + -s * 0.05, mz = p.z - s * 0.1 + c * 0.05, mh = rng.range(0.16, 0.22);
  B.extrude(B.lit, ngon(mx, mz, 0.006, 5), H, mh, col(PAL.woodDark));
  tiltPanel(B, mx + c * 0.035, mz + s * 0.035, 0.09, 0.07, ang + 0.4, H + mh * 0.55, 0.05, col(PAL.panel), shade(col(PAL.panelGlow), 0.8)); // vela solar
  B.sphere(B.glow, mx, H + mh + 0.008, mz, 0.009, col(PAL.goldGlow), 5, 3);
  for (let k = 0; k < 2; k++) B.frustum(B.lit, p.x + s * (0.06 + k * 0.02), H, p.z - c * (0.06 + k * 0.02), 0.012, 0.012, 0.02, 7, col(rng.pick(PAL.scrap))); // galões de água
}
function drawRock(B, rng, pts) {
  for (const p of pts) {
    const r = rng.float();
    if (r < 0.10) ziggurat(B, rng, p, rng.range(0.85, 1.15));
    else if (r < 0.19) mudHouses(B, rng, p);
    else if (r < 0.24) obelisk(B, rng, p, rng.range(0.85, 1.15));
    else if (r < 0.31) steles(B, rng, p);
    else if (r < 0.36) ishtarGate(B, rng, p);
    else if (r < 0.41) oasis(B, rng, p);
    else if (r < 0.47) ruinRow(B, rng, p);
    else if (r < 0.56) vaporator(B, rng, p);
    else if (r < 0.63) wreck(B, rng, p);
    else if (r < 0.70) nomadCamp(B, rng, p);
    else if (r < 0.78) peak(B, rng, p, rng.range(0.8, 1.1));
    else if (r < 0.85) boulders(B, rng, p.x, p.z, rng.range(0.9, 1.4));
    else if (r < 0.89) mesa(B, rng, p);
    else if (r < 0.92) arch(B, rng, p);
    else if (r < 0.96) mine(B, rng, p);
    else mast(B, rng, p);
  }
  if (pts.length >= 2 && rng.chance(0.16)) B.anims.push({ type: 'bolt', x0: pts[0].x, z0: pts[0].z, x1: pts[1].x, z1: pts[1].z, y: H + 0.34, color: '#fff1c8' }); // tempestade de areia entre as ruínas
}

// ---------- MESOPOTÂMIA: o que faz o bioma de terra virar "antigo" ----------
// Zigurates, casario de tijolo cru, obeliscos, estelas de cuneiforme e um portal de lápis-lazúli.
// Sem pirâmides: elas são egípcias, e lado a lado com os picos do bioma enchiam o hexágono de
// triângulos iguais. O degrau do zigurate é a forma que carrega a Mesopotâmia aqui.
// A regra de leitura: pedra natural é facetada e irregular; o que é *construído* é
// ortogonal, tem friso azul e um ponto de dourado. É esse contraste que dá o ar sagrado.
const brickCol = (rng) => col(rng.pick(PAL.brick));

function brazier(B, x, z, s = 1) { // pira acesa: pontua a arquitetura sem acender o tile inteiro
  B.frustum(B.lit, x, H, z, 0.014 * s, 0.009 * s, 0.05 * s, 6, col(PAL.brickDark));
  B.frustum(B.lit, x, H + 0.05 * s, z, 0.01 * s, 0.019 * s, 0.022 * s, 6, col(PAL.brickLight), 0, { noTop: true });
  B.sphere(B.glow, x, H + 0.078 * s, z, 0.014 * s, col(PAL.goldGlow), 6, 3);
}

// Zigurate: plataformas em degrau, escadaria frontal encostada na face, santuário aceso no topo.
function ziggurat(B, rng, p, s = 1) {
  const tiers = 3 + rng.int(2), ry = p.a + rng.range(-0.25, 0.25), c = Math.cos(ry), sn = Math.sin(ry);
  const body = brickCol(rng), lap = shade(col(PAL.lapisGlow), 0.55), w0 = rng.range(0.26, 0.34) * s;
  let w = w0, d = w0 * rng.range(0.76, 0.92), y = H;
  for (let t = 0; t < tiers; t++) {
    const th = (0.072 - t * 0.008) * s, cc = shade(body, 1 - t * 0.05);
    B.extrude(B.lit, rect(p.x, p.z, w, d, ry), y, th, cc, { topCol: shade(cc, 1.22), sideShade: true });
    if (t % 2 === 0 || t === tiers - 1) B.extrude(B.glow, rect(p.x, p.z, w + 0.008, d + 0.008, ry), y + th * 0.6, 0.005 * s, lap); // friso de glifos (alternado)
    y += th; w *= 0.74; d *= 0.74;
  }
  const sw = Math.max(w, 0.06 * s), sh = 0.055 * s; // santuário
  B.extrude(B.lit, rect(p.x, p.z, sw * 1.3, sw, ry), y, sh, col(PAL.brickLight), { topCol: col(PAL.gold), sideShade: true });
  B.panel(B.glow, p.x + c * sw * 0.66, y + 0.008 * s, p.z + sn * sw * 0.66, sw * 0.52, sh * 0.6, ry, col(PAL.glyph), 0.006); // porta acesa
  B.sphere(B.glow, p.x, y + sh + 0.014 * s, p.z, 0.015 * s, col(PAL.goldGlow), 6, 3); // fogo do altar
  const steps = 8, run = w0 / 2 + 0.05 * s; // escadaria: colunas crescentes encostando na face frontal
  for (let k = 0; k < steps; k++) {
    const f = (k + 1) / steps, dist = run * (1 - f) + 0.014 * s;
    B.extrude(B.lit, rect(p.x + c * dist, p.z + sn * dist, 0.028 * s, w0 * 0.32, ry), H, (y - H) * f * 0.94, shade(body, 1.06 + 0.08 * (k % 2)), { topCol: col(PAL.brickLight) });
  }
  for (const sd of [1, -1]) brazier(B, p.x + c * (run + 0.022 * s) - sn * sd * w0 * 0.26, p.z + sn * (run + 0.022 * s) + c * sd * w0 * 0.26, s * 0.9);
  if (rng.chance(0.4)) B.anims.push({ type: 'drone', geo: 'glyph', x: p.x, y: y + 0.13 * s, z: p.z, r: 0.1 * s, speed: rng.range(0.35, 0.6) * (rng.chance(0.5) ? 1 : -1), color: PAL.lapisGlow }); // tabuletas em órbita
}

// Casario de tijolo cru: caixas baixas de teto plano com parapeito. É o contraponto horizontal
// dos zigurates e dos picos — e a escala humana que faz o deserto parecer habitado, não cenográfico.
function mudHouses(B, rng, p) {
  const ang = p.a + rng.range(-0.6, 0.6), px = -Math.sin(ang), pz = Math.cos(ang), n = 2 + rng.int(3);
  for (let k = 0; k < n; k++) {
    const t = (k - (n - 1) / 2) * rng.range(0.058, 0.078);
    const x = p.x + px * t + Math.cos(ang) * rng.range(-0.022, 0.022), z = p.z + pz * t + Math.sin(ang) * rng.range(-0.022, 0.022);
    const w = rng.range(0.05, 0.072), d = rng.range(0.046, 0.066), hh = rng.range(0.042, 0.095), c = brickCol(rng);
    B.extrude(B.lit, rect(x, z, w, d, ang), H, hh, c, { topCol: shade(c, 1.24), sideShade: true });
    B.extrude(B.lit, rect(x, z, w + 0.009, d + 0.009, ang), H + hh, 0.007, shade(c, 0.82), { topCol: col(PAL.brickLight), sideShade: true }); // parapeito do terraço
    if (rng.chance(0.6)) B.panel(B.glow, x + Math.cos(ang) * (w / 2 + 0.002), H + 0.004, z + Math.sin(ang) * (w / 2 + 0.002), d * 0.34, hh * 0.52, ang, col(PAL.lantern), 0.004); // porta acesa
    if (rng.chance(0.45)) for (let j = 0; j < 3; j++) // vigas de madeira saindo da parede
      B.extrude(B.lit, rect(x - px * (d / 2 + 0.006) + Math.cos(ang) * (j - 1) * w * 0.3, z - pz * (d / 2 + 0.006) + Math.sin(ang) * (j - 1) * w * 0.3, 0.008, 0.016, ang), H + hh * 0.76, 0.008, col(PAL.woodDark));
    if (rng.chance(0.3)) B.tube(B.lit, [[x + Math.cos(ang) * (w / 2 + 0.012), H, z + Math.sin(ang) * (w / 2 + 0.012)], [x + Math.cos(ang) * (w / 2 - 0.004), H + hh + 0.014, z + Math.sin(ang) * (w / 2 - 0.004)]], [0.0035, 0.0035], 4, col(PAL.woodDark)); // escada de mão
  }
  for (let k = 0, m = 1 + rng.int(2); k < m; k++) { // potes de barro encostados
    const a2 = ang + rng.range(-2, 2), dd = rng.range(0.07, 0.1);
    B.frustum(B.lit, p.x + Math.cos(a2) * dd, H, p.z + Math.sin(a2) * dd, 0.009, 0.013, 0.016, 6, col(PAL.brickDark));
    B.frustum(B.lit, p.x + Math.cos(a2) * dd, H + 0.016, p.z + Math.sin(a2) * dd, 0.013, 0.007, 0.012, 6, brickCol(rng));
  }
}

// Obelisco: fuste afunilado, coluna de glifos e pirâmide dourada no topo.
function obelisk(B, rng, p, s = 1) {
  const h = rng.range(0.28, 0.44) * s, r = rng.range(0.019, 0.027) * s, ry = p.a + rng.range(-0.4, 0.4) + Math.PI / 4, body = col(PAL.brickLight);
  B.extrude(B.lit, rect(p.x, p.z, r * 4.2, r * 4.2, ry), H, 0.022 * s, shade(body, 0.74), { topCol: shade(body, 0.86), sideShade: true });
  const y0 = H + 0.022 * s;
  B.frustum(B.lit, p.x, y0, p.z, r, r * 0.64, h, 4, body, ry, { noTop: true });
  B.cone(B.glow, p.x, y0 + h, p.z, r * 0.64, r * 1.8, col(PAL.goldGlow), 4, ry);
  const fa = ry + Math.PI / 4; // face plana do fuste
  B.panel(B.glow, p.x + Math.cos(fa) * (r * 0.78), y0 + h * 0.12, p.z + Math.sin(fa) * (r * 0.78), r * 1.1, h * 0.7, fa, shade(col(PAL.glyph), 0.7), 0.004); // coluna de glifos em âmbar
}

// Estelas: tabuletas de cuneiforme fincadas no chão — barato e é o que mais dá "sítio arqueológico".
function steles(B, rng, p) {
  for (let k = 0, n = 2 + rng.int(3); k < n; k++) {
    const ang = p.a + rng.range(-1.1, 1.1), d = rng.range(0.015, 0.075);
    const x = p.x + Math.cos(ang) * d, z = p.z + Math.sin(ang) * d;
    const hh = rng.range(0.07, 0.15), ww = rng.range(0.04, 0.07), ry = ang + rng.range(-0.7, 0.7), body = col(rng.pick(PAL.brick));
    B.extrude(B.lit, rect(x, z, 0.015, ww, ry), H, hh, body, { topCol: col(PAL.brickLight), sideShade: true });
    B.sphere(B.lit, x, H + hh, z, ww * 0.5, col(PAL.brickLight), 6, 3, { dome: true, sy: 0.45 });
    for (let j = 0; j < 3; j++) B.panel(B.glow, x + Math.cos(ry) * 0.0095, H + hh * (0.22 + j * 0.24), z + Math.sin(ry) * 0.0095, ww * 0.6, 0.007, ry, shade(col(PAL.lapisGlow), 0.62), 0.004);
  }
}

// Portal de Ishtar: duas torres revestidas de lápis, rosetas de ouro e dois guardiões.
function ishtarGate(B, rng, p) {
  const ry = p.a + Math.PI + rng.range(-0.3, 0.3), c = Math.cos(ry), sn = Math.sin(ry), px = -sn, pz = c;
  const lap = col(PAL.lapis), gold = col(PAL.gold), d = 0.098, h = rng.range(0.19, 0.27);
  for (const sd of [1, -1]) {
    const tx = p.x + px * sd * d, tz = p.z + pz * sd * d;
    B.extrude(B.lit, rect(tx, tz, 0.072, 0.072, ry), H, h, lap, { topCol: shade(lap, 1.7), sideShade: true });
    for (let k = 0; k < 3; k++) B.sphere(B.glow, tx + c * 0.038, H + h * (0.24 + k * 0.26), tz + sn * 0.038, 0.011, gold, 6, 3); // rosetas
    B.extrude(B.lit, rect(tx, tz, 0.086, 0.086, ry), H + h, 0.016, col(PAL.brickLight), { topCol: gold, sideShade: true });
    const gx = tx + c * 0.075, gz = tz + sn * 0.075; // guardião (lamassu esquemático)
    B.extrude(B.lit, rect(gx, gz, 0.05, 0.03, ry), H, 0.036, col(PAL.brickLight), { topCol: col(PAL.brick[2]) });
    B.sphere(B.lit, gx + c * 0.016, H + 0.05, gz + sn * 0.016, 0.017, col(PAL.brickLight), 6, 3);
    B.sphere(B.glow, gx + c * 0.03, H + 0.052, gz + sn * 0.03, 0.005, col(PAL.glyph), 5, 3); // olho
    for (const wsd of [1, -1]) B.leaf(B.lit, [gx - c * 0.012, H + 0.038, gz - sn * 0.012], ry + Math.PI / 2 * wsd, 0.032, 0.02, gold, { lift: 0.018, droop: 0.004, segs: 2 }); // asas
  }
  B.extrude(B.lit, rect(p.x, p.z, 0.05, 2 * d + 0.072, ry), H + h * 0.8, 0.032, col(PAL.brickLight), { topCol: gold, sideShade: true }); // lintel
  B.panel(B.glow, p.x + c * 0.027, H + h * 0.82, p.z + sn * 0.027, 2 * d, 0.022, ry, shade(col(PAL.lapisGlow), 0.62), 0.005);
  B.panel(B.glow, p.x, H + 0.004, p.z, 2 * d - 0.072, h * 0.72, ry, shade(col(PAL.glyph), 0.8), 0.008); // vão aceso
}

// Oásis: a pausa do deserto. Água escura, tamareiras e juncos — e é para onde a caravana vai.
function oasis(B, rng, p) {
  const r = rng.range(0.07, 0.095), ry = rng.float() * PI2;
  B.extrude(B.lit, ngon(p.x, p.z, r + 0.032, 11, ry), H, 0.004, col('#6f8a52'), { topCol: col('#7d9a5c') });
  B.extrude(B.lit, ngon(p.x, p.z, r, 11, ry + 0.3), H + 0.0045, 0.004, col(PAL.oasisWater));
  B.extrude(B.glow, ngon(p.x, p.z, r * 0.74, 11, ry + 0.6), H + 0.0095, 0.0015, shade(col('#2dffb8'), 0.3)); // reflexo
  for (let k = 0; k < 2; k++) { const a = p.a + rng.range(-1.5, 1.5); palm(B, rng, p.x + Math.cos(a) * (r + 0.055), p.z + Math.sin(a) * (r + 0.055), rng.range(0.55, 0.8)); }
  for (let k = 0; k < 5; k++) { const a = rng.float() * PI2, dd = r + rng.range(0.008, 0.03); B.cone(B.lit, p.x + Math.cos(a) * dd, H, p.z + Math.sin(a) * dd, 0.008, rng.range(0.04, 0.08), col(PAL.reed), 4, a); }
}

// Ruína: fileira de colunas quebradas, meio enterradas. O "atemporal" mora aqui.
function ruinRow(B, rng, p) {
  const ang = p.a + Math.PI / 2 + rng.range(-0.6, 0.6), n = 3 + rng.int(3), gap = rng.range(0.045, 0.062);
  B.extrude(B.lit, rect(p.x, p.z, 0.05, gap * n, ang + Math.PI / 2), H, 0.008, col(PAL.brickDark), { topCol: shade(col(PAL.brick[3]), 0.9) }); // estilóbata
  for (let k = 0; k < n; k++) {
    const t = (k - (n - 1) / 2) * gap, x = p.x + Math.cos(ang) * t, z = p.z + Math.sin(ang) * t, hh = rng.range(0.035, 0.13);
    B.frustum(B.lit, x, H + 0.008, z, 0.016, 0.014, hh, 7, col(rng.pick(PAL.brick)), rng.float(), { topCol: col(PAL.brickLight) });
    if (rng.chance(0.35)) B.extrude(B.lit, ngon(x, z, 0.021, 7, rng.float()), H + 0.008 + hh, 0.008, col(PAL.brickLight)); // capitel
  }
  if (rng.chance(0.6)) B.panel(B.glow, p.x, H + 0.012, p.z, gap * n * 0.7, 0.006, ang, shade(col(PAL.lapisGlow), 0.55), 0.006); // friso caído, ainda aceso
}

// ---------- ESGOTO / LAGOA ----------
function barrel(B, rng, x, z) {
  B.extrude(B.lit, ngon(x, z, 0.034, 12, rng.float() * 6), H, 0.1, col(PAL.barrel), { topCol: col('#3a3e4a'), sideShade: true });
  B.annulus(B.glow, x, H + 0.05, z, 0.034, 0.038, 12, col(PAL.barrelRing));
  B.annulus(B.glow, x, H + 0.08, z, 0.034, 0.038, 12, col(PAL.barrelRing));
}
function outletPipe(B, rng, x, z, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  B.tube(B.lit, [[x - c * 0.12, H + 0.06, z - s * 0.12], [x - c * 0.04, H + 0.06, z - s * 0.04], [x, H + 0.05, z]], [0.028, 0.028, 0.026], 10, col(PAL.pipe), { capEnd: true });
  B.annulus(B.glow, x - c * 0.06, H + 0.09, z - s * 0.06, 0.028, 0.034, 10, col('#ff7a1a'));
  B.sphere(B.glow, x + c * 0.01, H + 0.045, z + s * 0.01, 0.018, col(PAL.algae), 8, 4);
}
function sewageChannel(B, rng, path, withCurbs = true) {
  B.ribbon(B.lit, path, 0.4, H + 0.002, col(PAL.concrete));
  B.ribbon(B.water, path, 0.26, H + 0.01, col('#ffffff'));
  const curb = col(PAL.curb);
  for (const side of [1, -1]) {
    const inner = offsetLine(path, side * 0.13), outer = offsetLine(path, side * 0.2);
    B.strip(B.lit, inner, outer, H + 0.055, shade(curb, 1.15));
    B.wall(B.lit, inner, H + 0.002, H + 0.055, curb, -side);
    B.wall(B.lit, outer, H, H + 0.055, shade(curb, 0.85), side);
    let k = 0;
    for (const s of samplePath(path, 0.09, 0.05)) { if (k++ % 2 === 0) B.extrude(B.glow, rect(s.x - Math.sin(s.a) * side * 0.165, s.z + Math.cos(s.a) * side * 0.165, 0.04, 0.05, s.a), H + 0.055, 0.004, col(PAL.hazard)); }
  }
  for (const s of samplePath(path, 0.14, 0.07)) if (rng.chance(0.5)) B.sphere(B.glow, s.x - Math.sin(s.a) * rng.range(-0.1, 0.1), H + 0.012, s.z + Math.cos(s.a) * rng.range(-0.1, 0.1), rng.range(0.008, 0.016), col(PAL.algae), 6, 3);
}
function drawSewage(B, rng, lay) {
  if (lay.kind === 'line') {
    const path = lay.polys[0], L = pathLength(path);
    sewageChannel(B, rng, path);
    if (!lay.dual && rng.chance(0.5)) { const s = pointAt(path, L * rng.range(0.3, 0.7)), side = rng.pick([1, -1]); outletPipe(B, rng, s.x - Math.sin(s.a) * side * 0.15, s.z + Math.cos(s.a) * side * 0.15, s.a + (side > 0 ? -Math.PI / 2 : Math.PI / 2)); }
    if (!lay.dual && rng.chance(0.4)) { const s = pointAt(path, L * rng.range(0.25, 0.75)); barrel(B, rng, s.x - Math.sin(s.a) * rng.range(-0.05, 0.05), s.z + Math.cos(s.a) * rng.range(-0.05, 0.05)); }
  } else if (lay.kind === 'fork') { // confluência: três construções diferentes no encontro dos canais (antes era sempre a mesma bacia)
    const style = rng.int(3); B.boatStop = style === 0 ? 0 : style === 1 ? 0.3 : 0.24; const free = (ang) => lay.exits.every((e) => Math.abs(Math.atan2(Math.sin(ang - edgeAngle(e)), Math.cos(ang - edgeAngle(e)))) > 0.55);
    const freeAng = () => { for (let k = 0; k < 12; k++) { const ang = rng.float() * PI2; if (free(ang)) return ang; } return edgeAngle(lay.exits[0]) + Math.PI; };
    if (style === 0) { // bacia aberta
      for (const e of lay.exits) sewageChannel(B, rng, radial(e, 1, 0.3));
      B.extrude(B.lit, ngon(0, 0, 0.36, 10), H, 0.0015, col(PAL.concrete));
      B.extrude(B.water, ngon(0, 0, 0.27, 10), H, 0.0105, col('#ffffff'));
      for (let k = 0; k < 5; k++) { const ang = (k / 5) * PI2 + 0.3; B.extrude(B.glow, rect(Math.cos(ang) * 0.33, Math.sin(ang) * 0.33, 0.04, 0.04, ang), H + 0.002, 0.004, col(PAL.hazard)); }
      for (let k = 0; k < 6; k++) B.sphere(B.glow, rng.range(-0.2, 0.2), H + 0.013, rng.range(-0.2, 0.2), rng.range(0.008, 0.018), col(PAL.algae), 6, 3);
    } else if (style === 1) { // caixa de junção quadrada com grade e casa de bombas
      for (const e of lay.exits) sewageChannel(B, rng, radial(e, 1, 0.26));
      const ry = rng.float() * PI2, wallc = col(PAL.curb);
      B.extrude(B.lit, chamfer(0, 0, 0.5, 0.5, ry, 0.08), H, 0.004, col(PAL.concrete));
      B.extrude(B.water, chamfer(0, 0, 0.38, 0.38, ry, 0.06), H, 0.011, col('#ffffff'));
      for (let k = -3; k <= 3; k++) B.extrude(B.lit, rect(Math.cos(ry) * k * 0.05, Math.sin(ry) * k * 0.05, 0.012, 0.38, ry), H + 0.03, 0.008, col(PAL.pipe)); // grade
      const ang = freeAng(), hx = Math.cos(ang) * 0.42, hz = Math.sin(ang) * 0.42;
      B.extrude(B.lit, chamfer(hx, hz, 0.16, 0.13, ang, 0.015), H, 0.11, wallc, { topCol: shade(wallc, 1.2), sideShade: true }); // casa de bombas
      B.panel(B.glow, hx - Math.cos(ang) * 0.081, H + 0.06, hz - Math.sin(ang) * 0.081, 0.08, 0.035, ang + Math.PI, col(PAL.barrelRing), 0.005);
      B.frustum(B.lit, hx + Math.sin(ang) * 0.04, H + 0.11, hz - Math.cos(ang) * 0.04, 0.018, 0.014, 0.16, 8, col(PAL.pipe)); // respiro
      B.sphere(B.glow, hx + Math.sin(ang) * 0.04, H + 0.28, hz - Math.cos(ang) * 0.04, 0.022, col(PAL.algae), 8, 4);
      B.tube(B.lit, [[hx - Math.cos(ang) * 0.06, H + 0.05, hz - Math.sin(ang) * 0.06], [Math.cos(ang) * 0.22, H + 0.07, Math.sin(ang) * 0.22], [Math.cos(ang) * 0.12, H + 0.03, Math.sin(ang) * 0.12]], [0.018, 0.018, 0.016], 8, col(PAL.pipe), { capEnd: true });
    } else { // filtro: torre redonda de tratamento no meio de um anel d'água
      for (const e of lay.exits) sewageChannel(B, rng, radial(e, 1, 0.3));
      const wallc = col(PAL.curb);
      B.extrude(B.lit, ngon(0, 0, 0.38, 14), H, 0.003, col(PAL.concrete));
      B.extrude(B.water, ngon(0, 0, 0.3, 14), H, 0.0105, col('#ffffff'));
      B.extrude(B.lit, ngon(0, 0, 0.13, 12), H, 0.16, wallc, { topCol: shade(wallc, 1.2), sideShade: true });
      for (const y of [0.05, 0.1, 0.15]) B.annulus(B.glow, 0, H + y, 0, 0.13, 0.142, 12, col(y === 0.1 ? PAL.hazard : PAL.barrelRing));
      B.sphere(B.lit, 0, H + 0.16, 0, 0.1, col(PAL.glass), 10, 4, { dome: true, sy: 0.55 });
      B.sphere(B.glow, 0, H + 0.19, 0, 0.04, col(PAL.algae), 8, 4);
      for (let k = 0; k < 3; k++) { const ang = freeAng(); barrel(B, rng, Math.cos(ang) * 0.45, Math.sin(ang) * 0.45); }
    }
  } else sewageEnd(B, rng, lay);
}
// Ponta do esgoto: cada estilo lê tanto como NASCENTE (o canal sai dali) quanto como ENCERRAMENTO
// (o canal termina ali), conforme o lado em que o jogador encaixa. Antes só havia o tanque.
function sewageEnd(B, rng, lay) {
  const path = lay.polys[0], a = lay.end.a, c = Math.cos(a), s = Math.sin(a), wallc = col(PAL.curb);
  const style = rng.int(4);
  if (style === 1) { // emissário: muro de arrimo com a boca de um tubulão despejando a água do subsolo
    B.boatStop = 0.24;
    sewageChannel(B, rng, radial(lay.exits[0], 1, 0.12));
    const bx = -c * 0.14, bz = -s * 0.14, my = H + 0.125, R = 0.11;
    B.extrude(B.lit, chamfer(bx, bz, 0.14, 1.04, a, 0.03), H, 0.27, wallc, { topCol: shade(wallc, 1.2), sideShade: true });
    for (let k = -4; k <= 4; k++) B.extrude(B.glow, rect(bx + s * k * 0.11, bz - c * k * 0.11, 0.15, 0.05, a), H + 0.27, 0.006, col(k % 2 ? PAL.hazard : PAL.post));
    B.tube(B.lit, [[bx, my, bz], [c * 0.03, my, s * 0.03]], [R + 0.025, R + 0.025], 14, col(PAL.pipe));
    B.sphere(B.lit, c * 0.02, my, s * 0.02, R, col('#06120f'), 12, 5); // breu do tubulão
    const ring = []; for (let k = 0; k <= 16; k++) { const t = (k / 16) * PI2; ring.push([c * 0.035 - s * Math.cos(t) * (R + 0.03), my + Math.sin(t) * (R + 0.03), s * 0.035 + c * Math.cos(t) * (R + 0.03)]); }
    B.tube(B.glow, ring, [0.011], 6, col(PAL.barrelRing));
    const lip = (d, w) => [c * d - s * w, s * d + c * w], y0 = my - R + 0.01; // lâmina d'água caindo da boca até o canal
    B.quad(B.water, [lip(0.04, -0.09)[0], y0, lip(0.04, -0.09)[1]], [lip(0.04, 0.09)[0], y0, lip(0.04, 0.09)[1]], [lip(0.2, 0.12)[0], H + 0.012, lip(0.2, 0.12)[1]], [lip(0.2, -0.12)[0], H + 0.012, lip(0.2, -0.12)[1]], col('#ffffff'), [c, 1, s]);
    for (let k = 0; k < 7; k++) B.sphere(B.glow, c * rng.range(0.18, 0.32) - s * rng.range(-0.1, 0.1), H + 0.016, s * rng.range(0.18, 0.32) + c * rng.range(-0.1, 0.1), rng.range(0.012, 0.024), col(PAL.algae), 6, 3); // espuma
    for (const k of [-1, 1]) { const lx = bx + s * k * 0.46, lz = bz - c * k * 0.46; B.extrude(B.lit, ngon(lx, lz, 0.012, 6), H + 0.27, 0.12, col(PAL.post)); B.sphere(B.glow, lx, H + 0.4, lz, 0.022, col(PAL.barrelRing), 6, 3); }
    barrel(B, rng, -c * 0.42 - s * 0.32, -s * 0.42 + c * 0.32);
  } else if (style === 2) { // sumidouro: o canal mergulha num poço com grade e redemoinho neon
    B.boatStop = 0.4;
    sewageChannel(B, rng, path);
    B.extrude(B.lit, ngon(0, 0, 0.38, 14), H, 0.004, col(PAL.concrete));
    B.extrude(B.lit, ngon(0, 0, 0.35, 14), H, 0.035, wallc, { topCol: shade(wallc, 1.15), sideShade: true });
    B.extrude(B.water, ngon(0, 0, 0.3, 14), H + 0.03, 0.006, col('#ffffff'));
    B.extrude(B.lit, ngon(0, 0, 0.11, 12), H + 0.03, 0.009, col('#06120f')); // a boca do poço
    for (let k = 0; k < 40; k++) { const t = k / 40, ang = a + t * PI2 * 2.2, r = 0.12 + 0.17 * t; B.sphere(B.glow, Math.cos(ang) * r, H + 0.04, Math.sin(ang) * r, 0.008 + 0.01 * t, col(k % 5 ? PAL.algae : PAL.barrelRing), 5, 2); } // espiral do redemoinho
    for (let k = 0; k < 6; k++) B.extrude(B.lit, rect(0, 0, 0.012, 0.24, a + (k * Math.PI) / 6), H + 0.045, 0.008, col(PAL.pipe)); // grade
    B.annulus(B.glow, 0, H + 0.067, 0, 0.3, 0.315, 14, col(PAL.hazard));
    const vx = -c * 0.36 + s * 0.3, vz = -s * 0.36 - c * 0.3; // registro de volante
    B.extrude(B.lit, ngon(vx, vz, 0.02, 8), H, 0.14, col(PAL.pipe));
    B.tube(B.glow, Array.from({ length: 13 }, (_, k) => { const t = (k / 12) * PI2; return [vx + Math.cos(t) * 0.05, H + 0.15, vz + Math.sin(t) * 0.05]; }), [0.008], 5, col('#ff3b5c'));
    barrel(B, rng, -c * 0.42 - s * 0.26, -s * 0.42 + c * 0.26);
  } else if (style === 3) { // fonte: um cano sobe do subsolo e transborda numa bacia — o esgoto nasce ali
    B.boatStop = 0.42;
    sewageChannel(B, rng, path);
    B.extrude(B.lit, ngon(0, 0, 0.37, 10), H, 0.004, col(PAL.concrete));
    B.extrude(B.lit, ngon(0, 0, 0.34, 10), H, 0.07, wallc, { topCol: shade(wallc, 1.15), sideShade: true });
    B.extrude(B.water, ngon(0, 0, 0.28, 10), H + 0.06, 0.012, col('#ffffff'));
    B.frustum(B.lit, 0, H + 0.06, 0, 0.06, 0.05, 0.2, 10, col(PAL.pipe));
    for (const y of [0.1, 0.18]) B.annulus(B.glow, 0, H + y, 0, 0.05, 0.062, 10, col(y > 0.15 ? PAL.barrelRing : PAL.hazard));
    B.sphere(B.water, 0, H + 0.26, 0, 0.075, col('#ffffff'), 10, 4, { dome: true, sy: 0.55 }); // borbulhão transbordando
    for (let k = 0; k < 5; k++) { // jorros em arco caindo na bacia
      const ang = a + Math.PI / 5 + (k / 5) * PI2, dx = Math.cos(ang), dz = Math.sin(ang);
      B.tube(B.glow, [[dx * 0.05, H + 0.27, dz * 0.05], [dx * 0.14, H + 0.3, dz * 0.14], [dx * 0.22, H + 0.07, dz * 0.22]], [0.012, 0.01, 0.006], 5, col(PAL.algae));
    }
    for (let k = 0; k < 5; k++) { const ang = (k / 5) * PI2 + a; B.extrude(B.glow, rect(Math.cos(ang) * 0.31, Math.sin(ang) * 0.31, 0.05, 0.03, ang + Math.PI / 2), H + 0.07, 0.004, col(k % 2 ? PAL.hazard : PAL.barrelRing)); }
    for (const k of [-1, 1]) barrel(B, rng, -c * 0.44 + s * k * 0.16, -s * 0.44 - c * k * 0.16);
  } else { // tanque de decantação redondo (o estilo original)
    B.boatStop = 0.44; // barco dá meia-volta antes da mureta do tanque
    sewageChannel(B, rng, path);
    const wallc = col(PAL.curb);
    B.extrude(B.lit, ngon(0, 0, 0.36, 12), H, 0.004, col(PAL.concrete));
    B.extrude(B.lit, ngon(0, 0, 0.33, 12), H, 0.06, wallc, { topCol: shade(wallc, 1.15), sideShade: true });
    B.extrude(B.water, ngon(0, 0, 0.27, 12), H + 0.05, 0.012, col('#ffffff'));
    for (let k = 0; k < 6; k++) { const ang = (k / 6) * PI2 + a; B.extrude(B.glow, rect(Math.cos(ang) * 0.3, Math.sin(ang) * 0.3, 0.05, 0.03, ang + Math.PI / 2), H + 0.06, 0.004, col(k % 2 ? PAL.hazard : PAL.barrelRing)); }
    B.annulus(B.glow, 0, H + 0.064, 0, 0.27, 0.285, 12, col(PAL.algae));
    for (let k = 0; k < 6; k++) B.sphere(B.glow, rng.range(-0.18, 0.18), H + 0.064, rng.range(-0.18, 0.18), rng.range(0.008, 0.02), col(PAL.algae), 6, 3);
    outletPipe(B, rng, -c * 0.02 - s * 0.24, -s * 0.02 + c * 0.24, a + Math.PI / 2); // cano lateral despejando
    for (const k of [-1, 1]) barrel(B, rng, -c * 0.44 + s * k * 0.14, -s * 0.44 - c * k * 0.14);
    B.extrude(B.lit, ngon(-c * 0.4 - s * 0.28, -s * 0.4 + c * 0.28, 0.01, 6), H, 0.3, col(PAL.post)); B.sphere(B.glow, -c * 0.4 - s * 0.28, H + 0.31, -s * 0.4 + c * 0.28, 0.018, col(PAL.barrelRing), 6, 3);
  }
}
function drawPool(B, rng, pts) {
  for (const p of pts) {
    const r = rng.float();
    if (r < 0.4) barrel(B, rng, p.x, p.z);
    else if (r < 0.7) { for (let k = 0; k < 4; k++) B.sphere(B.glow, p.x + rng.range(-0.08, 0.08), H + 0.012, p.z + rng.range(-0.08, 0.08), rng.range(0.008, 0.018), col(PAL.algae), 6, 3); }
    else outletPipe(B, rng, p.x, p.z, p.a + Math.PI);
  }
}

// ---------- TREM-BALA ----------
function railTrack(B, path, sleepers = true) {
  B.ribbon(B.lit, path, 0.32, H + 0.002, col(PAL.ballast));
  if (sleepers) for (const s of samplePath(path, 0.09, 0.045)) B.extrude(B.lit, rect(s.x, s.z, 0.035, 0.2, s.a), H + 0.004, 0.012, col(PAL.sleeper));
  for (const side of [1, -1]) B.ribbon(B.lit, offsetLine(path, side * 0.065), 0.024, H + 0.018, col(PAL.railSteel));
}
function catenaryPole(B, s) {
  const px = -Math.sin(s.a), pz = Math.cos(s.a);
  for (const side of [1, -1]) B.frustum(B.lit, s.x + px * side * 0.19, H, s.z + pz * side * 0.19, 0.014, 0.01, 0.3, 6, col(PAL.post));
  B.extrude(B.lit, rect(s.x, s.z, 0.018, 0.4, s.a), H + 0.28, 0.016, col(PAL.post));
  B.sphere(B.glow, s.x, H + 0.3, s.z, 0.016, col(PAL.catenary), 6, 3);
}
function catenaryWire(B, path, f0, f1) {
  const L = pathLength(path), wire = [];
  for (const s of samplePath(path, 0.05, L * f0)) { if (wire.length < 40) wire.push([s.x, s.z]); }
  const end = pointAt(path, L * f1); wire.push([end.x, end.z]);
  if (wire.length > 1) B.ribbon(B.glow, wire, 0.006, H + 0.29, shade(col(PAL.catenary), 0.6));
}
function drawRail(B, rng, lay) {
  if (lay.kind === 'line') {
    const path = lay.polys[0], L = pathLength(path);
    railTrack(B, path);
    for (const f of [0.2, 0.8]) catenaryPole(B, pointAt(path, L * f));
    catenaryWire(B, path, 0.2, 0.8);
    if (!lay.dual && rng.chance(0.3)) { // estação
      const s = pointAt(path, L * 0.5), side = rng.pick([1, -1]), px = -Math.sin(s.a) * side, pz = Math.cos(s.a) * side;
      B.extrude(B.lit, rect(s.x + px * 0.25, s.z + pz * 0.25, 0.34, 0.12, s.a), H, 0.03, col(PAL.station), { topCol: col('#3a3e5a') });
      for (const k of [-1, 1]) B.extrude(B.lit, ngon(s.x + px * 0.28 + Math.cos(s.a) * k * 0.13, s.z + pz * 0.28 + Math.sin(s.a) * k * 0.13, 0.01, 6), H + 0.03, 0.14, col(PAL.post));
      B.extrude(B.lit, rect(s.x + px * 0.27, s.z + pz * 0.27, 0.36, 0.1, s.a), H + 0.17, 0.014, col('#3a3e5a'));
      B.panel(B.glow, s.x + px * 0.31, H + 0.19, s.z + pz * 0.31, 0.2, 0.04, s.a, col(rng.pick(['#22f3ff', '#ffe93a'])), 0.006);
    }
  } else if (lay.kind === 'fork') { // entroncamento: lastro central, trilhos cruzando
    B.extrude(B.lit, ngon(0, 0, 0.42, 12), H, 0.0015, col(PAL.ballast));
    for (const e of lay.exits) { const p = radial(e, 1, 0.32); railTrack(B, p); for (const side of [1, -1]) B.ribbon(B.lit, offsetLine(radial(e, 0.34, 0.02), side * 0.065), 0.024, H + 0.018, col(PAL.railSteel)); catenaryPole(B, pointAt(p, pathLength(p) * 0.35)); }
    B.extrude(B.lit, ngon(0, 0, 0.03, 6), H, 0.02, col(PAL.post));
    B.sphere(B.glow, 0, H + 0.3, 0, 0.02, col(PAL.catenary), 6, 3);
    for (const e of lay.exits) { const s = pointAt(radial(e, 1, 0.32), 0.68 * pathLength(radial(e, 1, 0.32))); B.ribbon(B.glow, [[0, 0], [s.x, s.z]], 0.006, H + 0.29, shade(col(PAL.catenary), 0.6)); }
    B.panel(B.glow, 0.36, H + 0.05, 0, 0.1, 0.05, Math.PI / 2, col('#ffe93a'), 0.01); // caixa de sinalização
  } else { // fim de linha: para-choque, plataformas com marquises finas e prédio do terminal com letreiro
    const path = lay.polys[0], a = lay.end.a, c = Math.cos(a), s = Math.sin(a), px = -s, pz = c;
    railTrack(B, path);
    catenaryPole(B, pointAt(path, pathLength(path) * 0.35)); catenaryWire(B, path, 0.35, 1);
    B.extrude(B.lit, rect(c * 0.17, s * 0.17, 0.06, 0.24, a), H, 0.025, col(PAL.sleeper));
    for (const k of [-1, 1]) B.extrude(B.lit, ngon(c * 0.16 + px * k * 0.065, s * 0.16 + pz * k * 0.065, 0.013, 6), H, 0.09, col('#8d93ad'));
    B.extrude(B.lit, rect(c * 0.15, s * 0.15, 0.035, 0.19, a), H + 0.07, 0.045, col('#8d93ad')); // para-choque
    B.panel(B.glow, c * 0.13, H + 0.08, s * 0.13, 0.15, 0.028, a, col('#ff3b5c'), 0.006);
    const stationc = col(PAL.station);
    for (const side of [1, -1]) { // plataformas com faixa amarela e marquise estreita só sobre a plataforma
      B.extrude(B.lit, rect(c * 0.5 + px * side * 0.26, s * 0.5 + pz * side * 0.26, 0.6, 0.14, a), H, 0.035, stationc, { topCol: col('#3a3e5a') });
      B.ribbon(B.glow, [[c * 0.22 + px * side * 0.2, s * 0.22 + pz * side * 0.2], [c * 0.8 + px * side * 0.2, s * 0.8 + pz * side * 0.2]], 0.012, H + 0.037, col('#ffe93a'));
      for (const k of [0.32, 0.68]) B.extrude(B.lit, ngon(c * k + px * side * 0.3, s * k + pz * side * 0.3, 0.009, 6), H + 0.035, 0.17, col(PAL.post));
      B.extrude(B.lit, rect(c * 0.5 + px * side * 0.29, s * 0.5 + pz * side * 0.29, 0.5, 0.11, a), H + 0.2, 0.012, col('#4a4f70'), { topCol: col('#5a5f80') });
      B.ribbon(B.glow, [[c * 0.26 + px * side * 0.235, s * 0.26 + pz * side * 0.235], [c * 0.74 + px * side * 0.235, s * 0.74 + pz * side * 0.235]], 0.008, H + 0.213, col(rng.pick(['#22f3ff', '#ff2bd6'])));
    }
    // prédio do terminal atrás do para-choque, com letreiro neon virado para a linha
    const bx = -c * 0.14, bz = -s * 0.14, neon = col(rng.pick(['#22f3ff', '#ff2bd6', '#ffe93a']));
    B.extrude(B.lit, chamfer(bx, bz, 0.16, 0.5, a, 0.02), H, 0.14, stationc, { topCol: col('#3a3e5a'), sideShade: true });
    B.extrude(B.lit, chamfer(bx - c * 0.02, bz - s * 0.02, 0.1, 0.3, a, 0.02), H + 0.14, 0.08, stationc, { topCol: col('#3a3e5a'), sideShade: true });
    B.panel(B.glow, bx + c * 0.082, H + 0.04, bz + s * 0.082, 0.36, 0.05, a, shade(col(PAL.warmWin), 0.85), 0.006);
    B.panel(B.glow, bx + c * 0.06, H + 0.15, bz + s * 0.06, 0.26, 0.06, a, neon, 0.012);
    B.sphere(B.glow, bx, H + 0.25, bz, 0.018, neon, 6, 3);
    for (const k of [-1, 1]) { B.extrude(B.lit, ngon(bx - px * k * 0.3 - c * 0.02, bz - pz * k * 0.3 - s * 0.02, 0.01, 6), H, 0.26, col(PAL.post)); B.sphere(B.glow, bx - px * k * 0.3 - c * 0.02, H + 0.27, bz - pz * k * 0.3 - s * 0.02, 0.016, col(PAL.lampCool), 6, 3); }
  }
  // o trem não mora mais na peça: um comboio curto e ocasional percorre a rede inteira (trains em main.js)
}

// ---------- RODOVIA ----------
function drawCar(B, x, z, a, y0, color) {
  const c = Math.cos(a), s = Math.sin(a), px = -s, pz = c, body = col(color);
  for (const ax of [1, -1]) for (const sd of [1, -1]) B.extrude(B.lit, ngon(x + c * 0.055 * ax + px * 0.045 * sd, z + s * 0.055 * ax + pz * 0.045 * sd, 0.016, 8, a), y0 + 0.002, 0.026, col('#1a1a22'));
  B.extrude(B.glow, rect(x, z, 0.15, 0.08, a), y0 + 0.008, 0.004, shade(body, 0.7));
  B.extrude(B.lit, chamfer(x, z, 0.17, 0.085, a, 0.015), y0 + 0.016, 0.045, body, { topCol: shade(body, 1.15) });
  B.extrude(B.lit, chamfer(x - c * 0.01, z - s * 0.01, 0.085, 0.08, a, 0.012), y0 + 0.061, 0.035, col(PAL.carGlass));
  for (const sd of [1, -1]) {
    B.extrude(B.glow, rect(x + c * 0.086 + px * sd * 0.028, z + s * 0.086 + pz * sd * 0.028, 0.01, 0.02, a), y0 + 0.03, 0.018, col(PAL.headlight));
    B.extrude(B.glow, rect(x - c * 0.086 + px * sd * 0.028, z - s * 0.086 + pz * sd * 0.028, 0.01, 0.02, a), y0 + 0.03, 0.018, col(PAL.tail));
  }
}
function roadStrip(B, path, dashes = true) {
  B.ribbon(B.lit, path, 0.36, H + 0.002, col(PAL.asphalt));
  for (const side of [1, -1]) B.ribbon(B.glow, offsetLine(path, side * 0.16), 0.01, H + 0.006, shade(col(side > 0 ? '#22f3ff' : '#ff2bd6'), 0.7));
  if (dashes) for (const s of samplePath(path, 0.13, 0.06)) B.extrude(B.glow, rect(s.x, s.z, 0.055, 0.014, s.a), H + 0.006, 0.004, col(PAL.dash));
}
function streetLamp(B, s, side) {
  const px = -Math.sin(s.a) * side, pz = Math.cos(s.a) * side;
  B.frustum(B.lit, s.x + px * 0.22, H, s.z + pz * 0.22, 0.012, 0.008, 0.26, 6, col(PAL.post));
  B.extrude(B.lit, rect(s.x + px * 0.18, s.z + pz * 0.18, 0.012, 0.09, s.a + Math.PI / 2), H + 0.25, 0.01, col(PAL.post));
  B.sphere(B.glow, s.x + px * 0.14, H + 0.245, s.z + pz * 0.14, 0.016, col(PAL.lampWarm), 6, 3, { sy: 0.5 });
}
function drawRoad(B, rng, lay) {
  let cars = 1 + rng.int(2);
  if (lay.kind === 'line') {
    const path = lay.polys[0], L = pathLength(path);
    roadStrip(B, path);
    for (const f of [0.25, 0.75]) streetLamp(B, pointAt(path, L * f), f < 0.5 ? 1 : -1);
    if (!lay.dual && rng.chance(0.5)) { // pórtico holográfico
      const s = pointAt(path, L * 0.5), px = -Math.sin(s.a), pz = Math.cos(s.a);
      for (const side of [1, -1]) B.frustum(B.lit, s.x + px * side * 0.23, H, s.z + pz * side * 0.23, 0.016, 0.012, 0.36, 6, col(PAL.post));
      B.extrude(B.lit, rect(s.x, s.z, 0.05, 0.52, s.a), H + 0.34, 0.03, col(PAL.post));
      B.panel(B.glow, s.x - px * 0.04, H + 0.37, s.z - pz * 0.04, 0.28, 0.13, s.a, col(rng.pick(PAL.neon)), 0.03);
      B.panel(B.glow, s.x + px * 0.17, H + 0.37, s.z + pz * 0.17, 0.1, 0.08, s.a, col(rng.pick(PAL.neon)), 0.03);
      B.panel(B.glow, s.x + px * 0.17, H + 0.46, s.z + pz * 0.17, 0.1, 0.03, s.a, col(rng.pick(PAL.neon)), 0.03);
    }
  } else if (lay.kind === 'fork') { // rotatória neon
    B.extrude(B.lit, ngon(0, 0, 0.42, 14), H, 0.0015, col(PAL.asphalt));
    for (const e of lay.exits) { const p = radial(e, 1, 0.32); roadStrip(B, p); streetLamp(B, pointAt(p, pathLength(p) * 0.4), 1); }
    B.annulus(B.glow, 0, H + 0.004, 0, 0.36, 0.375, 14, shade(col('#22f3ff'), 0.7));
    B.extrude(B.lit, ngon(0, 0, 0.12, 10), H, 0.03, col(PAL.curb), { topCol: shade(col(PAL.curb), 1.2) }); // ilha central
    B.annulus(B.glow, 0, H + 0.034, 0, 0.09, 0.115, 10, col(rng.pick(PAL.neon)));
    B.extrude(B.lit, ngon(0, 0, 0.012, 6), H + 0.03, 0.3, col(PAL.post)); B.cone(B.glow, 0, H + 0.33, 0, 0.03, 0.12, col(rng.pick(PAL.neon)), 6);
    cars = 2;
  } else { // estacionamento: os carros entram, param e saem
    const path = lay.polys[0], a = lay.end.a, c = Math.cos(a), s = Math.sin(a), px = -s, pz = c;
    roadStrip(B, path);
    const cx = -c * 0.1, cz = -s * 0.1;
    B.extrude(B.lit, chamfer(cx, cz, 0.66, 0.72, a, 0.04), H, 0.003, col(PAL.asphalt), { topCol: shade(col(PAL.asphalt), 1.1) });
    B.extrude(B.lit, chamfer(cx, cz, 0.7, 0.76, a, 0.04), H, 0.012, col(PAL.curb), { noTop: true });
    for (const side of [1, -1]) for (let k = -1; k <= 1; k++) { // vagas pintadas
      const bx = cx - c * 0.12 + px * side * (0.2 + 0.1) - c * k * 0.0 + c * k * 0.19, bz = cz - s * 0.12 + pz * side * 0.3 + s * k * 0.19;
      B.extrude(B.glow, rect(bx, bz, 0.012, 0.2, a + Math.PI / 2), H + 0.004, 0.003, shade(col(PAL.dash), 0.8));
    }
    const slots = [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]].filter(() => rng.chance(0.55)).slice(0, 4);
    for (const [side, k] of slots) { const bx = cx - c * 0.12 + px * side * 0.22 + c * (k * 0.19 + 0.095), bz = cz - s * 0.12 + pz * side * 0.22 + s * (k * 0.19 + 0.095); drawCar(B, bx, bz, a + Math.PI / 2, H, rng.pick(PAL.carColors)); }
    streetLamp(B, { x: cx - c * 0.28, z: cz - s * 0.28, a: a + Math.PI / 2 }, 1);
    const sx = cx - c * 0.3 - px * 0.34, sz = cz - s * 0.3 - pz * 0.34; // letreiro "P"
    B.extrude(B.lit, ngon(sx, sz, 0.014, 8), H, 0.34, col(PAL.post));
    B.extrude(B.lit, rect(sx, sz, 0.02, 0.14, a), H + 0.34, 0.16, col('#2a2d44'));
    B.panel(B.glow, sx + c * 0.014, H + 0.36, sz + s * 0.014, 0.11, 0.12, a, col('#22f3ff'), 0.006);
    B.panel(B.glow, sx + c * 0.022, H + 0.39, sz + s * 0.022, 0.03, 0.06, a, col('#0a0a14'), 0.006);
    B.panel(B.glow, sx - c * 0.014, H + 0.36, sz - s * 0.014, 0.11, 0.12, a, col('#22f3ff'), 0.006);
    cars = 1;
  }
  for (let k = 0; k < cars; k++) B.anims.push({ type: 'car', dir: rng.pick([1, -1]), color: rng.pick(PAL.carColors) });
}

// ---------- VIADUTO (peça de cruzamento) ----------
// O meio de cima sobe numa rampa suave até BRIDGE_H no miolo e volta ao chão na aresta, onde
// precisa casar com a peça vizinha. A rampa é aplicada vértice a vértice (Builder.yf), então
// tudo que se desenha com ela ligada — pista, trilho, mureta — sobe junto.
export const BRIDGE_H = 0.17;
const BR_IN = 0.3, BR_OUT = 0.8;
const bridgeK = (u) => { u = Math.abs(u); if (u <= BR_IN) return 1; if (u >= BR_OUT) return 0; const t = (BR_OUT - u) / (BR_OUT - BR_IN); return t * t * (3 - 2 * t); };
// altura extra de um ponto de uma rota de viaduto (coordenadas locais da peça)
export function routeLift(route, x, z) { return route && route.bridge ? BRIDGE_H * bridgeK(x * route.bridge[0] + z * route.bridge[1]) : 0; }
function drawBridge(B, rng, type, lay) {
  const e = lay.exits[0], ax = [Math.cos(edgeAngle(e)), Math.sin(edgeAngle(e))], ang = edgeAngle(e);
  const lift = (x, z) => BRIDGE_H * bridgeK(x * ax[0] + z * ax[1]);
  const A = edgePoint(e), Bp = edgePoint(lay.exits[1]), path = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; path.push([A[0] + (Bp[0] - A[0]) * t, A[1] + (Bp[1] - A[1]) * t]); }
  const hw = type === 'road' ? 0.2 : 0.18, mid = path.filter(([x, z]) => Math.abs(x * ax[0] + z * ax[1]) < 0.62);
  const neon = col(type === 'road' ? '#ffe36a' : PAL.catenary);
  // pilares (fora da pista de baixo: a 0.36 do centro sobre o eixo do viaduto)
  for (const t of [-0.36, 0.36]) {
    const x = ax[0] * t, z = ax[1] * t, h = lift(x, z) - 0.03;
    B.extrude(B.lit, chamfer(x, z, 0.06, hw * 2 - 0.05, ang, 0.012), H, h, col(PAL.curb), { topCol: shade(col(PAL.curb), 1.1), sideShade: true });
    B.extrude(B.glow, rect(x, z, 0.062, hw * 2 - 0.04, ang), H + h * 0.5, 0.008, col(PAL.hazard));
  }
  B.yf = lift;
  for (const sd of [1, -1]) {
    B.wall(B.lit, offsetLine(path, sd * hw), H - 0.04, H + 0.004, col('#3a3f58'), sd); // espessura da laje
    B.wall(B.lit, offsetLine(mid, sd * (hw - 0.012)), H + 0.004, H + 0.034, col(PAL.curb), sd); // mureta
    B.ribbon(B.lit, offsetLine(mid, sd * (hw - 0.012)), 0.014, H + 0.034, shade(col(PAL.curb), 1.2));
    B.ribbon(B.glow, offsetLine(mid, sd * (hw - 0.012)), 0.006, H + 0.036, shade(neon, 0.8));
  }
  if (type === 'road') roadStrip(B, path); else railTrack(B, path);
  B.yf = null;
  if (type === 'road') for (let k = 0; k < 1 + rng.int(2); k++) B.anims.push({ type: 'car', dir: rng.pick([1, -1]), color: rng.pick(PAL.carColors) });
}

// ---------- MARCOS ----------
function drawLandmark(B, rng, type, x, z, a, sch) {
  if (type === 'cyber') {
    const base = col('#1b1f3d');
    lightPool(B, x, z, 0.5, col(sch.key), 1.2);
    B.extrude(B.lit, chamfer(x, z, 0.3, 0.3, a, 0.05), H, 0.5, base, { topCol: shade(base, 2.1), sideShade: true });
    windows(B, rng, x, z, 0.3, 0.3, a, H, 0.5);
    B.extrude(B.lit, ngon(x, z, 0.11, 14, a), H + 0.5, 0.45, base, { topCol: shade(base, 2.1), sideShade: true });
    [0.12, 0.3, 0.48, 0.66, 0.84].forEach((y, k) => B.annulus(B.glow, x, H + y, z, k < 2 ? 0.16 : 0.112, k < 2 ? 0.18 : 0.128, 14, schemeCol(rng, sch)));
    B.sphere(B.lit, x, H + 0.95, z, 0.1, shade(base, 1.8), 12, 4, { dome: true, sy: 0.6 });
    B.cone(B.glow, x, H + 1.0, z, 0.03, 0.26, col(sch.accent), 6, a);
    B.panel(B.glow, x + Math.cos(a) * 0.14, H + 0.62, z + Math.sin(a) * 0.14, 0.3, 0.16, a, col(sch.key), 0.02);
    B.panel(B.glow, x - Math.cos(a) * 0.14, H + 0.55, z - Math.sin(a) * 0.14, 0.24, 0.1, a, col(sch.warm), 0.02);
    B.anims.push({ type: 'drone', x, y: H + 1.1, z, r: 0.3, speed: 0.7, color: sch.key });
  } else if (type === 'solar') { // casa-marco do vilarejo: terracos de estuque + turbina vertical (ref 1)
    const wall = col(PAL.stucco[0]), c = Math.cos(a), s = Math.sin(a);
    B.extrude(B.lit, chamfer(x, z, 0.52, 0.44, a, 0.04), H, 0.1, shade(wall, 0.9), { topCol: shade(wall, 0.82), sideShade: true });
    B.extrude(B.lit, chamfer(x - c * 0.06, z - s * 0.06, 0.38, 0.32, a, 0.04), H + 0.1, 0.13, wall, { topCol: shade(wall, 0.88), sideShade: true });
    B.extrude(B.lit, chamfer(x - c * 0.1, z - s * 0.1, 0.24, 0.22, a, 0.03), H + 0.23, 0.11, shade(wall, 1.03), { topCol: shade(wall, 0.9), sideShade: true });
    prismRoof(B, B.lit, x - c * 0.1, z - s * 0.1, 0.27, 0.25, a, H + 0.34, 0.09, col(PAL.terracotta[0]));
    for (let k = 0; k < 5; k++) B.extrude(B.lit, rect(x + c * 0.16 + c * 0.03 * k, z + s * 0.16 + s * 0.03 * k, 0.09, 0.028, a + Math.PI / 2), H + 0.1 - 0.02 * k, 0.02, shade(wall, 0.96)); // escadaria
    tiltPanel(B, x + c * 0.14, z + s * 0.14, 0.2, 0.3, a, H + 0.105, 0.05, col(PAL.panel), col(PAL.panelGlow));
    awning(B, rng, x + c * 0.27, z + s * 0.27, a, 0.2, H + 0.075);
    B.panel(B.glow, x + c * 0.262, H + 0.035, z + s * 0.262, 0.18, 0.045, a, shade(col(PAL.lantern), 0.9), 0.008);
    B.panel(B.glow, x - c * 0.06 + c * 0.191, H + 0.15, z - s * 0.06 + s * 0.191, 0.14, 0.05, a, shade(col(PAL.lantern), 0.85), 0.008);
    for (let k = 0; k < 4; k++) { const ang = a + 1.2 + k * 0.9, r = 0.3; B.tube(B.lit, [[x + Math.cos(ang) * r, H + 0.1, z + Math.sin(ang) * r], [x + Math.cos(ang) * r * 1.04, H + 0.04, z + Math.sin(ang) * r * 1.04], [x + Math.cos(ang) * r * 1.1, H + 0.005, z + Math.sin(ang) * r * 1.1]], [0.009, 0.007, 0.005], 5, col(PAL.vine)); }
    planterBed(B, rng, x - c * 0.3 - s * 0.16, z - s * 0.3 + c * 0.16, a, 0.14, 0.07);
    planterBed(B, rng, x - c * 0.3 + s * 0.16, z - s * 0.3 - c * 0.16, a, 0.14, 0.07);
    greenhouse(B, rng, x + c * 0.02 - s * 0.34, z + s * 0.02 + c * 0.34, a + Math.PI / 2, 0.16, 0.12);
    waterTanks(B, rng, x - c * 0.06 + s * 0.12, z - s * 0.06 - c * 0.12, H + 0.23, 1.1);
    vaxTurbine(B, rng, { x: x - c * 0.1 + s * 0.02, z: z - s * 0.1 - c * 0.02, a });
    for (let k = 0; k < 2; k++) { const ang = a + 2.4 + k * 1.5; palm(B, rng, x + Math.cos(ang) * 0.42, z + Math.sin(ang) * 0.42, 0.75); }
  } else if (type === 'rock') { // 3 marcos de montanha, sorteados pela semente da peça
    const v = rng.int(5), c = col(PAL.rock[2]);
    if (v === 0) { // maciço em degraus com antena no cume (escalonado: cone liso lia como pirâmide)
      B.frustum(B.lit, x, H, z, 0.46, 0.34, 0.34, 7, c, a, { topCol: shade(c, 1.16) });
      B.frustum(B.lit, x + Math.cos(a + 0.7) * 0.04, H + 0.34, z + Math.sin(a + 0.7) * 0.04, 0.32, 0.21, 0.3, 7, shade(c, 1.08), a + 0.5, { topCol: shade(c, 1.26) });
      B.frustum(B.lit, x + Math.cos(a + 1.9) * 0.07, H + 0.64, z + Math.sin(a + 1.9) * 0.07, 0.19, 0.1, 0.24, 6, shade(c, 0.94), a + 1.1, { topCol: shade(c, 1.3) });
      B.frustum(B.lit, x + Math.cos(a + 2.2) * 0.22, H, z + Math.sin(a + 2.2) * 0.22, 0.3, 0.1, 0.5, 6, shade(c, 0.85), a + 0.5, { topCol: shade(c, 1.12) });
      B.frustum(B.lit, x + Math.cos(a - 1.8) * 0.26, H, z + Math.sin(a - 1.8) * 0.26, 0.22, 0.06, 0.38, 5, shade(c, 1.1), a - 0.3, { topCol: shade(c, 1.2) });
      B.cone(B.lit, x + Math.cos(a + 1.9) * 0.07, H + 0.86, z + Math.sin(a + 1.9) * 0.07, 0.1, 0.16, col(PAL.brickLight), 6, a); // rocha calcinada, não neve
      for (let k = 0; k < 5; k++) { const ang = a + k * 1.25 + 0.4, rr = 0.44 * (1 - 0.3 * (k % 2)); B.panel(B.glow, x + Math.cos(ang) * rr * 0.72, H + 0.1 + 0.28 * (k % 2), z + Math.sin(ang) * rr * 0.72, 0.04, 0.24, ang + Math.PI / 2, col(PAL.ore), 0.008); }
      B.panel(B.glow, x + Math.cos(a) * 0.4, H + 0.02, z + Math.sin(a) * 0.4, 0.09, 0.1, a + Math.PI / 2, col(PAL.ore), 0.02);
      const mx = x + Math.cos(a + 1.9) * 0.07, mz = z + Math.sin(a + 1.9) * 0.07;
      B.frustum(B.lit, mx, H + 1.0, mz, 0.02, 0.008, 0.36, 4, col('#c9cfe0'), Math.PI / 4);
      for (const f of [0.35, 0.65]) B.extrude(B.lit, rect(mx, mz, 0.11 * (1 - f * 0.4), 0.008, a), H + 1.0 + 0.36 * f, 0.006, col('#8d93ad'));
      B.annulus(B.glow, mx, H + 1.2, mz, 0.014, 0.03, 8, col(PAL.oreGlow));
      B.sphere(B.glow, mx, H + 1.38, mz, 0.022, col(PAL.beacon), 6, 3);
      for (let k = 0; k < 4; k++) { const ang = a + k * 1.6 + 0.9; boulders(B, rng, x + Math.cos(ang) * 0.5, z + Math.sin(ang) * 0.5, 1.1); }
      B.anims.push({ type: 'bolt', x0: x + Math.cos(a + 2.2) * 0.22, z0: z + Math.sin(a + 2.2) * 0.22, x1: x, z1: z, y: H + 0.7, color: '#fff1c8' });
    } else if (v === 1) { // picos gêmeos com ponte pênsil iluminada
      const px = Math.cos(a + Math.PI / 2), pz = Math.sin(a + Math.PI / 2), d = 0.3, c2 = col(PAL.rock[3]);
      const P1 = [x + px * d, z + pz * d], P2 = [x - px * d, z - pz * d];
      B.frustum(B.lit, P1[0], H, P1[1], 0.3, 0.04, 0.86, 6, c, a); B.cone(B.lit, P1[0], H + 0.64, P1[1], 0.13, 0.26, col(PAL.brickLight), 6, a);
      B.frustum(B.lit, P2[0], H, P2[1], 0.28, 0.035, 0.72, 6, c2, a + 0.4); B.cone(B.lit, P2[0], H + 0.53, P2[1], 0.12, 0.22, col(PAL.brickLight), 6, a + 0.4);
      B.frustum(B.lit, x + Math.cos(a) * 0.2, H, z + Math.sin(a) * 0.2, 0.22, 0.02, 0.36, 5, shade(c, 0.85), a - 0.6); // ombro entre os dois
      const y = H + 0.42;
      B.extrude(B.lit, rect(x, z, 0.05, 2 * d, a), y, 0.012, col(PAL.sleeper)); // tabuleiro da ponte
      for (const side of [1, -1]) B.ribbon(B.glow, [[P1[0] + Math.cos(a) * side * 0.03, P1[1] + Math.sin(a) * side * 0.03], [P2[0] + Math.cos(a) * side * 0.03, P2[1] + Math.sin(a) * side * 0.03]], 0.006, y + 0.06, col(PAL.oreGlow)); // cabos
      for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.2, bx = P1[0] + (P2[0] - P1[0]) * t, bz = P1[1] + (P2[1] - P1[1]) * t; B.extrude(B.lit, ngon(bx, bz, 0.006, 5), y, 0.06, col(PAL.post)); B.sphere(B.glow, bx, y + 0.068, bz, 0.011, col(PAL.lampWarm), 6, 3); }
      for (let k = 0; k < 4; k++) { const ang = a + k * 1.5 + 0.3, P = k % 2 ? P1 : P2; B.panel(B.glow, P[0] + Math.cos(ang) * 0.18, H + 0.08 + 0.1 * k, P[1] + Math.sin(ang) * 0.18, 0.03, 0.16, ang + Math.PI / 2, col(PAL.ore), 0.008); }
      for (let k = 0; k < 3; k++) { const ang = a + k * 2.1 + 1.1; boulders(B, rng, x + Math.cos(ang) * 0.55, z + Math.sin(ang) * 0.55, 1); }
      B.anims.push({ type: 'bolt', x0: P1[0], z0: P1[1], x1: P2[0], z1: P2[1], y: H + 0.78, color: '#fff1c8' });
    } else if (v === 2) { // vulcão com cratera de lava e rios de âmbar
      B.frustum(B.lit, x, H, z, 0.46, 0.2, 0.62, 8, shade(c, 0.9), a, { noTop: true });
      B.frustum(B.lit, x, H + 0.5, z, 0.1, 0.205, 0.12, 8, col(PAL.rockDark), a, { inner: true, noTop: true }); // paredes da cratera
      B.extrude(B.glow, ngon(x, z, 0.105, 8, a), H + 0.495, 0.01, col(PAL.ore)); // lava
      B.annulus(B.glow, x, H + 0.622, z, 0.19, 0.215, 8, col(PAL.oreGlow)); // borda incandescente
      for (let k = 0; k < 3; k++) { // rios de lava descendo a encosta
        const ang = a + k * 2.1 + rng.range(-0.3, 0.3);
        B.tube(B.glow, [[x + Math.cos(ang) * 0.2, H + 0.6, z + Math.sin(ang) * 0.2], [x + Math.cos(ang + 0.1) * 0.32, H + 0.32, z + Math.sin(ang + 0.1) * 0.32], [x + Math.cos(ang) * 0.46, H + 0.02, z + Math.sin(ang) * 0.46], [x + Math.cos(ang - 0.15) * 0.56, H + 0.004, z + Math.sin(ang - 0.15) * 0.56]], [0.018, 0.016, 0.02, 0.012], 5, col(PAL.oreGlow));
      }
      B.frustum(B.lit, x + Math.cos(a + 2.4) * 0.3, H, z + Math.sin(a + 2.4) * 0.3, 0.2, 0.02, 0.4, 5, shade(c, 1.1), a); // cone parasita
      for (let k = 0; k < 4; k++) { const ang = a + k * 1.6 + 0.4; boulders(B, rng, x + Math.cos(ang) * 0.58, z + Math.sin(ang) * 0.58, 1); }
      B.anims.push({ type: 'bolt', x0: x + Math.cos(a) * 0.05, z0: z + Math.sin(a) * 0.05, x1: x + Math.cos(a + 2.4) * 0.3, z1: z + Math.sin(a + 2.4) * 0.3, y: H + 0.72, color: '#ffd9a0' });
    } else if (v === 3) { // GRANDE ZIGURATE: massa larga e escalonada, o contrário da torre neon
      const body = col(PAL.brick[1]), lap = shade(col(PAL.lapisGlow), 0.55), c2 = Math.cos(a), sn = Math.sin(a);
      let w = 0.95, d = 0.8, y = H;
      for (let t = 0; t < 5; t++) {
        const th = 0.145 - t * 0.013, cc = shade(body, 1 - t * 0.045);
        B.extrude(B.lit, rect(x, z, w, d, a), y, th, cc, { topCol: shade(cc, 1.22), sideShade: true });
        B.extrude(B.glow, rect(x, z, w + 0.016, d + 0.016, a), y + th * 0.6, 0.011, lap); // friso de lápis
        for (let k = -1; k <= 1; k++) B.panel(B.lit, x - c2 * (w / 2 + 0.006) - sn * k * d * 0.3, y + th * 0.18, z - sn * (w / 2 + 0.006) + c2 * k * d * 0.3, d * 0.14, th * 0.55, a, col(PAL.brickDark), 0.012); // nichos
        y += th; w *= 0.78; d *= 0.78;
      }
      const sw = 0.3; // santuário
      B.extrude(B.lit, rect(x, z, sw * 1.25, sw, a), y, 0.15, col(PAL.brickLight), { topCol: col(PAL.gold), sideShade: true });
      B.extrude(B.glow, rect(x, z, sw * 1.32, sw * 1.06, a), y + 0.15, 0.008, shade(col(PAL.goldGlow), 0.5)); // laje de ouro rebaixada: em brilho cheio o bloom estourava o santuário
      B.panel(B.glow, x + c2 * sw * 0.64, y + 0.018, z + sn * sw * 0.64, sw * 0.5, 0.1, a, col(PAL.glyph), 0.008);
      B.frustum(B.glow, x, y + 0.17, z, 0.03, 0.065, 0.78, 5, shade(col(PAL.goldGlow), 0.3), a, { noTop: true }); // facho subindo do altar
      const steps = 12, run = 0.95 / 2 + 0.16;
      for (let k = 0; k < steps; k++) { // escadaria monumental
        const f = (k + 1) / steps, dist = run * (1 - f) + 0.04;
        B.extrude(B.lit, rect(x + c2 * dist, z + sn * dist, 0.072, 0.3, a), H, (y - H) * f * 0.95, shade(body, 1.05 + 0.08 * (k % 2)), { topCol: col(PAL.brickLight) });
      }
      for (const sd of [1, -1]) { brazier(B, x + c2 * (run + 0.07) - sn * sd * 0.26, z + sn * (run + 0.07) + c2 * sd * 0.26, 1.8); brazier(B, x - c2 * 0.5 - sn * sd * 0.5, z - sn * 0.5 + c2 * sd * 0.5, 1.4); }
      for (let k = 0; k < 3; k++) { const ang = a + 2 + k * 1.1; steles(B, rng, { x: x + Math.cos(ang) * 0.68, z: z + Math.sin(ang) * 0.68, a: ang }); }
      for (let k = 0; k < 2; k++) { const ang = a + 1.5 + k * 3.1; palm(B, rng, x + Math.cos(ang) * 0.72, z + Math.sin(ang) * 0.72, 0.9); }
      B.anims.push({ type: 'drone', geo: 'glyph', x, y: y + 0.42, z, r: 0.34, speed: 0.3, color: PAL.lapisGlow });
      B.anims.push({ type: 'drone', geo: 'glyph', x, y: y + 0.6, z, r: 0.2, speed: -0.45, color: PAL.goldGlow });
    } else { // GRANDE PORTAL DE ISHTAR: duas torres de lápis e a via processional saindo do vão
      const lap = col(PAL.lapis), gold = col(PAL.gold), lapGlow = shade(col(PAL.lapisGlow), 0.55);
      const c2 = Math.cos(a), sn = Math.sin(a), px = -sn, pz = c2, d = 0.3, h = 0.6, tw = 0.24;
      const way = [[x + c2 * 0.14, z + sn * 0.14], [x + c2 * 1.02, z + sn * 1.02]]; // via processional
      B.ribbon(B.lit, way, 0.33, H + 0.004, col(PAL.brick[3]));
      for (const sd of [1, -1]) B.ribbon(B.glow, offsetLine(way, sd * 0.148), 0.018, H + 0.007, lapGlow);
      for (const sd of [1, -1]) for (let k = 0; k < 4; k++) { // leões em relevo ladeando a via
        const t = 0.32 + k * 0.2, lx = x + c2 * t + px * sd * 0.21, lz = z + sn * t + pz * sd * 0.21;
        B.extrude(B.lit, rect(lx, lz, 0.11, 0.05, a), H, 0.048, col(PAL.brick[2]), { topCol: col(PAL.brickLight), sideShade: true });
        B.panel(B.glow, lx - px * sd * 0.026, H + 0.012, lz - pz * sd * 0.026, 0.09, 0.026, a, shade(col(PAL.goldGlow), 0.72), 0.004);
      }
      for (const sd of [1, -1]) { // torres revestidas de lápis, com fiadas de rosetas e ameias
        const tx = x + px * sd * d, tz = z + pz * sd * d, body = col(PAL.brick[1]);
        // Massa de tijolo com o lápis só no embasamento e nos frisos: em brilho cheio e no tamanho
        // de marco, o azul inteiro fazia a peça ler como Cidade Neon (ver README).
        B.extrude(B.lit, rect(tx, tz, tw, tw, a), H, h * 0.26, lap, { topCol: shade(lap, 1.5), sideShade: true });
        B.extrude(B.lit, rect(tx, tz, tw - 0.014, tw - 0.014, a), H + h * 0.26, h * 0.74, body, { topCol: shade(body, 1.2), sideShade: true });
        for (let k = 0; k < 4; k++) for (const fs of [1, -1]) B.sphere(B.glow, tx + c2 * fs * (tw / 2 - 0.004), H + h * (0.36 + k * 0.16), tz + sn * fs * (tw / 2 - 0.004), 0.019, gold, 6, 3);
        for (let k = 0; k < 3; k++) B.extrude(B.glow, rect(tx, tz, tw - 0.002, tw - 0.002, a), H + h * (0.33 + k * 0.21), 0.008, lapGlow); // frisos horizontais
        B.extrude(B.lit, rect(tx, tz, tw + 0.04, tw + 0.04, a), H + h, 0.036, col(PAL.brickLight), { topCol: gold, sideShade: true });
        for (let k = -1; k <= 1; k++) for (const fs of [1, -1]) B.extrude(B.lit, rect(tx + c2 * fs * 0.13 + px * k * 0.085, tz + sn * fs * 0.13 + pz * k * 0.085, 0.034, 0.05, a), H + h + 0.036, 0.042, col(PAL.brickLight), { topCol: shade(gold, 1.1) }); // ameias
        brazier(B, tx + c2 * 0.24, tz + sn * 0.24, 2.0);
      }
      B.extrude(B.lit, rect(x - c2 * 0.03, z - sn * 0.03, 0.06, 2 * d - tw, a), H, h * 0.7, col(PAL.brickDark), { topCol: col(PAL.brickDark), sideShade: true }); // fundo do vão
      B.panel(B.glow, x + c2 * 0.012, H + 0.006, z + sn * 0.012, 2 * d - tw - 0.06, h * 0.56, a, shade(col(PAL.glyph), 0.42), 0.016); // luz saindo do vão, rebaixada
      B.extrude(B.lit, rect(x, z, 0.2, 2 * d - tw + 0.04, a), H + h * 0.7, 0.11, col(PAL.brickLight), { topCol: gold, sideShade: true }); // lintel
      B.extrude(B.glow, rect(x, z, 0.21, 2 * d - tw + 0.05, a), H + h * 0.7 + 0.112, 0.008, lapGlow);
      for (const sd of [1, -1]) { // guardiões alados no pé das torres, voltados para a via
        const gx = x + c2 * 0.2 + px * sd * (d - 0.04), gz = z + sn * 0.2 + pz * sd * (d - 0.04);
        B.extrude(B.lit, rect(gx, gz, 0.11, 0.06, a), H, 0.075, col(PAL.brickLight), { topCol: col(PAL.brick[2]), sideShade: true });
        B.sphere(B.lit, gx + c2 * 0.036, H + 0.102, gz + sn * 0.036, 0.034, col(PAL.brickLight), 7, 4);
        B.sphere(B.glow, gx + c2 * 0.062, H + 0.106, gz + sn * 0.062, 0.009, col(PAL.glyph), 5, 3);
        for (const wsd of [1, -1]) B.leaf(B.lit, [gx - c2 * 0.024, H + 0.078, gz - sn * 0.024], a + (Math.PI / 2) * wsd, 0.065, 0.04, gold, { lift: 0.036, droop: 0.008, segs: 2 });
      }
      for (let k = 0; k < 3; k++) { const ang = a + 2.2 + k * 0.85; steles(B, rng, { x: x + Math.cos(ang) * 0.66, z: z + Math.sin(ang) * 0.66, a: ang }); }
      for (let k = 0; k < 2; k++) { const ang = a + 1.7 + k * 2.9; palm(B, rng, x + Math.cos(ang) * 0.74, z + Math.sin(ang) * 0.74, 0.95); }
      oasis(B, rng, { x: x - c2 * 0.62, z: z - sn * 0.62, a: a + Math.PI });
      B.anims.push({ type: 'drone', geo: 'glyph', x, y: H + h + 0.3, z, r: 0.42, speed: 0.26, color: PAL.lapisGlow });
    }
  } else if (type === 'plain') { // geleira com estação de pesquisa, ou cânion de gelo com cascata congelada
    const v = rng.int(3), c = col(PAL.iceRock[1]);
    if (v === 0) {
      B.frustum(B.lit, x, H, z, 0.42, 0.06, 0.9, 7, c, a);
      B.cone(B.lit, x, H + 0.58, z, 0.21, 0.38, col(PAL.snow), 7, a);
      B.frustum(B.lit, x + Math.cos(a + 2.3) * 0.24, H, z + Math.sin(a + 2.3) * 0.24, 0.26, 0.03, 0.5, 6, shade(c, 0.9), a + 0.4); B.cone(B.lit, x + Math.cos(a + 2.3) * 0.24, H + 0.34, z + Math.sin(a + 2.3) * 0.24, 0.13, 0.2, col(PAL.snow), 6, a + 0.4);
      B.frustum(B.lit, x + Math.cos(a - 1.9) * 0.28, H, z + Math.sin(a - 1.9) * 0.28, 0.2, 0.02, 0.38, 5, shade(c, 1.08), a - 0.3);
      for (let k = 0; k < 4; k++) { const ang = a + k * 1.5 + 0.6; B.panel(B.glow, x + Math.cos(ang) * 0.3, H + 0.08 + 0.18 * (k % 2), z + Math.sin(ang) * 0.3, 0.035, 0.26, ang + Math.PI / 2, col(PAL.crystalGlow), 0.008); } // veios de cristal
      const dx = x + Math.cos(a) * 0.52, dz = z + Math.sin(a) * 0.52, cream = col(PAL.cream); // estação de pesquisa em domo
      B.sphere(B.lit, dx, H, dz, 0.11, cream, 12, 5, { dome: true, sy: 0.8 });
      B.annulus(B.glow, dx, H + 0.004, dz, 0.11, 0.128, 12, col('#38ff9b'));
      B.panel(B.glow, dx + Math.cos(a) * 0.1, H + 0.02, dz + Math.sin(a) * 0.1, 0.06, 0.035, a, shade(col(PAL.warmWin), 0.9), 0.006);
      B.extrude(B.lit, ngon(dx - Math.sin(a) * 0.1, dz + Math.cos(a) * 0.1, 0.008, 6), H, 0.3, col(PAL.post)); B.sphere(B.glow, dx - Math.sin(a) * 0.1, H + 0.31, dz + Math.cos(a) * 0.1, 0.014, col(PAL.beacon), 6, 3);
      for (let k = 0; k < 3; k++) { const ang = a + 1.1 + k * 1.4; snowPine(B, rng, x + Math.cos(ang) * 0.6, z + Math.sin(ang) * 0.6, 1.1); }
    } else if (v === 1) {
      const px = Math.cos(a + Math.PI / 2), pz = Math.sin(a + Math.PI / 2); // duas falésias de gelo facetadas com uma cascata congelada entre elas
      for (const [side, hh] of [[1, 0.56], [-1, 0.46]]) { // falésia em três degraus afinando para cima, com picos de gelo no topo
        const wx = x + px * side * 0.3, wz = z + pz * side * 0.3; let y = H;
        for (let t = 0; t < 3; t++) { const f = 1 - t * 0.16, th = hh * (t === 2 ? 0.3 : 0.35); B.extrude(B.lit, chamfer(wx + px * side * t * 0.03, wz + pz * side * t * 0.03, 0.52 * f, 0.22 * f, a + rng.range(-0.05, 0.05), 0.03), y, th, shade(c, 0.9 + t * 0.07), { topCol: t === 2 ? col(PAL.snow) : shade(c, 1.15), sideShade: true }); y += th; }
        for (let k = -1; k <= 1; k++) B.cone(B.lit, wx + Math.cos(a) * k * 0.15 + px * side * 0.06, y - 0.01, wz + Math.sin(a) * k * 0.15 + pz * side * 0.06, 0.05, 0.12 + 0.05 * (k === 0), col(PAL.snow), 5, k);
        B.panel(B.glow, wx - px * side * 0.1, H + 0.06, wz - pz * side * 0.1, 0.04, 0.2, a, col(PAL.crystalGlow), 0.008); // veio de cristal virado para o cânion
      }
      B.panel(B.glow, x - Math.cos(a) * 0.24, H, z - Math.sin(a) * 0.24, 0.24, 0.44, a + Math.PI / 2, shade(col(PAL.crystalGlow), 0.7), 0.02); // cascata congelada
      for (let k = 0; k < 4; k++) B.cone(B.lit, x - Math.cos(a) * 0.2 + px * (k - 1.5) * 0.06, H + 0.44, z - Math.sin(a) * 0.2 + pz * (k - 1.5) * 0.06, 0.012, -0.08, col(PAL.crystal), 5, k); // estalactites
      B.extrude(B.glow, ngon(x - Math.cos(a) * 0.08, z - Math.sin(a) * 0.08, 0.15, 10, a), H, 0.006, col(PAL.iceHole)); // lago de degelo
      B.extrude(B.lit, rect(x, z, 0.06, 0.6, a), H + 0.46, 0.012, col(PAL.sleeper)); // passarela entre as paredes
      for (let k = -1; k <= 1; k++) { B.extrude(B.lit, ngon(x + px * k * 0.2, z + pz * k * 0.2, 0.006, 5), H + 0.47, 0.06, col(PAL.post)); B.sphere(B.glow, x + px * k * 0.2, H + 0.54, z + pz * k * 0.2, 0.011, col(PAL.lampWarm), 6, 3); }
      for (let k = 0; k < 4; k++) { const ang = a + k * 1.2 - 0.6, rr = 0.5; const q = { x: x + Math.cos(ang) * rr, z: z + Math.sin(ang) * rr, a: ang }; if (k % 2) icePeak(B, rng, q, 0.7); else B.sphere(B.lit, q.x, H, q.z, rng.range(0.03, 0.05), col(PAL.snow), 6, 3, { dome: true, sy: 0.7 }); }
    } else { // ACAMPAMENTO SOB A AURORA: iglus grandes, inuksuk monumental e a cortina inteira
      const snow = col(PAL.snow);
      B.extrude(B.lit, ngon(x, z, 0.62, 13, a), H, 0.02, shade(snow, 0.94), { topCol: snow, sideShade: true }); // platô de neve pisada
      B.annulus(B.glow, x, H + 0.022, z, 0.6, 0.64, 16, shade(col(PAL.crystalGlow), 0.7));
      for (let k = 0; k < 4; k++) { const ang = a + 0.8 + k * 1.35, d = k === 0 ? 0 : 0.34; igloo(B, rng, { x: x + Math.cos(ang) * d, z: z + Math.sin(ang) * d, a: ang }, k === 0 ? 1.9 : rng.range(0.9, 1.25)); }
      const fx = x + Math.cos(a) * 0.3, fz = z + Math.sin(a) * 0.3; // fogueira central
      B.annulus(B.lit, fx, H + 0.023, fz, 0.05, 0.085, 12, shade(snow, 0.8));
      for (let k = 0; k < 6; k++) { const ang = (k / 6) * PI2; B.tube(B.lit, [[fx + Math.cos(ang) * 0.04, H + 0.02, fz + Math.sin(ang) * 0.04], [fx, H + 0.085, fz]], [0.008, 0.005], 4, col(PAL.woodDark)); }
      B.sphere(B.glow, fx, H + 0.085, fz, 0.038, col('#ff7a1a'), 8, 4);
      inuksuk(B, rng, { x: x - Math.cos(a) * 0.46, z: z - Math.sin(a) * 0.46, a: a + Math.PI });
      B.extrude(B.lit, rect(x - Math.cos(a) * 0.46, z - Math.sin(a) * 0.46, 0.2, 0.2, a), H + 0.02, 0.06, shade(col(PAL.iceRock[3]), 0.9), { topCol: col(PAL.iceRock[0]), sideShade: true }); // pedestal do inuksuk
      for (let k = 0; k < 2; k++) { const ang = a + 2.5 + k * 1.2; aurora(B, rng, { x: x + Math.cos(ang) * 0.48, z: z + Math.sin(ang) * 0.48, a: ang + Math.PI / 2 }, 1.45); }
      for (let k = 0; k < 3; k++) { const ang = a - 1.4 + k * 1.1; snowPine(B, rng, x + Math.cos(ang) * 0.7, z + Math.sin(ang) * 0.7, 1.2); }
      sled(B, rng, { x: x + Math.cos(a + 1.9) * 0.44, z: z + Math.sin(a + 1.9) * 0.44, a: a + 1.9 });
      fishingHut(B, rng, { x: x + Math.cos(a - 1.9) * 0.52, z: z + Math.sin(a - 1.9) * 0.52, a: a - 1.9 });
    }
  } else if (type === 'pool') { // reator
    const base = col('#3a4058');
    B.extrude(B.lit, ngon(x, z, 0.16, 14), H, 0.3, base, { topCol: shade(base, 1.3), sideShade: true });
    B.frustum(B.lit, x, H + 0.3, z, 0.16, 0.1, 0.16, 14, shade(base, 1.1));
    for (const y of [0.08, 0.18, 0.28]) B.annulus(B.glow, x, H + y, z, 0.162, 0.178, 14, col(PAL.barrelRing));
    B.sphere(B.glow, x, H + 0.46, z, 0.05, col(PAL.algae), 10, 5);
    B.panel(B.glow, x + Math.cos(a) * 0.17, H + 0.12, z + Math.sin(a) * 0.17, 0.12, 0.08, a, col('#ffe93a'), 0.01);
    for (let k = 0; k < 3; k++) { const ang = a + k * 2.1 + 0.5; barrel(B, rng, x + Math.cos(ang) * 0.28, z + Math.sin(ang) * 0.28); }
  }
}

// ---------- detalhes de chão por bioma ----------
function groundDetail(B, rng, g, i, polys, centerR = 0, keep, iris) {
  const a = edgeAngle(i), dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx, pt = (t, s) => [dx * t + px * s, dz * t + pz * s];
  const clear = (x, z) => (!polys || distToPolys(polys, x, z) > 0.2) && Math.hypot(x, z) > centerR && (!keep || keep(x, z));
  if (g === 'rock') { // estratos e pedrinhas
    for (let k = 0; k < 2; k++) { const [x, z] = pt(rng.range(0.25, 0.75), rng.range(-0.18, 0.18)); if (!clear(x, z)) continue; B.extrude(B.lit, rect(x, z, rng.range(0.14, 0.3), 0.012, a + rng.range(-0.5, 0.5)), H, 0.003, col(PAL.rockDark)); }
    for (let k = 0; k < 3; k++) { const [x, z] = pt(rng.range(0.25, 0.78), rng.range(-0.2, 0.2)); if (!clear(x, z)) continue; B.extrude(B.lit, ngon(x, z, rng.range(0.012, 0.028), 5, rng.float() * 6), H, rng.range(0.006, 0.014), col(rng.pick(PAL.rock))); }
  } else if (g === 'grass') { // manchas de terra batida e um musgo raro: o estuque fica quase limpo
    for (let k = 0; k < 2; k++) { const [x, z] = pt(rng.range(0.25, 0.75), rng.range(-0.18, 0.18)); if (!clear(x, z)) continue; B.extrude(B.lit, ngon(x, z, rng.range(0.05, 0.1), 7, rng.float() * 6), H, 0.003, col(rng.chance(0.65) ? '#bfa77c' : '#a8b86a')); }
    for (let k = 0; k < 3; k++) { const [x, z] = pt(rng.range(0.25, 0.8), rng.range(-0.22, 0.22)); if (!clear(x, z)) continue; if (k === 0) wildFlower(B, rng, x, z, col(iris)); else B.cone(B.lit, x, H, z, 0.014, rng.range(0.03, 0.05), col(rng.pick(PAL.tuft)), 4, rng.float() * 6); } // flor solta e capim
  } else if (g === 'solar') {
    const [px0, pz0] = pt(0.18, 0), [px1, pz1] = pt(0.8, 0);
    if (clear(px0, pz0) && clear(px1, pz1)) { // caminho de lajotas de estuque
      for (let k = 0; k < 6; k++) { const t = 0.2 + k * 0.11, [x, z] = pt(t, rng.range(-0.01, 0.01)); B.extrude(B.lit, chamfer(x, z, 0.07, 0.06, a + rng.range(-0.2, 0.2), 0.012), H, 0.004, col(rng.pick(PAL.stucco))); }
    }
    for (let k = 0; k < 3; k++) { const [x, z] = pt(rng.range(0.25, 0.78), rng.range(-0.2, 0.2)); if (!clear(x, z)) continue; B.extrude(B.lit, ngon(x, z, rng.range(0.04, 0.075), 7, rng.float() * 6), H, 0.004, col(rng.pick(PAL.lawn))); } // gramado mais claro
    for (let k = 0; k < 12; k++) { const [x, z] = pt(rng.range(0.22, 0.82), rng.range(-0.24, 0.24)); if (!clear(x, z)) continue; B.sphere(B.glow, x, H + 0.014, z, rng.range(0.009, 0.016), col(rng.pick(PAL.meadow)), 6, 3); } // campina florida
  } else if (g === 'cyber') {
    const [x0, z0] = pt(0.2, 0), [x1, z1] = pt(0.78, 0);
    if (clear(x0, z0) && clear(x1, z1)) B.extrude(B.glow, rect((x0 + x1) / 2, (z0 + z1) / 2, 0.58, 0.006, a), H, 0.002, col('#1d5a78'));
    for (let k = 0; k < 2; k++) { const [x, z] = pt(rng.range(0.3, 0.75), rng.range(-0.2, 0.2)); if (!clear(x, z)) continue; B.sphere(B.glow, x, H + 0.006, z, 0.01, col(rng.pick(['#22f3ff', '#ff2bd6'])), 6, 3); }
  } else if (g === 'plain') {
    for (let k = 0; k < 2; k++) { const [x, z] = pt(rng.range(0.25, 0.7), rng.range(-0.15, 0.15)); if (!clear(x, z)) continue; B.extrude(B.glow, rect(x, z, rng.range(0.12, 0.28), 0.006, a + rng.range(-0.9, 0.9)), H, 0.002, shade(col(PAL.crack), 0.9)); }
    const [x, z] = pt(rng.range(0.3, 0.7), rng.range(-0.15, 0.15)); if (clear(x, z)) B.extrude(B.lit, ngon(x, z, rng.range(0.05, 0.1), 8, rng.float() * 6), H, 0.004, col(PAL.iceDark));
    for (let k = 0; k < 2; k++) { const [x2, z2] = pt(rng.range(0.25, 0.78), rng.range(-0.2, 0.2)); if (!clear(x2, z2)) continue; B.sphere(B.lit, x2, H - 0.03, z2, rng.range(0.06, 0.12), col(PAL.snow), 8, 3, { dome: true, sy: 0.35 }); } // dunas de neve
  }
}
function drawFlag(B, x, z, a, color) {
  const c = col(color);
  B.annulus(B.glow, x, H + 0.02, z, 0.07, 0.1, 14, c);
  B.extrude(B.lit, ngon(x, z, 0.012, 8), H, 0.6, col('#f4f6fb'));
  const dx = Math.cos(a), dz = Math.sin(a), top = [x, H + 0.6, z], mid = [x, H + 0.47, z], tip = [x + dx * 0.18, H + 0.535, z + dz * 0.18];
  B.tri(B.glow, top, mid, tip, c, [-dz, 0, dx]); B.tri(B.glow, top, mid, tip, c, [dz, 0, -dx]);
  B.sphere(B.glow, x, H + 0.61, z, 0.016, c, 6, 3);
}
export const GROUPS = { plain: 'plain', grass: 'grass', cyber: 'cyber', solar: 'solar', rock: 'rock', pool: 'toxic', sewage: 'toxic', rail: 'rail', road: 'road' };

// ---------- montagem ----------
export { pathLength, pointAt, connectorLayout };
export function buildTile(tile) {
  const rng = new RNG(tile.seed), B = new Builder(), verts = [];
  // esquema de neon da peca inteira (rng proprio: nao perturba a ordem de sorteio do layout)
  const cyberSch = PAL.neonSchemes[new RNG(((tile.seed ^ 0x9e37) >>> 0) || 1).int(PAL.neonSchemes.length)];
  for (let i = 0; i < 6; i++) verts.push([Math.cos(vertexAngle(i)) * SCALE, Math.sin(vertexAngle(i)) * SCALE]);
  for (let i = 0; i < 6; i++) {
    const g = tile.ground[i], c = shade(col(PAL.ground[g]), 0.94 + rng.float() * 0.12), vi = verts[i], vj = verts[(i + 1) % 6];
    if (g === 'pool') B.tri(B.water, [0, H, 0], [vi[0], H, vi[1]], [vj[0], H, vj[1]], col('#ffffff'), [0, 1, 0]);
    else B.tri(B.lit, [0, H, 0], [vi[0], H, vi[1]], [vj[0], H, vj[1]], c, [0, 1, 0]);
    const a = edgeAngle(i), sc = shade(col(PAL.sideOf[g]), 0.9 + (i % 2) * 0.15);
    B.quad(B.lit, [vi[0], 0, vi[1]], [vj[0], 0, vj[1]], [vj[0], H, vj[1]], [vi[0], H, vi[1]], sc, [Math.cos(a), 0, Math.sin(a)]);
    // friso neon no topo da borda
    const k = 0.965, ki = 0.945, rim = shade(col(PAL.rim[g]), 0.55);
    B.quad(B.glow, [vi[0] * k, H + 0.003, vi[1] * k], [vj[0] * k, H + 0.003, vj[1] * k], [vj[0] * ki, H + 0.003, vj[1] * ki], [vi[0] * ki, H + 0.003, vi[1] * ki], rim, [0, 1, 0]);
  }
  const occupied = [];
  let lay = null, polys = null, routes = null;
  if (tile.conn) {
    lay = connectorLayout(tile.conn); polys = lay.polys; lay.dual = !!tile.conn2;
    if (tile.conn.type === 'sewage') drawSewage(B, rng, lay); else if (tile.conn.type === 'rail') drawRail(B, rng, lay); else drawRoad(B, rng, lay);
    if (lay.kind !== 'line') occupied.push({ x: 0, z: 0, r: lay.kind === 'end' ? 0.5 : 0.42 }); // junção/terminal ocupa o centro
    routes = lay.routes.map((r) => ({ ...r, type: tile.conn.type, stop: tile.conn.type === 'sewage' ? B.boatStop || 0 : 0 }));
  }
  if (tile.conn2) { // cruzamento: o segundo meio passa por cima
    const lay2 = connectorLayout(tile.conn2), e = tile.conn2.exits[0], axis = [Math.cos(edgeAngle(e)), Math.sin(edgeAngle(e))];
    drawBridge(B, rng, tile.conn2.type, lay2); // (a rodovia, quando existe, é sempre a de cima: os carros moram nela)
    polys = polys.concat(lay2.polys);
    routes = routes.concat(lay2.routes.map((r) => ({ ...r, type: tile.conn2.type, bridge: axis, stop: 0 })));
    occupied.push({ x: 0, z: 0, r: 0.3 });
  }
  const counts = {};
  for (const g of tile.ground) counts[g] = (counts[g] || 0) + 1;
  const [domType, domCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  let landmark = null;
  // Marco é achado, não mobília: antes toda peça com 3+ setores do mesmo bioma ganhava um, e uma
  // área grande virava fileira de Grandes Zigurates. A chance cresce com o domínio do bioma e sai
  // de um RNG próprio da peça (não desloca o sorteio do layout e é a mesma na pilha e no tabuleiro).
  const LANDMARK_P = { 3: 0.12, 4: 0.2, 5: 0.3, 6: 0.5 };
  if (!tile.conn && domCount >= 3 && domType !== 'grass' && (tile.relic || new RNG(((tile.seed ^ 0x51ed27) >>> 0) || 7).float() < LANDMARK_P[domCount])) {
    const idxs = tile.ground.map((g, i) => (g === domType ? i : -1)).filter((i) => i >= 0);
    let sx = 0, sz = 0;
    for (const i of idxs) { sx += Math.cos(edgeAngle(i)); sz += Math.sin(edgeAngle(i)); }
    const m = Math.hypot(sx, sz), off = domCount === 6 ? 0 : 0.18;
    landmark = { x: m > 1e-6 ? (sx / m) * off : 0, z: m > 1e-6 ? (sz / m) * off : 0, a: Math.atan2(sz, sx), type: domType };
    occupied.push({ x: landmark.x, z: landmark.z, r: 0.4 });
  }
  // Trilhas de fauna: um setor é caminhável quando a ARESTA é do bioma (numa peça com conector,
  // os lados de saída não são). O marco e o entroncamento empurram a rota para o anel.
  const walk = tile.edges.map((e, i) => !!WALK_GROUND[e] && !!WALK_GROUND[tile.ground[i]]);
  const hub = landmark || tile.conn ? HUB_R : 0;
  const keep = walkTrails(B, rng, tile, walk, hub, !tile.conn);
  const iris = PAL.iris[new RNG(((tile.seed ^ 0x1215) >>> 0) || 3).int(PAL.iris.length)]; // cor das flores do Baldio desta peça
  for (let i = 0; i < 6; i++) groundDetail(B, rng, tile.ground[i], i, polys, lay && lay.kind !== 'line' ? (lay.kind === 'end' ? 0.52 : 0.46) : 0, keep, iris);
  if (tile.quest) {
    let fi = tile.ground.findIndex((g) => GROUPS[g] === tile.quest.group);
    if (fi < 0 && tile.conn) fi = tile.conn.exits[0];
    if (fi < 0) fi = 0;
    const a = edgeAngle(fi), fx = Math.cos(a) * 0.5, fz = Math.sin(a) * 0.5;
    occupied.push({ x: fx, z: fz, r: 0.12 });
    drawFlag(B, fx, fz, a + Math.PI / 2, tile.quest.color);
  }
  for (let i = 0; i < 6; i++) {
    const g = tile.ground[i];
    const n = g === 'cyber' ? 2 + rng.int(2) : g === 'solar' ? 3 + rng.int(2) : g === 'rock' ? 2 + rng.int(2) : g === 'pool' ? rng.int(2) : g === 'grass' ? 1 + rng.int(2) : 2 + rng.int(2);
    const pts = sectorPoints(rng, i, n, occupied, polys, g === 'solar' ? 0.19 : 0.17, keep);
    if (g === 'cyber') drawCyber(B, rng, pts, i, cyberSch); else if (g === 'solar') drawSolar(B, rng, pts); else if (g === 'rock') drawRock(B, rng, pts); else if (g === 'pool') drawPool(B, rng, pts); else if (g === 'grass') drawGrass(B, rng, pts, iris); else drawIce(B, rng, pts);
  }
  if (landmark) drawLandmark(B, rng, landmark.type, landmark.x, landmark.z, landmark.a, cyberSch);
  if (landmark && landmark.type === 'cyber') B.buildings++;
  const out = B.build();
  out.routes = routes; out.polys = polys; out.hub = hub;
  return out;
}

// Geometria de realce de uma formação: setores do grupo + faixa do conector (uma cor por grupo, material translúcido)
export function buildHighlight(tile, group) {
  const B = new Builder(), c = col('#ffffff'), k = 0.94;
  for (let i = 0; i < 6; i++) {
    if (GROUPS[tile.ground[i]] !== group) continue;
    const vi = [Math.cos(vertexAngle(i)) * k, Math.sin(vertexAngle(i)) * k], vj = [Math.cos(vertexAngle(i + 1)) * k, Math.sin(vertexAngle(i + 1)) * k];
    B.tri(B.lit, [0, 0, 0], [vi[0], 0, vi[1]], [vj[0], 0, vj[1]], c, [0, 1, 0]);
  }
  for (const cn of [tile.conn, tile.conn2]) if (cn && GROUPS[cn.type] === group) {
    const lay = connectorLayout(cn);
    for (const p of lay.polys) B.ribbon(B.lit, p, 0.5, 0.003, c);
    if (lay.kind !== 'line') { const r = lay.kind === 'end' ? 0.46 : 0.42; for (let i = 0; i < 12; i++) { const a0 = (i / 12) * PI2, a1 = ((i + 1) / 12) * PI2; B.tri(B.lit, [0, 0.003, 0], [Math.cos(a0) * r, 0.003, Math.sin(a0) * r], [Math.cos(a1) * r, 0.003, Math.sin(a1) * r], c, [0, 1, 0]); } }
  }
  return B.build().lit;
}

export function buildRotorGeometry() {
  const B = new Builder(), c = col('#f4f6fb');
  for (let k = 0; k < 3; k++) {
    const ang = k * 2.094, L = 0.17, W = 0.022, tip = [0, Math.sin(ang) * L, Math.cos(ang) * L], mid = [0, Math.sin(ang) * L * 0.5, Math.cos(ang) * L * 0.5];
    const b1 = [0, Math.cos(ang) * W, -Math.sin(ang) * W], b2 = [0, -Math.cos(ang) * W, Math.sin(ang) * W];
    const m1 = [0, mid[1] + Math.cos(ang) * W * 1.3, mid[2] - Math.sin(ang) * W * 1.3], m2 = [0, mid[1] - Math.cos(ang) * W * 1.3, mid[2] + Math.sin(ang) * W * 1.3];
    B.quad(B.lit, b1, b2, m2, m1, c, [1, 0, 0]); B.quad(B.lit, b1, b2, m2, m1, shade(c, 0.85), [-1, 0, 0]);
    B.tri(B.lit, m1, m2, tip, c, [1, 0, 0]); B.tri(B.lit, m1, m2, tip, shade(c, 0.85), [-1, 0, 0]);
  }
  B.sphere(B.lit, 0, 0, 0, 0.026, shade(c, 0.9), 8, 4);
  return B.build().lit;
}
export function buildVaxRotorGeometry() {
  const B = new Builder(), c = col('#eef2f8'), L = 0.22, R = 0.1, nb = 3, twist = 1.35;
  for (let k = 0; k < nb; k++) {
    const base = (k / nb) * PI2, pts = [], rad = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, ang = base + twist * t, r = R * Math.sin(Math.PI * t) + 0.006;
      pts.push([(t - 0.5) * L, Math.cos(ang) * r, Math.sin(ang) * r]); rad.push(0.008);
    }
    B.tube(B.lit, pts, rad, 5, c);
  }
  B.tube(B.lit, [[-L / 2, 0, 0], [0, 0, 0], [L / 2, 0, 0]], [0.007, 0.007, 0.007], 6, shade(c, 0.85));
  return B.build().lit;
}
// Vagão do trem-bala, pequeno (cabe ~3 num hexágono): `head` tem o nariz afilado em +x.
export function buildTrainCarGeometry(head) {
  const B = new Builder(), body = col(PAL.train), L = 0.17, W = 0.07;
  B.extrude(B.lit, rect(head ? -0.01 : 0, 0, L - 0.02, W - 0.014, 0), 0.006, 0.016, col(PAL.trainDark));
  B.extrude(B.glow, rect(0, 0, L - 0.03, W - 0.006, 0), 0.004, 0.003, shade(col('#22f3ff'), 0.8));
  const bodyL = head ? L * 0.62 : L, cx = head ? -L * 0.19 : 0;
  B.extrude(B.lit, chamfer(cx, 0, bodyL, W, 0, 0.012), 0.02, 0.05, body, { topCol: col(PAL.trainRoof) });
  B.extrude(B.glow, rect(cx, 0, bodyL - 0.01, W + 0.003, 0), 0.032, 0.009, col(PAL.trainStripe));
  B.extrude(B.lit, rect(cx, 0, bodyL - 0.03, W + 0.002, 0), 0.047, 0.012, col(PAL.trainWin));
  if (head) { // nariz: cunha baixa que afina até a ponta, com farol
    const x0 = cx + bodyL / 2, x1 = L / 2 + 0.03, hw = W / 2;
    B.extrude(B.lit, [[x0, -hw], [x1, -hw * 0.25], [x1, hw * 0.25], [x0, hw]], 0.02, 0.03, body, { topCol: col(PAL.trainRoof) });
    B.extrude(B.lit, [[x0, -hw * 0.9], [x0 + (x1 - x0) * 0.55, -hw * 0.5], [x0 + (x1 - x0) * 0.55, hw * 0.5], [x0, hw * 0.9]], 0.05, 0.016, col(PAL.trainWin));
    B.extrude(B.glow, rect(x1 - 0.004, 0, 0.008, hw * 0.5, 0), 0.026, 0.012, col(PAL.headlight));
  } else B.extrude(B.glow, rect(L / 2 - 0.004, 0, 0.006, W * 0.5, 0), 0.03, 0.01, col(PAL.tail));
  return B.build();
}
export function buildVehicleGeometry(type, color) {
  const B = new Builder();
  drawCar(B, 0, 0, 0, 0, color);
  return B.build();
}
export function buildDroneGeometry(color) {
  const B = new Builder();
  B.extrude(B.lit, chamfer(0, 0, 0.07, 0.05, 0, 0.015), -0.01, 0.022, col('#2a2d3a'), { topCol: col('#3a3e4e') });
  for (const [ox, oz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { B.extrude(B.lit, rect(ox * 0.04, oz * 0.03, 0.03, 0.006, 0), 0.005, 0.004, col('#8d93ad')); B.annulus(B.lit, ox * 0.05, 0.012, oz * 0.035, 0.008, 0.016, 8, col('#c9cfe0')); }
  B.annulus(B.glow, 0, -0.012, 0, 0.012, 0.024, 10, col(color));
  B.sphere(B.glow, 0.036, 0.004, 0, 0.008, col('#ff3b5c'), 6, 3);
  return B.build();
}
export function buildSlotRing() {
  const B = new Builder(), ro = 0.97, ri = 0.88, c = col('#ffffff');
  for (let i = 0; i < 6; i++) { const a0 = vertexAngle(i), a1 = vertexAngle(i + 1); B.quad(B.lit, [Math.cos(a0) * ro, 0, Math.sin(a0) * ro], [Math.cos(a1) * ro, 0, Math.sin(a1) * ro], [Math.cos(a1) * ri, 0, Math.sin(a1) * ri], [Math.cos(a0) * ri, 0, Math.sin(a0) * ri], c, [0, 1, 0]); }
  return B.build().lit;
}
export function buildHexDisc() {
  const B = new Builder(), c = col('#ffffff');
  for (let i = 0; i < 6; i++) { const a0 = vertexAngle(i), a1 = vertexAngle(i + 1); B.tri(B.lit, [0, 0, 0], [Math.cos(a0) * 0.97, 0, Math.sin(a0) * 0.97], [Math.cos(a1) * 0.97, 0, Math.sin(a1) * 0.97], c, [0, 1, 0]); }
  return B.build().lit;
}

// Lâmina fina para a pilha de peças: topo com os terrenos (e conector), laterais e friso neon
export function buildSlab(tile, h = 0.11) {
  const B = new Builder(), verts = [];
  for (let i = 0; i < 6; i++) verts.push([Math.cos(vertexAngle(i)) * SCALE, Math.sin(vertexAngle(i)) * SCALE]);
  for (let i = 0; i < 6; i++) {
    const g = tile.ground[i], vi = verts[i], vj = verts[(i + 1) % 6], a = edgeAngle(i);
    const top = g === 'pool' ? col('#12806a') : shade(col(PAL.ground[g]), 0.96 + (i % 2) * 0.06);
    B.tri(B.lit, [0, h, 0], [vi[0], h, vi[1]], [vj[0], h, vj[1]], top, [0, 1, 0]);
    B.quad(B.lit, [vi[0], 0, vi[1]], [vj[0], 0, vj[1]], [vj[0], h, vj[1]], [vi[0], h, vi[1]], shade(col(PAL.sideOf[g]), 0.9 + (i % 2) * 0.15), [Math.cos(a), 0, Math.sin(a)]);
    const k = 0.965, ki = 0.945;
    B.quad(B.glow, [vi[0] * k, h + 0.003, vi[1] * k], [vj[0] * k, h + 0.003, vj[1] * k], [vj[0] * ki, h + 0.003, vj[1] * ki], [vi[0] * ki, h + 0.003, vi[1] * ki], shade(col(PAL.rim[g]), 0.55), [0, 1, 0]);
  }
  for (const cn of [tile.conn, tile.conn2]) if (cn) {
    const lay = connectorLayout(cn), t = cn.type, base = col(t === 'sewage' ? PAL.concrete : t === 'rail' ? PAL.ballast : PAL.asphalt);
    const paths = lay.kind === 'fork' ? lay.exits.map((e) => radial(e, 1, 0.3)) : lay.polys;
    if (lay.kind !== 'line') B.extrude(B.lit, ngon(0, 0, lay.kind === 'end' ? 0.34 : 0.4, 10), h, 0.0015, base);
    for (const path of paths) {
      if (t === 'sewage') { B.ribbon(B.lit, path, 0.34, h + 0.002, base); B.ribbon(B.glow, path, 0.2, h + 0.006, col('#1fb08a')); }
      else if (t === 'rail') { B.ribbon(B.lit, path, 0.3, h + 0.002, base); for (const s of [1, -1]) B.ribbon(B.lit, offsetLine(path, s * 0.065), 0.024, h + 0.006, col(PAL.railSteel)); }
      else { B.ribbon(B.lit, path, 0.34, h + 0.002, base); B.ribbon(B.glow, path, 0.02, h + 0.006, col(PAL.dash)); }
    }
    if (lay.kind === 'end') B.annulus(B.glow, 0, h + 0.007, 0, 0.16, 0.2, 10, col(t === 'sewage' ? '#1fb08a' : t === 'rail' ? '#ff3b5c' : PAL.dash));
    else if (lay.kind === 'fork') B.annulus(B.glow, 0, h + 0.007, 0, 0.07, 0.1, 10, col(t === 'sewage' ? '#1fb08a' : t === 'rail' ? PAL.catenary : '#22f3ff'));
  }
  if (tile.quest) B.sphere(B.glow, 0, h + 0.03, 0, 0.05, col(tile.quest.color), 8, 4);
  return B.build();
}

// ---------- FAUNA ----------
// Bichos lowpoly, todos virados para +x e apoiados em y = 0 (main.js posiciona em TILE_H).
// Cada um sai em duas malhas, como os veículos: `lit` (iluminada) e `glow` (o ponto de neon
// que amarra o bicho ao mundo do jogo — lampião, olho, marca de gelo).
//
// Como são desenhados: o corpo é um TUBO ao longo da espinha, com o raio variando ponto a
// ponto, e não uma pilha de esferas. É isso que dá o volume contínuo (garupa → lombo → peito)
// em vez de bolhas encostadas. Membros são tubos de 3 pontos, com o vinco do joelho/jarrete no
// meio — a dobra é o que lê como pata viva e não como perna de mesa. Extremidades (focinho,
// mão, pé) fecham com esfera achatada.

// Membro com uma dobra: A (encaixe no corpo) → B (joelho/cotovelo) → C (pé/mão).
function limb(B, A, M, C, r, color, opts = {}) {
  B.tube(B.lit, [A, M, C], [r, r * (opts.mid ?? 0.78), r * (opts.tip ?? 0.62)], opts.segs || 6, color, { under: 0.5 }); // segs par: a faixa alternada do tubo precisa fechar o anel
  const pr = r * (opts.paw ?? 1.05);
  B.sphere(B.lit, C[0], C[1], C[2], pr, shade(color, opts.pawShade ?? 0.92), 6, 3, { sy: opts.pawFlat ?? 0.5, under: 0.6 });
}
// Corpo: tubo pela espinha + esferas fechando as duas pontas.
function torso(B, spine, radii, color, segs = 8) {
  B.tube(B.lit, spine, radii, segs, color, { under: 0.75 });
  const a = spine[0], b = spine[spine.length - 1];
  B.sphere(B.lit, a[0], a[1], a[2], radii[0] * 0.98, shade(color, 0.95), segs, 4, { under: 0.75 });
  B.sphere(B.lit, b[0], b[1], b[2], radii[radii.length - 1] * 0.98, shade(color, 1.04), segs, 4, { under: 0.75 });
}

export function buildCamelGeometry(v = 0) {
  const B = new Builder();
  const hide = col(PAL.camelHide[v % PAL.camelHide.length]), rug = col(PAL.camelRug[v % PAL.camelRug.length]);
  const dark = shade(col(PAL.camelDark), 1.22), tail = col(PAL.camelDark); // perna clara: escura demais ela descola do corpo
  // Pernas longas e finas com o vinco do joelho: é a proporção perna/corpo que lê "camelo".
  for (const sd of [1, -1]) {
    const z = sd * 0.026;
    limb(B, [0.042, 0.108, z], [0.048, 0.058, z * 1.04], [0.038, 0.013, z], 0.013, dark, { tip: 0.58, paw: 1.0, pawFlat: 0.45 });   // dianteira: joelho à frente
    limb(B, [-0.05, 0.112, z], [-0.064, 0.06, z * 1.04], [-0.046, 0.013, z], 0.015, dark, { tip: 0.5, paw: 0.95, pawFlat: 0.45 }); // traseira: jarrete atrás
  }
  // Tronco: garupa alta caindo para o peito, peito mais estreito que o lombo.
  torso(B, [[-0.074, 0.114, 0], [-0.05, 0.124, 0], [-0.012, 0.126, 0], [0.028, 0.121, 0], [0.056, 0.113, 0]],
    [0.026, 0.042, 0.046, 0.043, 0.032], hide, 8);
  B.sphere(B.lit, -0.022, 0.149, 0, 0.042, shade(hide, 1.08), 8, 5, { sy: 0.92, under: 0.4 }); // corcova, meia enterrada no lombo
  // Pescoço em S: sobe do peito, recua e joga a cabeça à frente.
  B.tube(B.lit, [[0.05, 0.124, 0], [0.076, 0.159, 0], [0.099, 0.189, 0], [0.116, 0.207, 0]], [0.027, 0.02, 0.015, 0.012], 8, shade(hide, 1.02));
  B.sphere(B.lit, 0.121, 0.21, 0, 0.016, shade(hide, 1.1), 7, 4, { sy: 0.95 });     // crânio
  B.tube(B.lit, [[0.127, 0.207, 0], [0.15, 0.197, 0]], [0.013, 0.0095], 6, shade(hide, 0.95), { capEnd: true }); // focinho
  B.sphere(B.lit, 0.151, 0.195, 0, 0.0085, shade(hide, 0.88), 5, 3, { sy: 0.8 });   // beiço
  for (const sd of [1, -1]) B.cone(B.lit, 0.114, 0.221, sd * 0.011, 0.005, 0.011, shade(hide, 0.9), 4);   // orelhas curtas
  for (const sd of [1, -1]) B.sphere(B.glow, 0.13, 0.215, sd * 0.0105, 0.0032, col(PAL.glyph), 4, 2);     // olhos
  B.tube(B.lit, [[-0.076, 0.12, 0], [-0.089, 0.094, 0], [-0.091, 0.07, 0]], [0.006, 0.0045, 0.0035], 4, tail); // rabo
  B.sphere(B.lit, -0.091, 0.066, 0, 0.008, shade(tail, 0.85), 5, 3, { sy: 0.9 });
  // Carga de caravana: manta sobre o lombo e dois alforjes nos flancos (é o que conta a história).
  B.extrude(B.lit, chamfer(0.014, 0, 0.038, 0.086, 0, 0.01), 0.157, 0.006, rug, { topCol: shade(rug, 1.18), sideShade: true });
  for (const sd of [1, -1]) B.extrude(B.glow, rect(0.014, sd * 0.04, 0.04, 0.005, 0), 0.1625, 0.002, shade(col(PAL.goldGlow), 0.7)); // debrum, não uma chapa inteira
  for (const sd of [1, -1]) B.extrude(B.lit, chamfer(0.006, sd * 0.042, 0.034, 0.022, 0, 0.006), 0.116, 0.038, shade(rug, 0.78), { topCol: shade(rug, 0.92), sideShade: true }); // alforjes
  B.sphere(B.glow, -0.002, 0.128, 0.05, 0.008, col(PAL.lantern), 6, 3); // lampião pendurado no alforje
  return B.build();
}

export function buildBearGeometry() {
  // Comprido, baixo e com a cabeça ABAIXO da linha do lombo: é esse perfil que diferencia urso
  // de bicho de pelúcia. Patas grossas e curtas, garupa um pouco mais alta que o ombro.
  const B = new Builder(), fur = col(PAL.bearFur), sh = shade(col(PAL.bearShade), 1.06);
  for (const sd of [1, -1]) {
    const z = sd * 0.032;
    limb(B, [0.05, 0.078, z], [0.053, 0.042, z], [0.048, 0.016, z], 0.021, sh, { mid: 0.9, tip: 0.86, paw: 1.06, pawFlat: 0.44, pawShade: 0.86 });
    limb(B, [-0.058, 0.082, z], [-0.066, 0.044, z], [-0.052, 0.016, z], 0.023, sh, { mid: 0.87, tip: 0.82, paw: 1.04, pawFlat: 0.44, pawShade: 0.86 });
  }
  torso(B, [[-0.088, 0.088, 0], [-0.05, 0.098, 0], [-0.005, 0.096, 0], [0.042, 0.09, 0], [0.07, 0.082, 0]],
    [0.026, 0.05, 0.052, 0.046, 0.033], fur, 8);
  B.tube(B.lit, [[0.066, 0.084, 0], [0.092, 0.072, 0], [0.108, 0.063, 0]], [0.031, 0.026, 0.022], 7, shade(fur, 0.99)); // pescoço baixo
  B.sphere(B.lit, 0.113, 0.06, 0, 0.022, fur, 7, 4, { sy: 0.94 });
  B.tube(B.lit, [[0.121, 0.057, 0], [0.143, 0.05, 0]], [0.015, 0.011], 6, shade(fur, 0.93), { capEnd: true }); // focinho comprido
  B.sphere(B.lit, 0.145, 0.049, 0, 0.0065, col(PAL.bearNose), 5, 3);
  for (const sd of [1, -1]) B.sphere(B.lit, 0.105, 0.077, sd * 0.016, 0.0095, shade(fur, 0.94), 5, 3); // orelhas redondas e pequenas
  for (const sd of [1, -1]) B.sphere(B.glow, 0.123, 0.066, sd * 0.011, 0.0032, col('#9ff5ff'), 4, 2);
  B.sphere(B.lit, -0.094, 0.092, 0, 0.012, shade(fur, 0.96), 5, 3, { sy: 0.85 }); // rabo curto
  // O ponto de neon: plaquinha na garganta e um friso gelado ao longo da espinha (a câmera é de cima).
  B.sphere(B.glow, 0.112, 0.041, 0, 0.007, shade(col(PAL.crystalGlow), 0.95), 5, 3);
  B.tube(B.glow, [[-0.045, 0.1455, 0], [0, 0.1465, 0], [0.045, 0.1345, 0]], [0.0028, 0.0034, 0.0026], 4, shade(col(PAL.crystalGlow), 0.7)); // friso acompanhando a curva do lombo
  return B.build();
}

// Abominável homem das neves: bípede, cabeça afundada entre os ombros, braços longos e
// franjas de pelo quebrando a silhueta. Alto o bastante para se destacar do urso de longe.
export function buildYetiGeometry() {
  const B = new Builder(), fur = col(PAL.yetiFur), sh = col(PAL.yetiShade), skin = col(PAL.yetiSkin);
  for (const sd of [1, -1]) { // pernas curtas e grossas, quase escondidas sob o pelo
    const z = sd * 0.036;
    limb(B, [0, 0.12, z], [0.008, 0.072, z], [0.005, 0.022, z], 0.031, sh, { mid: 0.92, tip: 0.86, paw: 1.14, pawFlat: 0.46, pawShade: 0.92 });
  }
  for (const sd of [1, -1]) // braços longos, bem fora da linha das pernas, mãos na altura do tornozelo
    limb(B, [0.008, 0.188, sd * 0.062], [0.036, 0.122, sd * 0.078], [0.04, 0.048, sd * 0.072], 0.026, sh, { mid: 0.85, tip: 0.78, paw: 1.2, pawFlat: 0.8, pawShade: 1.03 });
  torso(B, [[-0.014, 0.112, 0], [-0.008, 0.152, 0], [0.008, 0.186, 0]], [0.048, 0.056, 0.05], fur, 9);
  // A pelagem é o próprio volume: massas assimétricas grudadas no tronco, do tamanho de ombro,
  // não farpas. O contorno quebrado é o que lê como "peludo" de longe.
  for (const [x, y, z, r, f] of [
    [0.004, 0.19, 0.058, 0.036, 1.06], [0.004, 0.19, -0.058, 0.036, 1.0],   // ombros
    [-0.03, 0.178, 0.026, 0.032, 0.94], [-0.028, 0.166, -0.032, 0.03, 1.02], // cupim das costas
    [0.026, 0.158, 0.042, 0.028, 1.04], [0.03, 0.15, -0.038, 0.026, 0.96],   // peitoral
    [-0.024, 0.126, 0.038, 0.029, 0.92], [-0.02, 0.118, -0.042, 0.027, 1.0], // saia de pelo
    [0.03, 0.118, 0.008, 0.026, 0.98],
  ]) B.sphere(B.lit, x, y, z, r, shade(fur, f), 7, 4, { sy: 0.94, under: 0.7 });
  B.sphere(B.lit, 0.018, 0.216, 0, 0.031, shade(fur, 1.02), 8, 5, { sy: 0.96, under: 0.5 }); // cabeça enfiada entre os ombros
  B.sphere(B.lit, 0.041, 0.211, 0, 0.022, skin, 7, 4, { sy: 0.92 });                         // cara escura
  B.extrude(B.lit, rect(0.039, 0, 0.013, 0.05, 0), 0.222, 0.009, shade(fur, 1.1));           // sobrancelha de pelo
  for (const sd of [1, -1]) B.sphere(B.glow, 0.053, 0.215, sd * 0.01, 0.0042, col('#9ff5ff'), 5, 3);
  for (const sd of [1, -1]) B.cone(B.lit, 0.054, 0.202, sd * 0.0065, 0.0033, -0.008, col('#f4fbff'), 4); // presas
  B.sphere(B.lit, -0.018, 0.206, 0.036, 0.018, col(PAL.snow), 6, 3, { dome: true, sy: 0.6 });            // neve acumulada
  B.sphere(B.lit, -0.02, 0.2, -0.032, 0.014, col(PAL.snow), 6, 3, { dome: true, sy: 0.6 });
  return B.build();
}

export function buildBirdGeometry() {
  const B = new Builder(), body = col(PAL.birdBody);
  B.sphere(B.lit, 0, 0, 0, 0.024, body, 7, 4, { sy: 0.78 });
  B.tube(B.lit, [[-0.018, 0.002, 0], [-0.058, 0.01, 0]], [0.016, 0.004], 5, shade(body, 0.9), { capEnd: true }); // cauda
  B.sphere(B.lit, 0.027, 0.012, 0, 0.014, shade(body, 1.04), 6, 3);
  B.tube(B.lit, [[0.036, 0.011, 0], [0.064, 0.007, 0]], [0.0065, 0.0012], 4, col(PAL.birdBeak), { capEnd: true }); // bico
  for (const sd of [1, -1]) B.sphere(B.glow, 0.031, 0.017, sd * 0.0075, 0.003, col('#22f3ff'), 4, 2);
  B.sphere(B.glow, -0.054, 0.01, 0, 0.0055, col('#38ff9b'), 5, 3); // anilha de neon
  return B.build();
}
// Uma asa só, com o eixo no ombro: main.js instancia duas e espelha a segunda em z.
export function buildBirdWingGeometry() {
  const B = new Builder();
  B.leaf(B.lit, [0, 0, 0.008], Math.PI / 2, 0.092, 0.044, col(PAL.birdWing), { lift: 0.014, droop: 0.018, segs: 4 });
  B.leaf(B.lit, [0.002, 0.004, 0.062], Math.PI / 2, 0.04, 0.03, col(PAL.birdTip), { lift: 0.002, droop: 0.014, segs: 2 });
  return B.build().lit;
}
// Tabuleta de cuneiforme que orbita o zigurate.
export function buildGlyphGeometry(color) {
  const B = new Builder(), c = col(color);
  B.extrude(B.lit, rect(0, 0, 0.012, 0.03, 0), -0.022, 0.044, col(PAL.brickDark), { topCol: col(PAL.brick[0]), sideShade: true });
  for (const sd of [1, -1]) B.panel(B.glow, sd * 0.008, -0.014, 0, 0.02, 0.03, 0, c, 0.004);
  return B.build();
}

// ---------- EMBARCAÇÕES DO ESGOTO ----------
// Viradas para +x, linha d'água em y = 0. O patinho é de borracha de verdade: amarelo chapado,
// sem neon (é o único objeto "inocente" do canal, e é isso que tem graça). O rebocador traz o neon.
export function buildBoatGeometry(kind) {
  const B = new Builder();
  if (kind === 'duck') {
    const y = col(PAL.duck), ys = col(PAL.duckShade);
    B.sphere(B.lit, 0, 0.012, 0, 0.042, y, 10, 5, { sy: 0.62, under: 0.4 });                     // corpo
    B.tube(B.lit, [[-0.03, 0.02, 0], [-0.05, 0.034, 0]], [0.022, 0.006], 6, ys, { capEnd: true }); // rabinho arrebitado
    B.sphere(B.lit, 0.026, 0.056, 0, 0.024, y, 9, 5);                                             // cabeça
    B.sphere(B.lit, 0.046, 0.05, 0, 0.012, col(PAL.duckBeak), 6, 3, { sy: 0.45 });               // bico
    for (const sd of [1, -1]) {
      B.sphere(B.lit, 0.04, 0.064, sd * 0.013, 0.0045, col('#15161c'), 5, 2);                      // olhos
      B.leaf(B.lit, [-0.004, 0.026, sd * 0.03], sd > 0 ? Math.PI * 0.95 : -Math.PI * 0.95, 0.032, 0.02, ys, { lift: 0.008, droop: 0.004, segs: 2 }); // asinhas
    }
    return B.build();
  }
  // rebocador: casco que afina na proa, cabine, chaminé com anel neon e lanterna
  const hullC = col(kind.color || PAL.tugHull[0]), dark = col('#1d2030');
  B.extrude(B.lit, [[-0.05, -0.026], [0.03, -0.026], [0.06, 0], [0.03, 0.026], [-0.05, 0.026]], -0.006, 0.026, hullC, { topCol: col('#3a3e4e'), sideShade: true });
  B.extrude(B.glow, [[-0.05, -0.027], [0.03, -0.027], [0.061, 0], [0.03, 0.027], [-0.05, 0.027]], 0.006, 0.004, shade(hullC, 1.1));
  B.extrude(B.lit, chamfer(-0.012, 0, 0.04, 0.034, 0, 0.006), 0.02, 0.03, col(PAL.tugCabin), { topCol: shade(col(PAL.tugCabin), 0.9) });
  B.extrude(B.glow, rect(-0.012, 0, 0.042, 0.036, 0), 0.034, 0.008, col(PAL.trainWin));
  B.frustum(B.lit, -0.036, 0.02, 0, 0.009, 0.008, 0.045, 7, dark);
  B.annulus(B.glow, -0.036, 0.058, 0, 0.008, 0.011, 8, col(PAL.algae));
  B.sphere(B.glow, 0.05, 0.026, 0, 0.005, col(PAL.headlight), 5, 2);
  for (const sd of [1, -1]) B.sphere(B.lit, 0.0, 0.012, sd * 0.03, 0.007, col('#ffe02a'), 6, 3); // boias
  return B.build();
}
