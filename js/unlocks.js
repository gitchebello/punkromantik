// Desbloqueios entre partidas (14/10, à la Dorfromantik): os pontos de todas as partidas do modo
// clássico se acumulam e liberam, aos poucos, conteúdo que JÁ existe no jogo — nada novo é desenhado
// para isso, só deixa de vir tudo na primeira partida. Dá um motivo para jogar a próxima.
// `UNLOCK` começa todo ligado: demonstrações, testes (?play) e o modo livre continuam vendo tudo;
// `applyUnlocks` (main.js) desliga o que o jogador ainda não alcançou ao começar uma partida.
export const UNLOCK = { yeti: true, relic: true, nessie: true, hub: true, mega: true, giza: true };
// `xp` = pontos acumulados. Uma partida de bot rende ~1300–2600: tudo liberado em ~10 partidas.
export const UNLOCKS = [
  { id: 'yeti',   xp: 1000,  icon: '👣', name: 'Iéti',               desc: 'o abominável homem das neves passeia pelo Snowpunk' },
  { id: 'relic',  xp: 3000,  icon: '✦',  name: 'Achados distantes',  desc: 'peças apagadas surgem longe do tabuleiro' },
  { id: 'nessie', xp: 6000,  icon: '🦕', name: 'Nessie',             desc: 'um monstro nada pelos canais de esgoto' },
  { id: 'hub',    xp: 10000, icon: '🚉', name: 'Estação intermodal', desc: 'peça que junta trem, rodovia e esgoto' },
  { id: 'mega',   xp: 15000, icon: '🎰', name: 'Megaestruturas',     desc: 'cassino, hotel e shopping no Cyberpunk' },
  { id: 'giza',   xp: 22000, icon: '🔺', name: 'Pirâmides de Gizé',  desc: 'o trio de pirâmides no Sandpunk' },
];
export function applyUnlocks(xp, all = false) { for (const u of UNLOCKS) UNLOCK[u.id] = all || xp >= u.xp; }
export const nextUnlock = (xp) => UNLOCKS.find((u) => xp < u.xp) || null;
