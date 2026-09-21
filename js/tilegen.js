import { RNG } from './rng.js';

// Terrenos. Regiões preenchem setores; conectores atravessam a peça de uma
// aresta a outra e SÃO obrigados a casar (como rios/trilhos no Dorfromantik).
export const TERRAIN = {
  plain:  { id: 'plain',  name: 'Gelo (terreno livre)', color: '#bfe9ff', group: 'plain' },
  cyber:  { id: 'cyber',  name: 'Cidade Neon',        color: '#ff2bd6', group: 'cyber' },
  solar:  { id: 'solar',  name: 'Selva Solarpunk',    color: '#5cc46f', group: 'solar' },
  rock:   { id: 'rock',   name: 'Montanha',           color: '#ff9a3c', group: 'rock' },
  pool:   { id: 'pool',   name: 'Lagoa Tóxica',       color: '#2dffb8', group: 'toxic' },
  sewage: { id: 'sewage', name: 'Esgoto Radioativo',  color: '#2dffb8', group: 'toxic', connector: true },
  rail:   { id: 'rail',   name: 'Trem-bala',          color: '#dfe3ee', group: 'rail',  connector: true },
  road:   { id: 'road',   name: 'Rodovia',            color: '#ffe36a', group: 'road',  connector: true },
};

export const GROUP_INFO = {
  plain: { name: 'Gelo',            color: '#bfe9ff' },
  cyber: { name: 'Cidade Neon',     color: '#ff2bd6' },
  solar: { name: 'Selva Solarpunk', color: '#58d68d' },
  rock:  { name: 'Montanha',        color: '#ff9a3c' },
  toxic: { name: 'Rede de Esgoto',  color: '#2dffb8' },
  rail:  { name: 'Linha de Trem',   color: '#7fd3ff' },
  road:  { name: 'Rodovia',         color: '#ffe36a' },
};

export const isConnector = (t) => !!TERRAIN[t].connector;
export const groupOf = (t) => TERRAIN[t].group;

// Arestas compatíveis: iguais, ou esgoto desaguando numa lagoa.
export function compatible(a, b) {
  return a === b || groupOf(a) === groupOf(b);
}

const REGION_WEIGHTS = [['plain', 0.19], ['cyber', 0.27], ['solar', 0.27], ['rock', 0.19], ['pool', 0.08]];
// Bioma único das peças com conector (nunca lagoa: o conector já ocupa o centro)
const CONN_GROUND_WEIGHTS = [['plain', 0.22], ['cyber', 0.28], ['solar', 0.28], ['rock', 0.22]];
const CONN_WEIGHTS = [['sewage', 0.38], ['rail', 0.34], ['road', 0.28]];

function splitSix(rng, n) {
  if (n === 1) return [6];
  if (n === 2) return rng.pick([[3, 3], [3, 3], [2, 4], [4, 2], [1, 5], [5, 1]]);
  return rng.pick([[2, 2, 2], [2, 2, 2], [1, 2, 3], [3, 2, 1], [1, 3, 2], [2, 3, 1], [1, 1, 4], [4, 1, 1]]);
}

let tileCounter = 0;

// Saídas do conector: 2 (reta/curva), 3 (bifurcação) ou 1 (ponto final)
function connectorExits(rng, opts) {
  const a = rng.int(6);
  const kind = rng.weighted([['line', opts.forkChance != null ? 1 - opts.forkChance - (opts.endChance || 0) : 0.72], ['fork', opts.forkChance ?? 0.17], ['end', opts.endChance ?? 0.11]]);
  if (kind === 'end') return [a];
  if (kind === 'fork') {
    const shape = rng.weighted([['Y', 0.5], ['T1', 0.25], ['T2', 0.25]]);
    return shape === 'Y' ? [a, (a + 2) % 6, (a + 4) % 6] : shape === 'T1' ? [a, (a + 3) % 6, (a + 1) % 6] : [a, (a + 3) % 6, (a + 5) % 6];
  }
  const shape = rng.weighted([['straight', 0.46], ['left', 0.27], ['right', 0.27]]);
  return [a, shape === 'straight' ? (a + 3) % 6 : shape === 'left' ? (a + 2) % 6 : (a + 4) % 6];
}

export function genTile(rng, opts = {}) {
  const connChance = opts.simple ? 0 : (opts.connChance ?? 0.4);
  const hasConn = rng.chance(connChance);
  const ground = new Array(6);
  if (hasConn) { // peças com estrada/trilho/esgoto têm sempre um único bioma
    const t = rng.weighted(CONN_GROUND_WEIGHTS);
    ground.fill(t);
  } else {
    const nRegions = opts.simple ? rng.weighted([[1, 0.4], [2, 0.6]]) : rng.weighted([[1, 0.3], [2, 0.48], [3, 0.22]]);
    const sizes = splitSix(rng, nRegions), types = [];
    let idx = rng.int(6);
    for (const s of sizes) {
      let t, guard = 0;
      do { t = rng.weighted(REGION_WEIGHTS); guard++; } while ((types.includes(t) || (opts.simple && t === 'pool') || (s >= 4 && t === 'pool')) && guard < 20);
      types.push(t);
      for (let k = 0; k < s; k++) ground[(idx + k) % 6] = t;
      idx += s;
    }
  }
  const edges = ground.slice();
  let conn = null;
  if (hasConn) {
    const type = rng.weighted(CONN_WEIGHTS);
    const exits = connectorExits(rng, { forkChance: opts.forkChance, endChance: opts.endChance });
    for (const e of exits) edges[e] = type;
    conn = { type, exits };
  }
  return { id: ++tileCounter, ground, edges, conn, quest: null, seed: rng.int(2 ** 31) };
}

export function starterTile(rng) {
  return {
    id: ++tileCounter,
    ground: ['solar', 'solar', 'plain', 'plain', 'cyber', 'cyber'],
    edges:  ['solar', 'solar', 'plain', 'plain', 'cyber', 'cyber'],
    conn: null, quest: null, seed: rng.int(2 ** 31),
  };
}

export function makeStack(rng, n) {
  const out = [];
  // primeiras peças simples; bifurcações e pontos finais só depois que o jogador já viu conectores comuns
  for (let i = 0; i < n; i++) out.push(genTile(rng, { simple: i < 4, connChance: i < 8 ? 0.25 : 0.4, forkChance: i < 10 ? 0 : 0.17, endChance: i < 12 ? 0 : 0.11 }));
  return out;
}

export const isTerminal = (tile) => !!(tile.conn && tile.conn.exits.length === 1);
export const isFork = (tile) => !!(tile.conn && tile.conn.exits.length === 3);

// Grupos que uma peça pode "puxar" numa missão (nunca baldio)
export function questCandidates(tile) {
  const set = new Set();
  for (const t of tile.edges) { const g = groupOf(t); if (g !== 'plain') set.add(g); }
  return [...set];
}

const QUEST_BASE = { cyber: 6, solar: 6, rock: 5, toxic: 5, rail: 5, road: 5 };

export function makeQuest(rng, tile) {
  const cands = questCandidates(tile);
  if (!cands.length) return null;
  const group = rng.pick(cands);
  const target = QUEST_BASE[group] + rng.int(3) - 1;
  return { group, target, progress: 1, reward: { tiles: 2 + Math.floor(target / 3), points: target * 15 } };
}
