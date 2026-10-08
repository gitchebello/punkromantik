// PRNG determinístico (mulberry32) para que cada peça seja reproduzível.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed) { this.f = mulberry32(seed >>> 0); }
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
