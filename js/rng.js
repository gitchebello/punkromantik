// PRNG determinístico (mulberry32) para que cada peça seja reproduzível.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// O estado fica em `this.a` (e não preso num closure) para o desfazer poder salvar/restaurar o sorteio:
// sem isso, desfazer + refazer a mesma jogada sorteava de novo missão, achado e peças (re-roll infinito).
export class RNG {
  constructor(seed) { this.a = seed >>> 0; const self = this; this.f = () => { let a = (self.a = (self.a + 0x6d2b79f5) | 0); let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  get state() { return this.a; }
  set state(v) { this.a = v; }
  float() { return this.f(); }
  int(n) { return Math.floor(this.f() * n); }
  range(a, b) { return a + this.f() * (b - a); }
  chance(p) { return this.f() < p; }
  pick(arr) { return arr[this.int(arr.length)]; }
  weighted(pairs) {
    let s = 0;
    for (const [, w] of pairs) s += w;
    let x = this.f() * s;
    for (const [v, w] of pairs) { x -= w; if (x <= 0) return v; }
    return pairs[pairs.length - 1][0];
  }
}
