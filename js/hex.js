// Hexágonos "flat-top" em coordenadas axiais (q, r).
// Vértice i fica no ângulo i*60°; aresta i liga os vértices i e i+1,
// com ponto médio no ângulo 30° + i*60° (medido de +x para +z).
export const SQ3 = Math.sqrt(3);
export const APO = SQ3 / 2; // apótema para circunraio 1

// Direção do vizinho através da aresta i
export const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];

export const key = (q, r) => `${q},${r}`;
export const opp = (i) => (i + 3) % 6;
export const edgeAngle = (i) => Math.PI / 6 + (i * Math.PI) / 3;
export const vertexAngle = (i) => (i * Math.PI) / 3;

export function toWorld(q, r) {
  return { x: 1.5 * q, z: SQ3 * (r + q / 2) };
}

export function fromWorld(x, z) {
  const q = x / 1.5;
  const r = z / SQ3 - q / 2;
  return roundAxial(q, r);
}

export function roundAxial(q, r) {
  const x = q, z = r, y = -x - z;
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

export function neighbor(q, r, i) {
  return { q: q + DIRS[i][0], r: r + DIRS[i][1] };
}

// Terreno da aresta "mundial" i de uma peça girada `rot` passos (60° cada)
export function edgeAt(tile, rot, i) {
  return tile.edges[(((i - rot) % 6) + 6) % 6];
}
export function groundAt(tile, rot, i) {
  return tile.ground[(((i - rot) % 6) + 6) % 6];
}
