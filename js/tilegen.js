import { RNG } from './rng.js';

// Terrenos. Cada bioma é uma vertente -punk da mesma proposta estética (é daí que vem o nome
// do jogo): Cyberpunk, Solarpunk, Sandpunk e Snowpunk. Regiões preenchem setores; conectores atravessam a peça de uma
// aresta a outra e SÃO obrigados a casar (como rios/trilhos no Dorfromantik).
export const TERRAIN = {
  plain:  { id: 'plain',  name: 'Snowpunk',           color: '#bfe9ff', group: 'plain' },
  grass:  { id: 'grass',  name: 'Baldio',             color: '#ffd98a', group: 'grass' },
  cyber:  { id: 'cyber',  name: 'Cyberpunk',          color: '#ff2bd6', group: 'cyber' },
  solar:  { id: 'solar',  name: 'Solarpunk',          color: '#7dff4a', group: 'solar' },
  rock:   { id: 'rock',   name: 'Sandpunk',           color: '#ff9a3c', group: 'rock' },
  pool:   { id: 'pool',   name: 'Lagoa Tóxica',       color: '#2dffb8', group: 'toxic' },
  sewage: { id: 'sewage', name: 'Esgoto Radioativo',  color: '#2dffb8', group: 'toxic', connector: true },
  rail:   { id: 'rail',   name: 'Trem-bala',          color: '#dfe3ee', group: 'rail',  connector: true },
  road:   { id: 'road',   name: 'Rodovia',            color: '#ffe36a', group: 'road',  connector: true },
};

export const GROUP_INFO = {
  plain: { name: 'Snowpunk',        color: '#bfe9ff' },
  grass: { name: 'Baldio',          color: '#ffd98a' },
  cyber: { name: 'Cyberpunk',       color: '#ff2bd6' },
  solar: { name: 'Solarpunk',       color: '#7dff4a' },
  rock:  { name: 'Sandpunk',        color: '#ff9a3c' },
  toxic: { name: 'Rede de Esgoto',  color: '#2dffb8' },
  rail:  { name: 'Linha de Trem',   color: '#7fd3ff' },
  road:  { name: 'Rodovia',         color: '#ffe36a' },
};

export const isConnector = (t) => !!TERRAIN[t].connector;
export const groupOf = (t) => TERRAIN[t].group;
// Peça com conector tem DUAS qualidades em cada lado de saída: o conector e o bioma do chão.
// A rodovia que atravessa a cidade é rodovia E cidade — conta para a rede e para a região.
export function sideGroups(tile, i) {
  const a = groupOf(tile.edges[i]), b = groupOf(tile.ground[i]);
  return a === b ? [a] : [a, b];
}

// Arestas compatíveis: iguais, ou esgoto desaguando numa lagoa.
export function compatible(a, b) {
  return a === b || groupOf(a) === groupOf(b);
}

const REGION_WEIGHTS = [['plain', 0.15], ['grass', 0.12], ['cyber', 0.25], ['solar', 0.25], ['rock', 0.16], ['pool', 0.07]];
// Bioma único das peças com conector (nunca lagoa: o conector já ocupa o centro)
const CONN_GROUND_WEIGHTS = [['plain', 0.18], ['grass', 0.2], ['cyber', 0.24], ['solar', 0.22], ['rock', 0.16]];
const EMPTY_LOT_CHANCE = 0.09; // peça inteira de baldio: respiro para o tabuleiro e para o jogador
const CONN_WEIGHTS = [['sewage', 0.38], ['rail', 0.34], ['road', 0.28]];
// Cruzamento de dois meios (nunca os três): o de cima passa num viaduto. Ordem de baixo para
// cima: esgoto, trilho, rodovia — então a rodovia é sempre o viaduto quando aparece.
const DUAL_PAIRS = [['sewage', 'rail'], ['sewage', 'road'], ['rail', 'road']];

function splitSix(rng, n) {
  if (n === 1) return [6];
  if (n === 2) return rng.pick([[3, 3], [3, 3], [2, 4], [4, 2], [1, 5], [5, 1]]);
  return rng.pick([[2, 2, 2], [2, 2, 2], [1, 2, 3], [3, 2, 1], [1, 3, 2], [2, 3, 1], [1, 1, 4], [4, 1, 1]]);
}

let tileCounter = 0;

// Saídas do conector: 2 (reta/curva), 3 (bifurcação), 4 (cruzamento) ou 1 (ponto final)
function connectorExits(rng, opts) {
  const a = rng.int(6);
  const kind = rng.weighted([['line', opts.forkChance != null ? 1 - opts.forkChance - (opts.endChance || 0) : 0.72], ['fork', opts.forkChance ?? 0.17], ['end', opts.endChance ?? 0.11]]);
  if (kind === 'end') return [a];
  if (kind === 'fork') {
    if (rng.chance(opts.crossChance ?? 0)) { // cruzamento: uma via se abre em três (4 saídas)
      const shape = rng.weighted([['X1', 0.4], ['X2', 0.4], ['fan', 0.2]]);
      return shape === 'X1' ? [a, (a + 1) % 6, (a + 3) % 6, (a + 4) % 6] : shape === 'X2' ? [a, (a + 2) % 6, (a + 3) % 6, (a + 5) % 6] : [a, (a + 1) % 6, (a + 2) % 6, (a + 4) % 6];
    }
    const shape = rng.weighted([['Y', 0.5], ['T1', 0.25], ['T2', 0.25]]); // bifurcação: uma via se abre em duas (3 saídas)
    return shape === 'Y' ? [a, (a + 2) % 6, (a + 4) % 6] : shape === 'T1' ? [a, (a + 3) % 6, (a + 1) % 6] : [a, (a + 3) % 6, (a + 5) % 6];
  }
  const shape = rng.weighted([['straight', 0.46], ['left', 0.27], ['right', 0.27]]);
  return [a, shape === 'straight' ? (a + 3) % 6 : shape === 'left' ? (a + 2) % 6 : (a + 4) % 6];
}

export function genTile(rng, opts = {}) {
  const connChance = opts.simple ? 0 : (opts.connChance ?? 0.4);
  const hasConn = !!opts.forceConn || rng.chance(connChance);
  const ground = new Array(6);
  if (hasConn) { // peças com estrada/trilho/esgoto têm sempre um único bioma
    const t = opts.ground || rng.weighted(CONN_GROUND_WEIGHTS);
    ground.fill(t);
  } else if (!opts.simple && rng.chance(EMPTY_LOT_CHANCE)) {
    ground.fill('grass');
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
  // Peça rara de cruzamento: duas retas de meios diferentes que se cruzam no centro. Salva jogadas
  // em que duas redes diferentes se encontram na mesma casa vazia.
  const dualChance = opts.dualChance ?? DUAL_CHANCE; // peças de recompensa também podem vir em cruzamento
  if (hasConn && !opts.forceConn && dualChance && rng.chance(dualChance)) {
    const [lo, hi] = rng.pick(DUAL_PAIRS), a = rng.int(6), b = (a + (rng.chance(0.5) ? 1 : 2)) % 6;
    conn = { type: lo, exits: [a, (a + 3) % 6] };
    const conn2 = { type: hi, exits: [b, (b + 3) % 6] };
    for (const e of conn.exits) edges[e] = lo;
    for (const e of conn2.exits) edges[e] = hi;
    return { id: ++tileCounter, ground, edges, conn, conn2, quest: null, seed: rng.int(2 ** 31) };
  }
  if (hasConn) {
    const type = opts.forceConn || rng.weighted(CONN_WEIGHTS);
    // Esgoto bifurca bem menos e nunca vira cruzamento de 4 saídas: canal que se abre em tudo
    // quanto é lado enchia o tabuleiro de pontas de esgoto impossíveis de fechar.
    const sew = type === 'sewage';
    const exits = connectorExits(rng, { forkChance: sew ? (opts.forkChance ?? 0.17) * 0.45 : opts.forkChance, endChance: opts.endChance, crossChance: sew ? 0 : opts.crossChance });
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

export const DUAL_CHANCE = 0.07; // das peças com conector: ~1 cruzamento a cada 35 peças
export function makeStack(rng, n) {
  const out = [];
  // primeiras peças simples; bifurcações e pontos finais só depois que o jogador já viu conectores comuns
  for (let i = 0; i < n; i++) out.push(genTile(rng, { simple: i < 4, connChance: i < 8 ? 0.25 : 0.4, forkChance: i < 10 ? 0 : 0.2, endChance: i < 12 ? 0 : 0.14, crossChance: i < 14 ? 0 : 0.35, dualChance: i < 16 ? 0 : DUAL_CHANCE }));
  return out;
}

// Peça que CONTINUA uma ponta aberta do tabuleiro: mesmo conector, quase sempre reta/curva
// (às vezes bifurca), nunca ponto final — sem isso as redes de trilho/rodovia ficavam em
// pedaços de uma peça só e o trem nem tinha por onde andar. `ground` é o bioma ao redor da ponta.
export function continuationTile(rng, type, ground) {
  const fork = type === 'sewage' ? 0.06 : 0.16;
  return genTile(rng, { forceConn: type, ground: ground && ground !== 'pool' ? ground : undefined, forkChance: fork, endChance: 0, crossChance: 0 });
}

export const isTerminal = (tile) => !!(tile.conn && tile.conn.exits.length === 1);
export const isFork = (tile) => !!(tile.conn && tile.conn.exits.length >= 3);

// Grupos que uma peça pode "puxar" numa missão (nunca gelo nem baldio)
export function questCandidates(tile) {
  const set = new Set();
  for (const t of [...tile.edges, ...tile.ground]) { const g = groupOf(t); if (g !== 'plain' && g !== 'grass') set.add(g); }
  return [...set];
}

// conectores dependem de peças certas aparecerem: alvo menor que o das regiões
const QUEST_BASE = { cyber: 6, solar: 6, rock: 5, toxic: 4, rail: 3, road: 3 };

// Dois tipos de missão:
//  - 'region': conecte `target` peças do grupo a partir da bandeira (progress = peças ligadas).
//    Sempre "N+": ligar a formação a uma rede que já passou do número CUMPRE a missão — o jogador
//    fez a malha se conectar, e isso precisa ser recompensado, não punido.
//  - 'city':   a cidade ligada à bandeira deve somar `target` prédios (progress = prédios somados).
//    Também é sempre "N+": cidade não tem teto de prédios. Passar de 22 para 25 CUMPRE a missão;
//    ela só se perde quando a formação fica cercada e não tem mais como crescer.
//    `buildings` é quantos prédios a própria peça da bandeira tem (vem da geometria).
// `weights` (opcional): quanto cada grupo está "vivo" na borda do tabuleiro — a missão puxa
// o grupo que o jogador tem como crescer, em vez de um que vai empacar com progresso 1.
export function makeQuest(rng, tile, buildings = 0, weights = null) {
  const cands = questCandidates(tile);
  if (!cands.length) return null;
  const group = weights ? rng.weighted(cands.map((g) => [g, 1 + (weights[g] || 0)])) : rng.pick(cands);
  const q = makeQuestFor(rng, group, buildings);
  if (rng.chance(0.3)) q.reward.hints = 1; // às vezes a missão também devolve uma dica
  return q;
}
function makeQuestFor(rng, group, buildings) {
  if (group === 'cyber' && buildings > 0 && rng.chance(0.55)) {
    const target = buildings + 9 + rng.int(13); // 9..21 prédios além dos que a peça já traz (uma peça cheia de cidade tem ~8-11)
    return { kind: 'city', exact: false, group, target, progress: buildings, reward: { tiles: 2 + Math.floor(target / 8), points: target * 8 } };
  }
  const target = QUEST_BASE[group] + rng.int(3) - 1;
  return { kind: 'region', exact: false, group, target, progress: 1, reward: { tiles: 2 + Math.floor(target / 3), points: target * 15 } };
}
// "8+" (pelo menos); `exact` ficou só por compatibilidade com o HUD
export const questGoal = (q) => `${q.target}${q.exact ? '' : '+'}`;
