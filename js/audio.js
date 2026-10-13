// Sons sintetizados (sem arquivos externos)
let ctx = null, master = null, muted = false;
const VOL = 0.22;
export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // 12/10 (usuário: "efeitos de áudio mais suaves"): volume geral 0.35 → 0.22 e um passa-baixa que
    // arredonda os agudos — os sons continuam, só sem o brilho que cansava.
    const soft = ctx.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 2600; soft.Q.value = 0.5; soft.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = VOL; master.connect(soft);
  } catch (e) { ctx = null; }
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : VOL; }
export function isMuted() { return muted; }
function tone(freq, t0, dur, type = 'sine', vol = 0.5) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.022); // ataque mais lento: sem estalo g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
export function play(name, n = 0) {
  if (!ctx || muted) return;
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
    case 'bad': tone(180, t, 0.15, 'triangle', 0.2); break;
    case 'over': [523, 440, 349, 262].forEach((f, i) => tone(f, t + i * 0.2, 0.5, 'triangle', 0.35)); break;
    case 'appear': tone(880, t, 0.12, 'sine', 0.12); tone(1320, t + 0.05, 0.15, 'sine', 0.1); break;
    case 'harmony': [523, 659, 784, 988, 1175, 1568].forEach((f, i) => { tone(f, t + i * 0.07, 0.6, 'sine', 0.26); tone(f * 1.5, t + i * 0.07 + 0.03, 0.4, 'sine', 0.08); }); break;
    case 'relic': [392, 523, 784, 1046].forEach((f, i) => tone(f, t + i * 0.13, 0.5, 'triangle', 0.3)); tone(1568, t + 0.55, 0.8, 'sine', 0.2); break;
    case 'warn': [440, 415, 440].forEach((f, i) => tone(f, t + i * 0.16, 0.22, 'triangle', 0.12)); break;
    case 'confetti': [784, 988, 1175].forEach((f, i) => tone(f, t + i * 0.06, 0.25, 'sine', 0.14)); break;
  }
}
