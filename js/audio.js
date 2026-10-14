// Sons sintetizados (sem arquivos externos) + a trilha do menu inicial (audio/menu.mp3, do usuário)
let ctx = null, master = null, sfxBus = null, musBus = null;
// Música e efeitos ligam/desligam separados (menu de ajustes); lembrados entre visitas
const LS = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
let sfxOn = LS('pr_sfx') !== '0', musOn = LS('pr_music') !== '0';
// Chamado já ao abrir a página: a música carrega e toca na hora se o navegador deixar (Chrome no PC, para quem
// já visitou); senão o contexto nasce suspenso e o primeiro toque/tecla em qualquer lugar o retoma — a faixa
// já decodificada começa no mesmo instante. Nenhum navegador permite som sem gesto num primeiro acesso no celular.
export function initAudio() {
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 1 : 0; sfxBus.connect(master);
    musBus = ctx.createGain(); musBus.gain.value = musOn ? 1 : 0; musBus.connect(master);
  } catch (e) { ctx = null; }
  if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
  mStart();
}
const fadeBus = (bus, on) => { if (!bus) return; const t = ctx.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.4); };
export function setSfx(on) { sfxOn = on; try { localStorage.setItem('pr_sfx', on ? '1' : '0'); } catch (e) {} fadeBus(sfxBus, on); }
export function setMusic(on) { musOn = on; try { localStorage.setItem('pr_music', on ? '1' : '0'); } catch (e) {} fadeBus(musBus, on); }
export const sfxEnabled = () => sfxOn, musicEnabled = () => musOn;
// Trilha do usuário (14/10): "Launchkey" em loop, do menu inicial à partida sem interrupção
// ("Depois Do Nosso Horário" chegou a tocar no jogo e foi retirada: uma faixa só). `music()` aceita outras faixas em TRACKS. Passam pelo musBus: o ícone Música do menu as silencia sem calar os efeitos.
// O navegador só libera áudio depois de um toque, então `music()` antes disso só marca o desejo; `initAudio` toca.
const TRACKS = { menu: { url: 'audio/menu.mp3', vol: 1.6 } };
const bufs = {}, loading = {};
let want = null, cur = null; // cur = { name, src, gain }
function mStart() {
  if (!ctx || !want || (cur && cur.name === want)) return;
  const name = want, tr = TRACKS[name];
  if (!bufs[name]) {
    if (loading[name]) return; loading[name] = true;
    fetch(tr.url).then((r) => r.arrayBuffer()).then((a) => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no)))
      .then((b) => { bufs[name] = b; mStart(); }).catch(() => {}).finally(() => { loading[name] = false; });
    return;
  }
  mStop();
  const gain = ctx.createGain(); gain.connect(musBus);
  const t = ctx.currentTime; gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(tr.vol, t + 2);
  const src = ctx.createBufferSource(); src.buffer = bufs[name]; src.loop = true; src.connect(gain); src.start();
  cur = { name, src, gain };
}
function mStop() {
  if (!cur) return;
  const { src, gain } = cur, t = ctx.currentTime; cur = null;
  gain.gain.cancelScheduledValues(t); gain.gain.setValueAtTime(gain.gain.value, t); gain.gain.linearRampToValueAtTime(0, t + 1.2);
  src.stop(t + 1.25);
}
export function music(name) { // 'menu' | null
  want = name;
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  if (!name) mStop(); else mStart();
}
function tone(freq, t0, dur, type = 'sine', vol = 0.5) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(sfxBus); o.start(t0); o.stop(t0 + dur + 0.05);
}
export function play(name, n = 0) {
  if (!ctx || !sfxOn) return;
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  switch (name) {
    case 'rotate': tone(520, t, 0.06, 'triangle', 0.25); break;
    case 'select': tone(400, t, 0.05, 'sine', 0.15); break;
    case 'place':
      tone(140, t, 0.12, 'triangle', 0.6); tone(90, t + 0.02, 0.18, 'sine', 0.5);
      for (let i = 0; i < n; i++) tone(660 + i * 110, t + 0.12 + i * 0.07, 0.18, 'sine', 0.3);
      break;
    case 'perfect': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.09, 0.35, 'triangle', 0.35)); break;
    case 'quest': [784, 988, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.1, 0.4, 'sine', 0.4)); break;
    case 'bad': tone(180, t, 0.15, 'sawtooth', 0.2); break;
    case 'over': [523, 440, 349, 262].forEach((f, i) => tone(f, t + i * 0.2, 0.5, 'triangle', 0.35)); break;
    case 'appear': tone(880, t, 0.12, 'sine', 0.12); tone(1320, t + 0.05, 0.15, 'sine', 0.1); break;
    case 'harmony': [523, 659, 784, 988, 1175, 1568, 2093].forEach((f, i) => { tone(f, t + i * 0.07, 0.6, 'sine', 0.3); tone(f * 1.5, t + i * 0.07 + 0.03, 0.4, 'triangle', 0.12); }); break;
    case 'relic': [392, 523, 784, 1046].forEach((f, i) => tone(f, t + i * 0.13, 0.5, 'triangle', 0.3)); tone(1568, t + 0.55, 0.8, 'sine', 0.2); break;
    case 'warn': [440, 415, 440].forEach((f, i) => tone(f, t + i * 0.16, 0.22, 'square', 0.12)); break;
    case 'confetti': [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.05, 0.25, 'triangle', 0.22)); break;
  }
}
export const audioRunning = () => !!ctx && ctx.state === 'running';
