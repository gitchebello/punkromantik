import { key, opp, DIRS, toWorld, fromWorld, edgeAt, edgeAngle } from './hex.js';
import { RNG } from './rng.js';
import { TERRAIN, GROUP_INFO, isConnector, compatible, groupOf, genTile, starterTile, makeStack, makeQuest, isTerminal } from './tilegen.js';
import { buildTile, buildSlab, buildSlotRing, buildHexDisc, buildRotorGeometry, buildVehicleGeometry, buildDroneGeometry, buildHighlight, pathLength, pointAt, TILE_H } from './tilemesh.js';
import { initAudio, play, setMuted, isMuted } from './audio.js';
import { CameraRig, attachInput } from './controls.js';

const THREE = window.THREE;
const STACK_SIZE = 40;
const NEON = ['#ff2bd6', '#22f3ff', '#ffe93a', '#ff7a1a', '#9dff2b', '#b66bff', '#ffffff'];
const $ = (id) => document.getElementById(id);
const prefs = { bloom: localStorage.getItem('pr_bloom') !== '0', lens: localStorage.getItem('pr_lens') !== '0', grain: localStorage.getItem('pr_grain') !== '0' };

// ---------- ícones (SVG inline: a HUD fala por números e símbolos, não por texto) ----------
const ICON_PATHS = {
  cyber: '<path d="M2 22V11h4V6h5v4h4v3h4v9z"/><path fill="#fff" opacity=".6" d="M4 13h1.6v2H4zm0 3.5h1.6v2H4zM8 8h1.6v2H8zm0 3.5h1.6v2H8zm0 3.5h1.6v2H8zm4 0h1.6v2H12zm4 3h1.6v2H16z"/>',
  city: '<path d="M5 22V3h14v19z"/><path fill="#fff" opacity=".7" d="M8 6h2.2v2.2H8zm5.8 0H16v2.2h-2.2zM8 10.2h2.2v2.2H8zm5.8 0H16v2.2h-2.2zM8 14.4h2.2v2.2H8zm5.8 0H16v2.2h-2.2zM10.6 22v-3.4h2.8V22z"/>',
  solar: '<path d="M12 22c0-7 3-13 10-16-1 8-5 13-10 16z"/><path d="M12 22C12 15 9 9 2 6c1 8 5 13 10 16z"/><path d="M12 22V9" stroke="#fff" stroke-width="1.4" opacity=".6" fill="none"/>',
  rock: '<path d="M1 21L9 6l3.2 5.6L15 8l8 13z"/><path fill="#fff" opacity=".9" d="M9 6l2.1 3.7-1.5 1.7L8 9.9 6.9 10.2z"/>',
  toxic: '<path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/><circle cx="9.4" cy="15" r="1.7" fill="#fff" opacity=".6"/>',
  rail: '<path d="M2 16V9a5 5 0 0 1 5-5h8c4.5 0 8 3.5 9 8v4z"/><path fill="#fff" opacity=".65" d="M5 8h4v4H5zm6 0h4v4h-4z"/><circle cx="7" cy="19.5" r="2.2"/><circle cx="17" cy="19.5" r="2.2"/>',
  road: '<path d="M8.5 2h7l6 20H2.5z"/><path d="M12 4v3.5M12 10v4M12 16.5v5" stroke="#fff" stroke-width="1.9" stroke-linecap="round" opacity=".85" fill="none"/>',
  plain: '<path d="M12 2l2 6 6-2-4 5 4 5-6-2-2 6-2-6-6 2 4-5-4-5 6 2z"/>',
  grass: '<path d="M4 21c0-6 3-10 8-12-2 4-2 8-1 12zM12 21c-1-7 3-12 9-13-3 4-5 8-5 13z"/>',
  tile: '<path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/>',
  flag: '<path d="M5 22V3h2v1h11l-2.6 4L18 12H7v10z"/>',
  pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
  bulb: '<path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2zM9 19h6v1.5a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 20.5z"/>',
  undo: '<path d="M9 5L3 11l6 6v-4h5a4 4 0 0 1 0 8h-3v3h3a7 7 0 0 0 0-14H9z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>',
  check: '<path d="M4 12l5 5L20 6" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  trophy: '<path d="M6 3h12v2h3v3a5 5 0 0 1-4.3 4.95A6 6 0 0 1 13 16.9V19h4v2H7v-2h4v-2.1a6 6 0 0 1-3.7-3.95A5 5 0 0 1 3 8V5h3zm-1 4v1a3 3 0 0 0 1.2 2.4A6 6 0 0 1 6 9V7zm14 0h-1v2c0 .5 0 1-.2 1.4A3 3 0 0 0 19 8z"/>',
};
const icon = (name, size = 18, color = 'currentColor', cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${color}" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
const questIcon = (q) => (q.kind === 'city' ? 'city' : q.group);
const questLeft = (q) => q.target - q.progress;

// ---------- cena ----------
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
// Fundo: gradiente cinza escuro -> preto com grão baked, desenhado em espaço de tela
function makeGradientTexture(stops, grain = 0) {
  const W = 256, Hh = 512, c = document.createElement('canvas'); c.width = W; c.height = Hh;
  const ctx = c.getContext('2d'), g = ctx.createLinearGradient(0, 0, 0, Hh);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
  if (grain) {
    const img = ctx.getImageData(0, 0, W, Hh), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * grain * 255; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    ctx.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}
const BG_TEX = makeGradientTexture([[0, '#232329'], [0.55, '#0a0a0c'], [1, '#030304']], 0.012);
const FOG = 0x0a0a0d;
scene.background = BG_TEX;
scene.fog = new THREE.Fog(FOG, 20, 60);
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300);
const rig = new CameraRig(camera, canvas);

scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2038, 0.55));
const sun = new THREE.DirectionalLight(0xfff1dc, 0.66); sun.position.set(6, 12, 4); scene.add(sun);
const fill = new THREE.DirectionalLight(0x4a7dff, 0.28); fill.position.set(-8, 5, -6); scene.add(fill);
const rimL = new THREE.DirectionalLight(0xff2bd6, 0.14); rimL.position.set(2, 3, -10); scene.add(rimL);

const litMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const ghostLit = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.5 });
const ghostGlow = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5 });
// Água do esgoto: ondulações procedurais escuras com linhas neon
const WATER_VS = `varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz;
  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`;
const WATER_FS = `uniform float time; uniform float opacity; uniform vec3 deep; uniform vec3 base; uniform vec3 glow; varying vec3 vWorld;
#include <fog_pars_fragment>
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  vec2 p = vWorld.xz * 5.5;
  float n1 = noise(p + vec2(time * 0.32, time * 0.18));
  float n2 = noise(p * 2.1 - vec2(time * 0.22, -time * 0.27));
  float w = n1 * 0.6 + n2 * 0.4;
  float ridge = 1.0 - abs(w * 2.0 - 1.0);
  float lines = smoothstep(0.72, 0.97, ridge);
  vec3 col = mix(deep, base, w);
  col += glow * lines * 0.62;
  col += glow * step(0.988, noise(p * 6.0 + time * 1.7)) * 0.9;
  gl_FragColor = vec4(col, opacity);
#include <fog_fragment>
}`;
function makeWaterMat(opacity) {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, opacity: { value: opacity }, deep: { value: new THREE.Color('#04231f') }, base: { value: new THREE.Color('#0c5a4a') }, glow: { value: new THREE.Color('#2dffb8') } }]),
    vertexShader: WATER_VS, fragmentShader: WATER_FS, fog: true, transparent: opacity < 1,
  });
}
const waterMat = makeWaterMat(1), waterGhost = makeWaterMat(0.5);
const boltMats = {};
const boltMat = (c) => boltMats[c] || (boltMats[c] = new THREE.MeshBasicMaterial({ color: c }));
const ringGeo = buildSlotRing(), discGeo = buildHexDisc(), rotorGeo = buildRotorGeometry();
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false });
const ringSel = {
  ok: new THREE.MeshBasicMaterial({ color: 0x7dff9a, transparent: true, opacity: 0.95, depthWrite: false }),
  partial: new THREE.MeshBasicMaterial({ color: 0xffe36a, transparent: true, opacity: 0.95, depthWrite: false }),
  bad: new THREE.MeshBasicMaterial({ color: 0xff5c7a, transparent: true, opacity: 0.95, depthWrite: false }),
  none: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }),
};
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x3a1f4f, transparent: true, opacity: 0.22, depthWrite: false });

const BLOOM = 1, bloomLayer = new THREE.Layers(); bloomLayer.set(BLOOM);
const boardGroup = new THREE.Group(), slotGroup = new THREE.Group(), ghostGroup = new THREE.Group(), fxGroup = new THREE.Group();
scene.add(boardGroup, slotGroup, ghostGroup, fxGroup);
const ghostShadow = new THREE.Mesh(discGeo, shadowMat); ghostShadow.position.y = TILE_H + 0.008; ghostShadow.visible = false; scene.add(ghostShadow);
// Indicadores de encaixe: em cada lado compatível, o friso do hexágono brilha/vibra na cor do terreno
// e um flash vertical da mesma cor pulsa na lateral (na junta com a peça vizinha).
const EDGE_COLORS = { plain: 0x6fd2f5, grass: 0xb8ff5c, cyber: 0xff2bd6, solar: 0x6cf04a, rock: 0xff9a3c, pool: 0x2dffb8, sewage: 0x2dffb8, rail: 0x22f3ff, road: 0xffe36a };
const GROUP_HEX = { plain: 0x6fd2f5, grass: 0xb8ff5c, cyber: 0xff2bd6, solar: 0x6cf04a, rock: 0xff9a3c, toxic: 0x2dffb8, rail: 0x22f3ff, road: 0xffe36a };
const stripGeo = new THREE.BoxGeometry(0.86, 0.014, 0.07);
const flashGeo = new THREE.PlaneGeometry(0.92, 0.3);
function makeSeamSet() {
  const group = new THREE.Group(), items = [];
  for (let i = 0; i < 6; i++) {
    const a = edgeAngle(i);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false });
    const strip = new THREE.Mesh(stripGeo, mat); // friso na borda da casa
    strip.position.set(Math.cos(a) * 0.9, TILE_H + 0.012, Math.sin(a) * 0.9); strip.rotation.y = -(a + Math.PI / 2); strip.layers.enable(BLOOM);
    const mirror = new THREE.Mesh(stripGeo, mat); // friso correspondente na borda da peça vizinha (do outro lado da junta)
    const rm = 2 * 0.866 - 0.9; mirror.position.set(Math.cos(a) * rm, TILE_H + 0.012, Math.sin(a) * rm); mirror.rotation.y = -(a + Math.PI / 2); mirror.layers.enable(BLOOM);
    const flash = new THREE.Mesh(flashGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    flash.position.set(Math.cos(a) * 0.866, TILE_H * 0.5 + 0.08, Math.sin(a) * 0.866); flash.rotation.y = -(a + Math.PI / 2); flash.layers.enable(BLOOM);
    strip.visible = false; mirror.visible = false; flash.visible = false;
    group.add(strip, mirror, flash);
    items.push({ strip, mirror, flash, st: 0, base: new THREE.Color(0xffffff), ph: Math.random() * 6, y0: flash.position.y });
  }
  scene.add(group); group.visible = false;
  return { group, items, seal: -1, boost: 0 };
}
const seamGhost = makeSeamSet(), seamPlaced = makeSeamSet();
function setSeamStates(set, ev) {
  ev.sides.forEach((st, i) => {
    const it = set.items[i]; it.st = st;
    const hex = st === -1 ? 0xff3b5c : st === 2 ? 0x55506a : (EDGE_COLORS[ev.types[i]] || 0xffffff);
    it.base.setHex(hex);
    it.strip.visible = st !== 0; it.mirror.visible = st === 1 || st === -1; it.flash.visible = st === 1 || st === -1;
  });
  set.group.visible = true;
}
function updateSeams(set, now, dt) {
  if (!set.group.visible) return;
  let fade = 1;
  if (set.seal >= 0) { set.seal += dt; fade = Math.max(0, 1 - set.seal / 0.55); if (fade <= 0) { set.group.visible = false; set.seal = -1; return; } }
  for (const it of set.items) {
    if (it.st === 0) continue;
    const t = now * 0.001;
    if (it.st === 1) { // brilho vibrando na cor do terreno
      const k = 0.75 + 0.6 * Math.sin(t * 11 + it.ph) + (Math.random() < 0.07 ? 0.7 : 0) + set.boost;
      it.strip.material.color.copy(it.base).multiplyScalar(Math.max(0.35, k)); it.strip.material.opacity = 0.95 * fade;
      const f = 0.3 + 0.5 * Math.abs(Math.sin(t * 19 + it.ph)) + (Math.random() < 0.1 ? 0.3 : 0);
      it.flash.material.color.copy(it.base).multiplyScalar(1 + set.boost);
      it.flash.material.opacity = Math.min(1, f) * fade;
      it.flash.position.y = it.y0 + (Math.random() - 0.5) * 0.012; it.flash.scale.set(1 + 0.04 * Math.sin(t * 31 + it.ph), 1 + 0.1 * Math.sin(t * 23 + it.ph), 1);
      it.strip.scale.y = 1 + 1.5 * Math.abs(Math.sin(t * 13 + it.ph)); it.mirror.scale.y = it.strip.scale.y;
    } else if (it.st === -1) { // proibido: estrobo vermelho
      const on = Math.sin(t * 40) > 0 ? 1 : 0.15;
      it.strip.material.color.copy(it.base).multiplyScalar(on * 1.3); it.strip.material.opacity = fade;
      it.flash.material.color.copy(it.base); it.flash.material.opacity = on * 0.9 * fade; it.flash.position.y = it.y0;
    } else { // não casa: friso apagado
      it.strip.material.color.copy(it.base); it.strip.material.opacity = 0.5 * fade; it.strip.scale.y = 1;
    }
  }
}
function sealSeams(ev, w) { // ao colocar: as juntas compatíveis dão um clarão e apagam
  seamPlaced.group.position.set(w.x, 0, w.z);
  setSeamStates(seamPlaced, { sides: ev.sides.map((st) => (st === 1 ? 1 : 0)), types: ev.types });
  seamPlaced.seal = 0; seamPlaced.boost = 1.2;
}

// ---------- realce da formação: tudo que se liga à peça na mão brilha na cor do terreno ----------
const hiMats = {};
for (const g in GROUP_HEX) hiMats[g] = new THREE.MeshBasicMaterial({ color: GROUP_HEX[g], transparent: true, opacity: 0.22, depthWrite: false });
const hiPool = [], hiHover = [], hiSealed = [];
const ghostHi = new THREE.Group(); ghostHi.position.y = TILE_H + 0.012;
const formation = { groups: [], seal: -1 };
function hiGeo(tile, group) { tile._hi = tile._hi || {}; return tile._hi[group] || (tile._hi[group] = buildHighlight(tile, group)); }
function takeHi() {
  let m = hiPool.pop();
  if (!m) { m = new THREE.Mesh(discGeo, hiMats.plain); m.layers.enable(BLOOM); m.renderOrder = 2; fxGroup.add(m); }
  m.visible = true; return m;
}
function releaseHi(list) { for (const m of list) { m.visible = false; hiPool.push(m); } list.length = 0; }
function placeHi(m, t, group) {
  const w = toWorld(t.q, t.r);
  m.geometry = hiGeo(t.tile, group); m.material = hiMats[group];
  m.position.set(w.x, TILE_H + 0.012, w.z); m.rotation.y = (-t.rot * Math.PI) / 3; m.userData.group = group;
}
// grupos de formação que a peça na casa (q,r) com esta avaliação tocaria, e as casas de cada um
function formationGroups(q, r, ev) {
  const byGroup = new Map();
  for (let i = 0; i < 6; i++) {
    if (ev.sides[i] !== 1) continue;
    const g = groupOf(ev.types[i]);
    if (g === 'plain' || g === 'grass') continue; // gelo e baldio não formam "formação": não vale realçar meio tabuleiro
    const nk = key(q + DIRS[i][0], r + DIRS[i][1]);
    let set = byGroup.get(g); if (!set) { set = new Set(); byGroup.set(g, set); }
    if (!set.has(nk)) for (const k of regionKeys(nk, g)) set.add(k);
  }
  return byGroup;
}
function showFormation(q, r, ev) {
  releaseHi(hiHover); ghostHi.clear();
  const byGroup = formationGroups(q, r, ev);
  for (const [g, keys] of byGroup) for (const k of keys) { const t = S.tiles.get(k); if (!t) continue; const m = takeHi(); placeHi(m, t, g); hiHover.push(m); }
  for (const g of byGroup.keys()) { const m = new THREE.Mesh(hiGeo(S.current, g), hiMats[g]); m.layers.enable(BLOOM); m.renderOrder = 2; ghostHi.add(m); }
  formation.groups = [...byGroup.keys()];
}
function hideFormation() { releaseHi(hiHover); ghostHi.clear(); formation.groups = []; }
function sealFormation(q, r, ev) { // ao colocar: a formação inteira (com a peça nova) dá um clarão e apaga
  releaseHi(hiSealed);
  const byGroup = formationGroups(q, r, ev);
  for (const [g, keys] of byGroup) for (const k of keys) { const t = S.tiles.get(k); if (!t) continue; const m = takeHi(); placeHi(m, t, g); hiSealed.push(m); }
  const t = S.tiles.get(key(q, r));
  if (t) for (const g of byGroup.keys()) { const m = takeHi(); placeHi(m, t, g); hiSealed.push(m); }
  formation.seal = byGroup.size ? 0 : -1;
  hideFormation();
}
function updateFormation(now, dt) {
  const t = now * 0.001;
  const hoverK = 0.16 + 0.1 * Math.sin(t * 5.5) + 0.03 * Math.sin(t * 17);
  const sealK = formation.seal >= 0 ? Math.max(0, 1 - formation.seal / 0.8) : 0;
  if (formation.seal >= 0) { formation.seal += dt; if (sealK <= 0) { formation.seal = -1; releaseHi(hiSealed); } }
  for (const g in hiMats) hiMats[g].opacity = Math.max(hoverK, sealK * 0.6);
  // a onda de brilho corre da peça na mão para o resto da formação (arcos leves de escala)
  for (const m of hiHover) m.scale.setScalar(1 + 0.012 * Math.sin(t * 6 + m.position.x * 0.9 + m.position.z * 0.7));
}
// mola amortecida: slow-in/slow-out natural com leve overshoot
function spring(sp, k, c, dt) { const a = k * (sp.target - sp.v) - c * sp.vel; sp.vel += a * dt; sp.v += sp.vel * dt; return sp.v; }
let ghostRotTarget = 0;
const ghostRot = { v: 0, vel: 0, target: 0 }, curRot = { v: 0, vel: 0, target: 0 };
const ghostPos = { x: { v: 0, vel: 0, target: 0 }, z: { v: 0, vel: 0, target: 0 }, arc: 0 };
let cameraShake = null;

// ---------- bloom seletivo (só a camada 1 brilha) ----------
const darkMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const BLACK = new THREE.Color(0x000000), FOGC = new THREE.Color(FOG);
let bloomComposer = null, finalComposer = null, bloomPass = null, mixPass = null, lensPass = null;
const swapped = new Map();
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// Lente: distorção de barril + aberração cromática que crescem para as bordas (e com o zoom)
const LENS_FS = `
uniform sampler2D tDiffuse; uniform float aberration; uniform float distortion; uniform float aspect; uniform float vignette;
uniform float grain; uniform float time;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 c = vUv - 0.5;
  vec2 ca = c * vec2(aspect, 1.0);
  float r2 = dot(ca, ca);
  float rMax2 = 0.25 * aspect * aspect + 0.25;
  vec2 d = c * (1.0 + distortion * r2) / (1.0 + distortion * rMax2);
  float ab = aberration * r2;
  vec2 uvR = clamp(0.5 + d * (1.0 + ab), 0.0, 1.0);
  vec2 uvG = clamp(0.5 + d, 0.0, 1.0);
  vec2 uvB = clamp(0.5 + d * (1.0 - ab), 0.0, 1.0);
  vec3 col = vec3(texture2D(tDiffuse, uvR).r, texture2D(tDiffuse, uvG).g, texture2D(tDiffuse, uvB).b);
  col *= 1.0 - vignette * smoothstep(0.35, 1.0, r2 / rMax2);
  float g = hash(gl_FragCoord.xy + fract(time * 13.0) * 97.0) - 0.5;
  col += g * grain * (0.5 + 0.5 * (1.0 - dot(col, vec3(0.333))));
  gl_FragColor = vec4(col, 1.0);
}`;
function setupPost() {
  if (!THREE.EffectComposer || !THREE.UnrealBloomPass) return;
  const rp = new THREE.RenderPass(scene, camera);
  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.55, 0.5, 0);
  bloomComposer = new THREE.EffectComposer(renderer); bloomComposer.renderToScreen = false;
  bloomComposer.addPass(rp); bloomComposer.addPass(bloomPass);
  mixPass = new THREE.ShaderPass(new THREE.ShaderMaterial({
    uniforms: { baseTexture: { value: null }, bloomTexture: { value: bloomComposer.renderTarget2.texture } },
    vertexShader: VS,
    fragmentShader: 'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main(){ gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }',
  }), 'baseTexture');
  mixPass.needsSwap = true;
  lensPass = new THREE.ShaderPass(new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, aberration: { value: 0.01 }, distortion: { value: 0.05 }, aspect: { value: 1.6 }, vignette: { value: 0.12 }, grain: { value: 0.05 }, time: { value: 0 } },
    vertexShader: VS, fragmentShader: LENS_FS,
  }));
  finalComposer = new THREE.EffectComposer(renderer);
  finalComposer.addPass(rp); finalComposer.addPass(mixPass); finalComposer.addPass(lensPass);
}
function renderFrame() {
  renderer.autoClear = true;
  if (!finalComposer) { renderer.render(scene, camera); return; }
  mixPass.enabled = prefs.bloom; lensPass.enabled = prefs.lens || prefs.grain;
  if (prefs.bloom) {
    scene.traverse((o) => { if ((o.isMesh || o.isPoints) && !bloomLayer.test(o.layers)) { swapped.set(o, o.material); o.material = darkMat; } });
    scene.background = BLACK; scene.fog.color = BLACK;
    bloomComposer.render();
    for (const [o, m] of swapped) o.material = m; swapped.clear();
    scene.background = BG_TEX; scene.fog.color = FOGC;
  }
  if (lensPass.enabled) { // quanto mais perto das peças, mais evidente a lente
    const zoomK = Math.max(0, Math.min(1, (13 - rig.dist) / 8)), u = lensPass.uniforms;
    u.aberration.value = prefs.lens ? 0.004 + 0.012 * zoomK : 0;
    u.distortion.value = prefs.lens ? 0.04 + 0.16 * zoomK : 0;
    u.vignette.value = prefs.lens ? 0.14 + 0.14 * zoomK : 0;
    u.aspect.value = camera.aspect;
    u.grain.value = prefs.grain ? 0.055 : 0; u.time.value = performance.now() * 0.001;
    if (!prefs.lens) { u.aberration.value = 0; u.distortion.value = 0; }
  }
  finalComposer.render();
}
setupPost();

// ---------- cena de UI: pilha de peças e peça atual (viewports no HUD) ----------
const SLAB_H = 0.11, STACK_SHOW = 22, FLOAT_H = 0.62; // a próxima peça paira acima da pilha: dá para espiar a seguinte
const uiScene = new THREE.Scene();
uiScene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2038, 0.8));
const uiSun = new THREE.DirectionalLight(0xfff1dc, 0.85); uiSun.position.set(3, 6, 4); uiScene.add(uiSun);
const uiFill = new THREE.DirectionalLight(0x4a7dff, 0.3); uiFill.position.set(-4, 3, -3); uiScene.add(uiFill);
const stackRoot = new THREE.Group(); uiScene.add(stackRoot);
const curRoot = new THREE.Group(); curRoot.position.set(50, 0, 0); uiScene.add(curRoot);
const stackCam = new THREE.PerspectiveCamera(26, 1, 0.1, 60), curCam = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
// halos escuros suaves atrás da pilha e da peça atual (separam a UI do tabuleiro)
function makeHalo(scale) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  g.addColorStop(0, 'rgba(6,4,14,0.92)'); g.addColorStop(0.55, 'rgba(6,4,14,0.6)'); g.addColorStop(1, 'rgba(6,4,14,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: true }));
  sp.scale.set(scale, scale, 1); sp.renderOrder = -10;
  return sp;
}
const stackHalo = makeHalo(4.2), curHalo = makeHalo(3.0);
uiScene.add(stackHalo, curHalo); curHalo.position.set(50 - 1.0, 0.1, -1.0); // atrás da peça, do ponto de vista da câmera
let stackTopY = 0, stackCamY = 0, curTileGroup = null, stackTopGroup = null;
const uiAnims = [];
function slabGeo(tile) { if (!tile._slab) tile._slab = buildSlab(tile, SLAB_H); return tile._slab; }
// Reconstrói a pilha: topo = próxima peça (arte completa) pairando; abaixo, a seguinte também completa; o resto em lâminas
function rebuildStack(dropNew = 0, riseTop = false) {
  stackRoot.clear(); stackTopGroup = null;
  const n = S.stack.length, show = Math.min(n, STACK_SHOW);
  for (let j = show - 1; j >= 0; j--) {
    const tile = S.stack[j], level = show - 1 - j, y = level * SLAB_H, r = new RNG(tile.seed ^ 0x5bd1e995);
    let g;
    if (j <= 1) g = makeTileGroup(tile, litMat, glowMat, false);
    else { const geo = slabGeo(tile); g = new THREE.Group(); const gl = new THREE.Mesh(geo.glow, glowMat); g.add(new THREE.Mesh(geo.lit, litMat), gl); }
    const yFinal = j === 0 ? y + FLOAT_H : y;
    g.position.set(j === 0 ? 0 : r.range(-0.035, 0.035), yFinal, j === 0 ? 0 : r.range(-0.035, 0.035));
    g.rotation.y = j === 0 ? 0 : r.range(-0.07, 0.07);
    g.userData.level = level; g.userData.baseY = yFinal;
    if (j === 0) { stackTopGroup = g; if (riseTop) uiAnims.push({ obj: g, from: y, to: yFinal, t: 0, dur: 0.55, kind: 'rise' }); }
    if (dropNew && j < dropNew) { const from = yFinal + 2.2 + (dropNew - 1 - j) * 0.35; g.position.y = from; uiAnims.push({ obj: g, from, to: yFinal, t: -0.06 * (dropNew - 1 - j), dur: 0.5, kind: 'drop' }); }
    stackRoot.add(g);
  }
  stackTopY = Math.max(0, show - 1) * SLAB_H;
}
// A peça do topo sobe e some (foi para a mão do jogador)
function liftTopOfStack() {
  const top = stackTopGroup; if (!top) return;
  stackRoot.remove(top); uiScene.add(top); stackTopGroup = null;
  uiAnims.push({ obj: top, from: top.position.y, to: top.position.y + 1.4, t: 0, dur: 0.38, kind: 'lift' });
}
function refreshCurrentPreview() {
  curRoot.clear(); curTileGroup = null;
  if (!S.current) return;
  curTileGroup = makeTileGroup(S.current, litMat, glowMat, false);
  curTileGroup.rotation.y = (-S.rot * Math.PI) / 3;
  curRoot.add(curTileGroup);
}
function viewportOf(el) { const r = el.getBoundingClientRect(); return { x: r.left, y: window.innerHeight - r.bottom, w: r.width, h: r.height }; }
function renderUI() {
  if (!S.started || $('hud').classList.contains('hidden')) return;
  const W = window.innerWidth, Hh = window.innerHeight;
  renderer.autoClear = false; renderer.clearDepth(); renderer.setScissorTest(true);
  const draw = (el, cam, fovSmall, fovLarge) => {
    const v = viewportOf(el); if (v.w < 10 || v.h < 10) return;
    renderer.setViewport(v.x, v.y, v.w, v.h); renderer.setScissor(v.x, v.y, v.w, v.h);
    cam.aspect = v.w / v.h; cam.fov = v.w < 150 ? fovSmall : fovLarge; cam.updateProjectionMatrix();
    renderer.render(uiScene, cam);
  };
  stackCamY += (stackTopY - stackCamY) * 0.12;
  // câmera enquadra a peça que paira inteira (com os arranha-céus) e ainda mostra a seguinte por baixo
  stackCam.position.set(3.3, stackCamY + 3.5, 3.3); stackCam.lookAt(0, stackCamY + FLOAT_H + 0.22, 0);
  stackHalo.position.set(-1.0, stackCamY + 0.35, -1.0);
  curCam.position.set(50 + 2.4, 2.9, 2.4); curCam.lookAt(50, 0.36, 0);
  draw($('stack-area'), stackCam, 34, 30); draw($('current-area'), curCam, 33, 26);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, Hh); renderer.autoClear = true;
}
// Anéis radiais saindo do centro do hexágono: chamam a atenção para uma peça com missão (pilha, mão e tabuleiro)
const ringPulseGeo = (() => { const g = new THREE.RingGeometry(0.9, 1.0, 6, 1); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 6); return g; })();
const ringPulses = [];
let ringAcc = 0;
function spawnRingPulse(parent, x, y, z, color, bloom = false) {
  const m = new THREE.Mesh(ringPulseGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.scale.setScalar(0.25); if (bloom) m.layers.enable(BLOOM);
  parent.add(m); ringPulses.push({ m, parent, t: 0, dur: 1.15 });
}
function updateRingPulses(dt) {
  for (let i = ringPulses.length - 1; i >= 0; i--) {
    const p = ringPulses[i]; p.t += dt; const k = Math.min(1, p.t / p.dur), e = 1 - Math.pow(1 - k, 2.2);
    p.m.scale.setScalar(0.25 + 1.45 * e); p.m.material.opacity = 0.9 * (1 - k) * (1 - k);
    if (k >= 1) { p.parent.remove(p.m); p.m.material.dispose(); ringPulses.splice(i, 1); }
  }
}

// ---------- cenário: nuvens e poeira ----------
const clouds = [];
{
  const cm = new THREE.MeshLambertMaterial({ color: 0x1f1d2b }), cg = new THREE.IcosahedronGeometry(1, 0), r = new RNG(7);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(), n = 3 + r.int(3);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(cg, cm);
      m.position.set(r.range(-1.2, 1.2) * (k ? 1 : 0), r.range(-0.2, 0.2), r.range(-0.6, 0.6));
      m.scale.set(r.range(0.7, 1.5), r.range(0.35, 0.6), r.range(0.6, 1.1));
      m.rotation.set(r.float(), r.float(), r.float());
      g.add(m);
    }
    const s = r.range(0.9, 2.2); g.scale.set(s, s, s);
    g.position.set(r.range(-40, 40), r.range(-9, -4), r.range(-40, 40));
    g.userData.speed = r.range(0.12, 0.35);
    clouds.push(g); scene.add(g);
  }
}
const DUST_N = 90, dustPos = new Float32Array(DUST_N * 3), dustVel = [];
const dust = (() => {
  for (let i = 0; i < DUST_N; i++) { dustPos[i * 3] = (Math.random() - 0.5) * 26; dustPos[i * 3 + 1] = 0.2 + Math.random() * 4; dustPos[i * 3 + 2] = (Math.random() - 0.5) * 26; dustVel.push({ vy: 0.08 + Math.random() * 0.14, ph: Math.random() * 6.28, f: 0.4 + Math.random() * 0.8 }); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffd9a8, size: 0.05, transparent: true, opacity: 0.75, depthWrite: false, sizeAttenuation: true });
  const p = new THREE.Points(g, m); p.layers.enable(BLOOM); scene.add(p); return p;
})();

// ---------- estado ----------
const S = {
  tiles: new Map(), slots: new Map(), stack: [], current: null, rot: 0, selected: null, ghostSolid: true,
  score: 0, placed: 0, perfects: 0, questsDone: 0, questsLost: 0, quests: [], over: false, started: false, rng: new RNG(Date.now() >>> 0),
  best: +(localStorage.getItem('pr_best') || 0), tips: new Set(), lowWarned: false, tileList: [], hints: 5, undo: null, sinceQuest: 0, pendingGain: 0,
};
const HINTS_PER_GAME = 5, QUEST_CAP = 4;
const anims = [], particles = [], vehicles = [];
let ghostAnim = null, ambAcc = 0;
const particleGeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
const particleMats = {}, vehicleGeos = {}, droneGeos = {};
const pmat = (c) => particleMats[c] || (particleMats[c] = new THREE.MeshBasicMaterial({ color: c }));

function tileGeo(tile) { if (!tile._geo) tile._geo = buildTile(tile); return tile._geo; }
const buildingsOf = (tile) => tileGeo(tile).buildings || 0;
function vehicleGeo(type, color) { const k = type + (color || ''); return vehicleGeos[k] || (vehicleGeos[k] = buildVehicleGeometry(type, color)); }
function makeVehicleMesh(type, color, lit, glow) {
  const geo = vehicleGeo(type, color), g = new THREE.Group();
  const gl = new THREE.Mesh(geo.glow, glow); gl.layers.enable(BLOOM);
  g.add(new THREE.Mesh(geo.lit, lit), gl);
  return g;
}
function placeVehicle(v, route) {
  const p = pointAt(route.pts, v.s), nx = -Math.sin(p.a), nz = Math.cos(p.a), off = v.type === 'car' ? 0.078 * v.dir : 0;
  v.mesh.position.set(p.x + nx * off, TILE_H, p.z + nz * off);
  v.mesh.rotation.y = -(v.dir > 0 ? p.a : p.a + Math.PI);
}
// Raio elétrico: fita em zigue-zague regenerada a cada poucos frames
function makeBolt(a, mat) {
  const N = 8, geo = new THREE.BufferGeometry(), pos = new Float32Array(N * 6 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Mesh(geo, mat); m.layers.enable(BLOOM); m.frustumCulled = false; m.visible = false;
  m.userData.bolt = { a, N, t: 0, next: 0, on: false };
  return m;
}
function rerollBolt(m) {
  const { a, N } = m.userData.bolt, pos = m.geometry.attributes.position.array;
  const dx = a.x1 - a.x0, dz = a.z1 - a.z0, len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len, w = 0.016;
  const pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N, e = i === 0 || i === N, j = e ? 0 : (Math.random() - 0.5) * 0.12; pts.push([a.x0 + dx * t + nx * j, a.y + (e ? 0 : 0.03 + Math.random() * 0.09 + Math.sin(Math.PI * t) * 0.06), a.z0 + dz * t + nz * j]); }
  let k = 0;
  for (let i = 0; i < N; i++) {
    const p = pts[i], q = pts[i + 1], L = [p[0] + nx * w, p[1], p[2] + nz * w], R = [p[0] - nx * w, p[1], p[2] - nz * w], L2 = [q[0] + nx * w, q[1], q[2] + nz * w], R2 = [q[0] - nx * w, q[1], q[2] - nz * w];
    for (const v of [L, R, R2, L, R2, L2]) { pos[k++] = v[0]; pos[k++] = v[1]; pos[k++] = v[2]; }
  }
  m.geometry.attributes.position.needsUpdate = true;
}
// Monta o grupo 3D de uma peça (estática + água + rotores + veículos + raios + drones)
function makeTileGroup(tile, lit, glow, live) {
  const geo = tileGeo(tile), g = new THREE.Group();
  const gl = new THREE.Mesh(geo.glow, glow); gl.layers.enable(BLOOM);
  g.add(new THREE.Mesh(geo.lit, lit), gl);
  if (geo.water.attributes.position.count) { const wm = new THREE.Mesh(geo.water, live ? waterMat : waterGhost); wm.layers.enable(BLOOM); g.add(wm); }
  g.userData.rotors = []; g.userData.bolts = []; g.userData.drones = [];
  let carIdx = 0;
  for (const a of geo.anims) {
    if (a.type === 'rotor') {
      const pivot = new THREE.Group(); pivot.position.set(a.x, a.y, a.z);
      if (a.axis === 'y') pivot.rotation.z = Math.PI / 2; else pivot.rotation.y = -a.a;
      const rotor = new THREE.Mesh(rotorGeo, lit); rotor.userData.speed = a.speed; rotor.rotation.x = Math.random() * 6; rotor.scale.setScalar(a.scale || 1);
      pivot.add(rotor); g.add(pivot); g.userData.rotors.push(rotor);
    } else if (a.type === 'bolt') {
      const m = makeBolt(a, boltMat(a.color)); g.add(m); g.userData.bolts.push(m);
    } else if (a.type === 'drone') {
      const dg = droneGeos[a.color] || (droneGeos[a.color] = buildDroneGeometry(a.color));
      const dm = new THREE.Group(); const dgl = new THREE.Mesh(dg.glow, glow); dgl.layers.enable(BLOOM); dm.add(new THREE.Mesh(dg.lit, lit), dgl);
      dm.position.set(a.x + a.r, a.y, a.z); g.add(dm); g.userData.drones.push({ mesh: dm, a, ph: Math.random() * 6.28 });
    } else if (geo.routes && geo.routes.length) {
      const ri = (carIdx + (a.type === 'train' ? 0 : 1)) % geo.routes.length, route = geo.routes[ri], L = route.L, mesh = makeVehicleMesh(a.type, a.color, lit, glow);
      const v = { type: a.type, mesh, route: ri, dir: a.dir, speed: a.type === 'train' ? 1.5 : 0.75, s: a.type === 'train' ? L * 0.5 : L * (0.3 + 0.4 * (carIdx++ % 2)), wait: 0 };
      placeVehicle(v, route); g.add(mesh);
      if (live) { v.tileKey = null; g.userData.vehicles = g.userData.vehicles || []; g.userData.vehicles.push(v); }
    }
  }
  return g;
}

// ---------- regras ----------
function evalPlacement(q, r, tile, rot) {
  let matches = 0, neighbors = 0, legal = true;
  const matchedTypes = [], sides = [], types = [];
  for (let i = 0; i < 6; i++) {
    const nb = S.tiles.get(key(q + DIRS[i][0], r + DIRS[i][1]));
    types.push(edgeAt(tile, rot, i));
    if (!nb) { sides.push(0); continue; }
    neighbors++;
    const mine = edgeAt(tile, rot, i), theirs = edgeAt(nb.tile, nb.rot, opp(i));
    if (compatible(mine, theirs)) { matches++; matchedTypes.push(mine); sides.push(1); }
    else if (isConnector(mine) || isConnector(theirs)) { legal = false; sides.push(-1); }
    else sides.push(2);
  }
  return { legal, matches, neighbors, matchedTypes, sides, types, perfect: neighbors === 6 && matches === 6 };
}
// casas ligadas a `startKey` pelo grupo (região ou rede de conectores)
function regionKeys(startKey, group) {
  const seen = new Set([startKey]), stack = [startKey];
  while (stack.length) {
    const k = stack.pop(), t = S.tiles.get(k); if (!t) continue;
    for (let i = 0; i < 6; i++) {
      if (groupOf(edgeAt(t.tile, t.rot, i)) !== group) continue;
      const nk = key(t.q + DIRS[i][0], t.r + DIRS[i][1]), nb = S.tiles.get(nk);
      if (!nb || seen.has(nk)) continue;
      if (groupOf(edgeAt(nb.tile, nb.rot, opp(i))) !== group) continue;
      seen.add(nk); stack.push(nk);
    }
  }
  return seen;
}
// a formação ainda tem alguma borda do grupo dando para uma casa vazia? (senão, não pode mais crescer)
function regionOpen(keys, group) {
  for (const k of keys) {
    const t = S.tiles.get(k);
    for (let i = 0; i < 6; i++) if (groupOf(edgeAt(t.tile, t.rot, i)) === group && !S.tiles.has(key(t.q + DIRS[i][0], t.r + DIRS[i][1]))) return true;
  }
  return false;
}
function bestPlacement(tile, cells) {
  let best = null;
  for (const cell of cells || S.slots.values()) {
    for (let rot = 0; rot < 6; rot++) {
      const ev = evalPlacement(cell.q, cell.r, tile, rot);
      if (!ev.legal) continue;
      const score = ev.matches * 10 + (ev.perfect ? 60 : 0) + (ev.matches === ev.neighbors ? 3 : 0) + S.rng.float();
      if (!best || score > best.score) best = { q: cell.q, r: cell.r, rot, score, ev };
    }
  }
  return best;
}

// ---------- tabuleiro ----------
function addTile(q, r, tile, rot, animate, ev) {
  const group = makeTileGroup(tile, litMat, glowMat, true);
  const w = toWorld(q, r), k = key(q, r);
  group.position.set(w.x, animate ? ghostGroup.position.y : 0, w.z);
  group.rotation.y = (-rot * Math.PI) / 3;
  boardGroup.add(group);
  S.tiles.set(k, { q, r, tile, rot, group });
  S.tileList = [...S.tiles.values()];
  for (const v of group.userData.vehicles || []) { v.tileKey = k; vehicles.push(v); }
  if (animate) anims.push({ obj: group, prop: 'drop', t: 0, dur: 0.46, y0: ghostGroup.position.y, w, ev, impact: false });
}
function removeTile(k) {
  const t = S.tiles.get(k); if (!t) return null;
  boardGroup.remove(t.group); S.tiles.delete(k); S.tileList = [...S.tiles.values()];
  for (let i = vehicles.length - 1; i >= 0; i--) if (vehicles[i].tileKey === k) vehicles.splice(i, 1);
  return t;
}
function refreshSlots() {
  const wanted = new Map();
  for (const t of S.tiles.values())
    for (const d of DIRS) { const q = t.q + d[0], r = t.r + d[1], k = key(q, r); if (!S.tiles.has(k) && !wanted.has(k)) wanted.set(k, { q, r }); }
  for (const [k, s] of S.slots) if (!wanted.has(k)) { slotGroup.remove(s.mesh); S.slots.delete(k); }
  for (const [k, c] of wanted) if (!S.slots.has(k)) {
    const m = new THREE.Mesh(ringGeo, ringMat), w = toWorld(c.q, c.r);
    m.position.set(w.x, TILE_H + 0.006, w.z);
    slotGroup.add(m); S.slots.set(k, { q: c.q, r: c.r, mesh: m });
  }
  if (S.selected && !S.slots.has(key(S.selected.q, S.selected.r))) S.selected = null;
}
function clearBoard() {
  for (const t of S.tiles.values()) boardGroup.remove(t.group);
  for (const s of S.slots.values()) slotGroup.remove(s.mesh);
  for (const p of particles) fxGroup.remove(p.m);
  S.tiles.clear(); S.slots.clear(); S.tileList = []; vehicles.length = 0; particles.length = 0; anims.length = 0; fx.sides = 0; hoverFx.k = 0; hoverFx.target = 0;
  ghostGroup.clear(); ghostShadow.visible = false; seamGhost.group.visible = false; seamPlaced.group.visible = false; seamPlaced.seal = -1; ghostAnim = null;
  hideFormation(); releaseHi(hiSealed); formation.seal = -1;
  for (const p of ringPulses) p.parent.remove(p.m); ringPulses.length = 0;
  stackRoot.clear(); curRoot.clear(); curTileGroup = null; stackTopGroup = null; uiAnims.length = 0;
  S.selected = null; S.undo = null; S.pendingGain = 0; $('qlabels').innerHTML = ''; document.querySelectorAll('.flyhex').forEach((e) => e.remove());
}

// ---------- peça atual / fantasma ----------
function setGhost(tile) {
  ghostGroup.clear();
  if (!tile) { ghostGroup.visible = false; ghostShadow.visible = false; hideFormation(); return; }
  ghostGroup.add(makeTileGroup(tile, ghostLit, ghostGlow, false), ghostHi);
  updateGhost();
}
function updateGhost() {
  ghostRotTarget = (-S.rot * Math.PI) / 3;
  if (curTileGroup) curTileGroup.userData.rotTarget = ghostRotTarget;
  const op = S.ghostSolid ? 1 : 0.5;
  ghostLit.opacity = op; ghostGlow.opacity = op; waterGhost.uniforms.opacity.value = op;
  hoverFx.target = 0;
  const bp = $('btn-place');
  if (!S.selected || !S.current) { ghostGroup.visible = false; ghostShadow.visible = false; seamGhost.group.visible = false; hideFormation(); setSlotMaterials(); bp.disabled = true; bp.innerHTML = 'Colocar'; return; }
  const w = toWorld(S.selected.q, S.selected.r);
  if (!ghostGroup.visible) { ghostPos.x.v = w.x; ghostPos.z.v = w.z; ghostPos.x.vel = 0; ghostPos.z.vel = 0; ghostGroup.position.set(w.x, 0.24, w.z); }
  ghostShadow.position.set(w.x, TILE_H + 0.009, w.z);
  seamGhost.group.position.set(w.x, 0, w.z);
  ghostGroup.visible = true; ghostShadow.visible = true;
  const ev = evalPlacement(S.selected.q, S.selected.r, S.current, S.rot);
  setSeamStates(seamGhost, ev); seamGhost.boost = ev.perfect ? 0.6 : 0;
  if (ev.legal && ev.matches) showFormation(S.selected.q, S.selected.r, ev); else hideFormation();
  hoverFx.cols = !ev.legal ? ['#ff3b5c'] : ev.sides.map((st, i) => (st === 1 ? hexCss(EDGE_COLORS[ev.types[i]] || 0xffffff) : null)).filter(Boolean);
  hoverFx.target = hoverFx.cols.length ? (!ev.legal ? 0.5 : ev.perfect ? 1.0 : 0.5 + 0.1 * ev.matches) : 0;
  if (ghostPos.x.target !== w.x || ghostPos.z.target !== w.z) { ghostPos.x.target = w.x; ghostPos.z.target = w.z; ghostPos.arc = 1; }
  const tint = ev.legal ? 0xffffff : 0xff7f92;
  ghostLit.color.setHex(tint); ghostGlow.color.setHex(tint);
  setSlotMaterials(ev);
  bp.disabled = !ev.legal;
  bp.innerHTML = ev.legal ? (ev.perfect ? `Colocar <b>+${ev.matches * 10 + 60}</b> ★` : ev.matches ? `Colocar <b>+${ev.matches * 10}</b>` : 'Colocar <b>+0</b>') : `${icon('x', 16)} Bloqueado`;
  bp.classList.toggle('perfect', ev.legal && ev.perfect);
}
function setSlotMaterials(ev) {
  for (const [k, s] of S.slots) {
    if (S.selected && k === key(S.selected.q, S.selected.r) && ev)
      s.mesh.material = !ev.legal ? ringSel.bad : ev.matches === ev.neighbors ? ringSel.ok : ev.matches > 0 ? ringSel.partial : ringSel.none;
    else s.mesh.material = ringMat;
  }
}
function selectSlot(cell, silent) {
  if (!cell || S.over || !S.current) return;
  if (S.selected && S.selected.q === cell.q && S.selected.r === cell.r) return;
  S.selected = { q: cell.q, r: cell.r };
  S.ghostSolid = true;
  if (!silent) play('select');
  updateGhost();
}
function rotate(dir) {
  if (!S.current || S.over) return;
  S.rot = (S.rot + dir + 6) % 6;
  S.ghostSolid = true;
  play('rotate');
  updateGhost();
}
// Nova peça surge esmaecida numa casa vizinha da última colocada
function autoPreview(from) {
  if (!S.current) return;
  const cands = [];
  if (from) for (const d of DIRS) { const s = S.slots.get(key(from.q + d[0], from.r + d[1])); if (s) cands.push(s); }
  let b = cands.length ? bestPlacement(S.current, cands) : null;
  if (!b) b = bestPlacement(S.current);
  if (!b) return;
  S.selected = { q: b.q, r: b.r }; S.rot = b.rot; S.ghostSolid = false;
  updateGhost();
  ghostAnim = { t: -0.26 };
  ghostGroup.scale.setScalar(0.01);
  const w = toWorld(b.q, b.r);
  spawnBurst(w, ['#ffffff', '#ffd6ea'], 6, 0.6);
  play('appear');
}

// ---------- missões: nascem na peça que está no topo da pilha (o jogador vê chegando) ----------
function maybeAssignQuest() {
  const tile = S.stack[0]; if (!tile || tile.quest || S.placed < 2) return;
  S.sinceQuest++;
  const starving = S.quests.length === 0 && (S.sinceQuest >= 5 || S.stack.length <= 8);
  if (S.quests.length >= QUEST_CAP) return;
  if (!(S.rng.chance(0.26) || S.sinceQuest >= 7 || starving)) return;
  const q = makeQuest(S.rng, tile, buildingsOf(tile));
  if (!q) return;
  q.color = GROUP_INFO[q.group].color; tile.quest = q; tile._geo = null; tile._slab = null; tile._hi = null;
  if (q.kind === 'city') q.progress = buildingsOf(tile);
  S.sinceQuest = 0;
  banner(`${icon(questIcon(q), 22, q.color)} <b>Missão à vista</b>`, `${icon('tile', 13)} próxima peça · vale +${q.reward.tiles} ${icon('tile', 13)}`, 'quest', 3200);
}

// ---------- turno ----------
function drawNext(from, silentStack) {
  if (!silentStack) liftTopOfStack();
  S.current = S.stack.shift() || null;
  S.rot = 0;
  if (!S.current) { setGhost(null); refreshCurrentPreview(); rebuildStack(); updateHUD(); gameOver(); return; }
  maybeAssignQuest();
  setGhost(S.current); refreshCurrentPreview(); rebuildStack(0, true); updateHUD();
  ghostGroup.rotation.y = 0; if (curTileGroup) curTileGroup.rotation.y = 0;
  autoPreview(from);
  const q = S.current.quest;
  if (q) {
    if (!S.tips.has('quest')) { S.tips.add('quest'); banner(`${icon(questIcon(q), 22, q.color)} <b>Missão nesta peça</b>`, q.kind === 'city' ? `cidade com <b>exatamente ${q.target}</b> prédios a partir da bandeira` : `ligue <b>${q.target}</b> peças de ${GROUP_INFO[q.group].name} à bandeira`, 'quest', 5200); }
    else banner(`${icon(questIcon(q), 22, q.color)} <b>${q.kind === 'city' ? `${q.target} prédios` : `${q.target} × ${GROUP_INFO[q.group].name}`}</b>`, `+${q.reward.points} pts · +${q.reward.tiles} ${icon('tile', 13)}`, 'quest', 2600);
  } else if (S.current.conn && !S.tips.has('conn')) {
    S.tips.add('conn');
    banner(`${icon(groupOf(S.current.conn.type), 22)} <b>Conector</b>`, 'continua em outro igual ou fica aberto — nunca contra outro terreno', 'info', 4200);
  } else if (isTerminal(S.current) && !S.tips.has('end')) {
    S.tips.add('end');
    banner(`${icon(groupOf(S.current.conn.type), 22)} <b>Ponto final</b>`, `fecha uma linha aberta: +20 pts e +1 ${icon('tile', 13)}`, 'info', 4200);
  }
}
const ORD = ['', '', 'DUPLO', 'TRIPLO', 'QUÁDRUPLO', 'QUÍNTUPLO', 'SÊXTUPLO'];
function commitPlacement() {
  if (!S.current || !S.selected || S.over) return;
  const { q, r } = S.selected, tile = S.current, rot = S.rot;
  const ev = evalPlacement(q, r, tile, rot);
  if (!ev.legal) { play('bad'); toast('Conectores precisam continuar: esgoto com esgoto, trilho com trilho, rodovia com rodovia.'); return; }
  // instantâneo para o único "desfazer" permitido
  S.undo = { q, r, tile, rot, score: S.score, placed: S.placed, perfects: S.perfects, questsDone: S.questsDone, questsLost: S.questsLost, quests: S.quests.map((x) => ({ ...x })), gained: 0, sinceQuest: S.sinceQuest, lowWarned: S.lowWarned };
  addTile(q, r, tile, rot, true, ev);
  S.placed++;
  const w = toWorld(q, r);
  let pts = ev.matches * 10, gained = 0;
  if (ev.perfect) { pts += 60; S.perfects++; S.stack.push(genTile(S.rng)); gained++; }
  let closed = false;
  if (isTerminal(tile) && ev.sides[(tile.conn.exits[0] + rot) % 6] === 1) { pts += 20; S.stack.push(genTile(S.rng)); gained++; closed = true; } // fechou uma linha: sensação de "ponto final"
  S.score += pts;
  play('place', ev.matches);
  if (pts > 0) scoreSign(pts, ev.perfect ? 'perfect' : ev.matches >= 3 ? 'good' : ev.matches >= 2 ? 'ok' : '', ev.perfect ? 'encaixe perfeito!' : closed ? 'ponto final' : ev.matches >= 2 ? `encaixe ${ORD[ev.matches].toLowerCase()}` : '');
  spawnBurst(w, ev.matchedTypes.map((t) => TERRAIN[t].color), ev.perfect ? 34 : 4 + ev.matches * 3);
  if (ev.perfect) {
    play('perfect'); pulse(w, 0xffd166); confettiBurst(2);
    banner(`★ <b>ENCAIXE PERFEITO</b>`, `+${pts} pts · +1 ${icon('tile', 13)}`, 'perfect');
  } else if (ev.matches >= 3) {
    confettiBurst(ev.matches >= 4 ? 2 : 1); play('confetti');
  } else if (S.placed === 1 && !S.tips.has('first')) {
    S.tips.add('first');
    banner(ev.matches ? `<b>+${pts}</b>` : '<b>Nenhum lado casou</b>', ev.matches ? 'cada lado igual encostado vale +10' : 'gire a peça (⟲ ⟳) para alinhar terrenos iguais: +10 por lado', 'info', 3600);
  } else if (ev.matches === 0 && !S.tips.has('miss')) {
    S.tips.add('miss');
    banner('<b>Nenhum lado casou</b>', 'lados iguais encostados valem +10 cada', 'info', 3200);
  }
  if (closed) { pulse(w, GROUP_HEX[groupOf(tile.conn.type)]); banner(`${icon(groupOf(tile.conn.type), 22)} <b>Ponto final</b>`, `linha fechada · +20 pts · +1 ${icon('tile', 13)}`, 'good', 2600); }
  if (tile.quest) S.quests.push({ ...tile.quest, tileKey: key(q, r) });
  const fromRect = { x: (window.innerWidth / 2), y: window.innerHeight * 0.36 };
  gained += checkQuests();
  S.undo.gained = gained;
  S.selected = null; S.current = null;
  hideFormation(); sealFormation(q, r, ev);
  refreshSlots();
  if (S.score > S.best) { S.best = S.score; localStorage.setItem('pr_best', S.best); }
  drawNext({ q, r });
  if (gained) rewardTiles(gained, screenOf(w) || fromRect);
  if (S.tiles.size % 6 === 0) rig.flyTo(w.x, w.z);
  updateUndoButton();
}
// ponto da tela de uma posição do tabuleiro
function screenOf(w, y = 0.3) {
  const v = new THREE.Vector3(w.x, y, w.z).project(camera);
  if (v.z > 1) return null;
  return { x: ((v.x + 1) / 2) * window.innerWidth, y: ((1 - v.y) / 2) * window.innerHeight };
}
// Desfazer a última peça (uma única vez): a peça sobe de volta para a mão e tudo volta como estava
function undoLast() {
  const u = S.undo; if (!u || S.over || !S.started) return;
  const k = key(u.q, u.r), t = removeTile(k); if (!t) { S.undo = null; updateUndoButton(); return; }
  play('appear');
  const w = toWorld(u.q, u.r);
  spawnBurst(w, ['#ffffff', '#9ff5ff'], 10, 0.7);
  // a peça sobe girando e some (anima uma cópia) enquanto a mão recebe a peça de volta
  const ghostCopy = t.group; ghostCopy.position.y = 0; scene.add(ghostCopy);
  anims.push({ obj: ghostCopy, prop: 'undo', t: 0, dur: 0.4 });
  S.score = u.score; scoreShown = S.score; scoreRoll = null; $('score').textContent = S.score;
  S.placed = u.placed; S.perfects = u.perfects; S.questsDone = u.questsDone; S.questsLost = u.questsLost; S.sinceQuest = u.sinceQuest; S.lowWarned = u.lowWarned;
  S.quests = u.quests.map((x) => ({ ...x }));
  if (u.gained) S.stack.splice(S.stack.length - u.gained, u.gained);
  document.querySelectorAll('.flyhex').forEach((e) => e.remove()); S.pendingGain = 0;
  if (S.current) S.stack.unshift(S.current);
  S.current = u.tile; S.rot = u.rot;
  S.undo = null;
  refreshSlots();
  S.selected = { q: u.q, r: u.r }; S.ghostSolid = true;
  setGhost(S.current); refreshCurrentPreview(); rebuildStack(); renderQuests(); updateHUD(); updateGhost(); updateUndoButton();
  toast('Peça de volta na mão — só dá para desfazer a última jogada.', 2200);
}
function updateUndoButton() { const b = $('btn-undo'); b.disabled = !S.undo || S.over; }
// verifica progresso, conclusão e impossibilidade das missões ativas
function checkQuests() {
  const done = [], lost = []; let gained = 0;
  for (const qst of S.quests) {
    const keys = regionKeys(qst.tileKey, qst.group);
    const before = qst.progress;
    if (qst.kind === 'city') { let sum = 0; for (const k of keys) sum += buildingsOf(S.tiles.get(k).tile); qst.progress = sum; }
    else qst.progress = keys.size;
    if (qst.progress !== before) qst._bump = true;
    if (qst.progress === qst.target) done.push(qst);
    else if (qst.progress > qst.target || !regionOpen(keys, qst.group)) lost.push(qst); // passou do número, ou a formação ficou cercada: não tem mais como cumprir
  }
  for (const qst of done) {
    S.quests.splice(S.quests.indexOf(qst), 1);
    S.questsDone++;
    S.score += qst.reward.points;
    for (let i = 0; i < qst.reward.tiles; i++) S.stack.push(genTile(S.rng));
    gained += qst.reward.tiles;
    const t = S.tiles.get(qst.tileKey), w = toWorld(t.q, t.r);
    play('quest'); confettiBurst(2); kick(0.6, ['#c4ff2a', qst.color], 0.3);
    scoreSign(qst.reward.points, 'quest', `${icon(questIcon(qst), 16)} missão`);
    rewardBanner(qst);
    pulse(w, new THREE.Color(qst.color).getHex());
    spawnBurst(w, [qst.color, '#ffffff'], 40);
    if (qst._card) { qst._card.classList.add('done'); const c = qst._card; setTimeout(() => c.remove(), 900); qst._card = null; }
  }
  for (const qst of lost) {
    S.quests.splice(S.quests.indexOf(qst), 1);
    S.questsLost++;
    play('bad');
    banner(`${icon(questIcon(qst), 22, '#ff5c7a')} <b>Missão perdida</b>`, qst.kind === 'city' && qst.progress > qst.target ? `a cidade passou de ${qst.target} prédios` : 'a formação ficou cercada — sem recompensa', 'warn', 3200);
    if (qst._card) { qst._card.classList.add('lost'); const c = qst._card; setTimeout(() => c.remove(), 900); qst._card = null; }
    const t = S.tiles.get(qst.tileKey); if (t) spawnBurst(toWorld(t.q, t.r), ['#ff5c7a', '#55506a'], 14, 0.6);
  }
  renderQuests(done.length || lost.length ? 0 : 400);
  return gained;
}
function rewardBanner(q) {
  banner(`${icon('check', 20, '#c4ff2a')} <b>MISSÃO CUMPRIDA</b> ${icon(questIcon(q), 22, q.color)}`, `<b class="big">+${q.reward.tiles}</b> ${icon('tile', 18)} peças novas · +${q.reward.points} pts`, 'quest reward', 4200);
}
function gameOver() {
  if (S.over) return;
  S.over = true;
  play('over');
  updateUndoButton();
  $('end-score').textContent = S.score;
  $('end-best').textContent = S.best;
  $('end-stats').innerHTML = `<span>${icon('tile', 14)} ${S.tiles.size}</span><span>★ ${S.perfects}</span><span>${icon('flag', 14)} ${S.questsDone}</span>`;
  setTimeout(() => { showOverlay('overlay-end'); prepareRankForm(); }, 700);
}

// ---------- novo jogo / demonstração / menu ----------
function newGame(seed) {
  clearBoard();
  S.rng = new RNG(seed != null ? seed >>> 0 : (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  S.stack = makeStack(S.rng, STACK_SIZE);
  S.score = 0; S.placed = 0; S.perfects = 0; S.questsDone = 0; S.questsLost = 0; S.quests = []; S.over = false; S.started = true; S.tips.clear(); S.lowWarned = false; S.hints = HINTS_PER_GAME; S.sinceQuest = 0; S.pendingGain = 0; S.undo = null;
  updateHintButton(); updateUndoButton();
  addTile(0, 0, starterTile(S.rng), 0, false);
  refreshSlots();
  rig.target.set(0, 0, 0); rig.dist = isNarrow() ? 13 : 11; rig.autoOrbit = false; rig.azimuth = -0.9; rig.polar = 0.92;
  renderQuests();
  $('hud').classList.remove('hidden');
  $('banners').innerHTML = '';
  rebuildStack();
  stackShown = -1; updateHUD();
  drawNext({ q: 0, r: 0 });
  banner('<b>Lados iguais encostados = +10</b>', 'toque na casa (ou em Colocar) para fixar', 'info', 3800);
}
function demoBoard(n) {
  clearBoard();
  const rng = new RNG(1337 + (Date.now() % 1000));
  S.rng = rng; S.started = false; S.over = false; S.current = null; S.quests = [];
  addTile(0, 0, starterTile(rng), 0, false); refreshSlots();
  for (let i = 0; i < n; i++) {
    const tile = genTile(rng, { connChance: 0.45 });
    const b = bestPlacement(tile);
    if (!b) break;
    addTile(b.q, b.r, tile, b.rot, false); refreshSlots();
  }
  for (const s of S.slots.values()) slotGroup.remove(s.mesh);
  S.slots.clear();
  rig.autoOrbit = true; rig.dist = isNarrow() ? 16 : 13; rig.polar = 0.95;
}
function returnToMenu() {
  $('hud').classList.add('hidden'); $('banners').innerHTML = '';
  demoBoard(30);
  showOverlay('overlay-start');
}
const isNarrow = () => window.innerWidth < 720;

// ---------- efeitos 3D ----------
function addParticle(w, color, o) {
  const m = new THREE.Mesh(particleGeo, pmat(color));
  m.position.set(w.x, w.y, w.z); m.layers.enable(BLOOM);
  const s = o.size || 1; m.scale.setScalar(s);
  fxGroup.add(m);
  particles.push({ m, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g ?? 0, life: o.life || 1, t: 0, rs: o.rs ?? Math.random() * 6, base: s, wob: o.wob || 0, wf: o.wf || 2, ph: Math.random() * 6.28, mode: o.mode || 'burst' });
}
function spawnBurst(w, colors, n, power = 1) {
  for (let i = 0; i < n; i++) {
    const c = colors.length ? colors[i % colors.length] : '#ffffff', a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 2.2) * power;
    addParticle({ x: w.x, y: TILE_H + 0.1, z: w.z }, c, { vx: Math.cos(a) * sp, vy: (2 + Math.random() * 3) * power, vz: Math.sin(a) * sp, g: 9, life: 0.9 + Math.random() * 0.5 });
  }
}
// partículas ambientes por bioma (bolhas, faíscas, pólen, poeira das montanhas, vaga-lumes no baldio)
function spawnAmbient() {
  const list = S.tileList; if (!list.length) return;
  const t = list[(Math.random() * list.length) | 0], w = toWorld(t.q, t.r);
  if (Math.hypot(w.x - rig.target.x, w.z - rig.target.z) > rig.dist * 1.5) return;
  const rot = (t.rot * Math.PI) / 3, geo = t.tile._geo;
  const local = (x, z) => ({ x: w.x + x * Math.cos(rot) - z * Math.sin(rot), z: w.z + x * Math.sin(rot) + z * Math.cos(rot) });
  if (t.tile.conn && t.tile.conn.type === 'sewage' && geo && geo.routes && Math.random() < 0.6) {
    const route = geo.routes[(Math.random() * geo.routes.length) | 0], p = pointAt(route.pts, Math.random() * route.L), q = local(p.x + (Math.random() - 0.5) * 0.15, p.z + (Math.random() - 0.5) * 0.15);
    return addParticle({ x: q.x, y: TILE_H + 0.03, z: q.z }, Math.random() < 0.5 ? '#c4ff2a' : '#e4ff7a', { vy: 0.25, life: 1.4, size: 0.5 + Math.random() * 0.4, mode: 'rise', wob: 0.15, wf: 3 });
  }
  const i = (Math.random() * 6) | 0, g = t.tile.ground[i], a = edgeAngle(i), r = 0.25 + Math.random() * 0.5, s = (Math.random() - 0.5) * 0.3;
  const q = local(Math.cos(a) * r - Math.sin(a) * s, Math.sin(a) * r + Math.cos(a) * s);
  if (g === 'pool') addParticle({ x: q.x, y: TILE_H + 0.02, z: q.z }, '#e4ff7a', { vy: 0.22, life: 1.3, size: 0.5 + Math.random() * 0.5, mode: 'rise', wob: 0.1, wf: 3 });
  else if (g === 'cyber') addParticle({ x: q.x, y: TILE_H + 0.25 + Math.random() * 0.5, z: q.z }, NEON[(Math.random() * 5) | 0], { vy: 0.12, life: 1.6, size: 0.35, mode: 'twinkle', wob: 0.08, wf: 4 });
  else if (g === 'solar') addParticle({ x: q.x, y: TILE_H + 0.15 + Math.random() * 0.35, z: q.z }, Math.random() < 0.5 ? '#fff4b0' : '#ffffff', { vy: 0.07, life: 2.6, size: 0.3, mode: 'twinkle', wob: 0.25, wf: 1.5 });
  else if (g === 'rock') addParticle({ x: q.x, y: TILE_H + 0.03, z: q.z }, Math.random() < 0.6 ? '#d9a066' : '#ffb347', { vy: 0.16, life: 1.8, size: 0.5 + Math.random() * 0.4, mode: 'rise', wob: 0.2, wf: 1.2 });
  else if (g === 'grass') { if (Math.random() < 0.3) addParticle({ x: q.x, y: TILE_H + 0.08 + Math.random() * 0.2, z: q.z }, '#e4ff7a', { vy: 0.05, life: 2.4, size: 0.25, mode: 'twinkle', wob: 0.2, wf: 1.8 }); }
  else if (Math.random() < 0.35) addParticle({ x: q.x, y: TILE_H + 0.04, z: q.z }, Math.random() < 0.6 ? '#bff3ff' : '#ffffff', { vy: 0.1, life: 1.8, size: 0.28, mode: 'twinkle', wob: 0.15, wf: 2 });
}
function pulse(w, hex) {
  const m = new THREE.Mesh(discGeo, new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.7, depthWrite: false }));
  m.position.set(w.x, TILE_H + 0.02, w.z); m.layers.enable(BLOOM);
  fxGroup.add(m);
  anims.push({ obj: m, prop: 'pulse', from: 1, to: 2.6, t: 0, dur: 0.7 });
}
// veículos percorrem a rede de trilhos/rodovias entre peças; em bifurcações escolhem um ramo; em pontos finais param e voltam
function updateVehicles(dt) {
  for (const v of vehicles) {
    const t = S.tiles.get(v.tileKey); if (!t) continue;
    const routes = t.tile._geo.routes; if (!routes || !routes[v.route]) continue;
    let route = routes[v.route], L = route.L;
    if (v.wait > 0) { v.wait -= dt; continue; }
    v.s += v.dir * v.speed * dt;
    if (v.s > L || v.s < 0) {
      const localExit = v.dir > 0 ? route.to : route.from;
      let moved = false;
      if (localExit >= 0) {
        const worldEdge = (localExit + t.rot) % 6, nk = key(t.q + DIRS[worldEdge][0], t.r + DIRS[worldEdge][1]), nb = S.tiles.get(nk);
        if (nb && nb.tile.conn && nb.tile.conn.type === v.type) {
          const le = (((opp(worldEdge) - nb.rot) % 6) + 6) % 6, nr = tileGeo(nb.tile).routes || [];
          const cands = []; nr.forEach((r, i) => { if (r.from === le || r.to === le) cands.push(i); });
          if (cands.length) {
            const ri = cands[(Math.random() * cands.length) | 0], r2 = nr[ri], over = v.dir > 0 ? v.s - L : -v.s;
            if (r2.from === le) { v.dir = 1; v.s = Math.min(over, r2.L); } else { v.dir = -1; v.s = Math.max(r2.L - over, 0); }
            v.route = ri; v.tileKey = nk; nb.group.add(v.mesh); moved = true; route = r2;
          }
        }
      }
      if (!moved) { v.dir *= -1; v.s = Math.max(0, Math.min(L, v.s)); if (localExit < 0) v.wait = 1.2 + Math.random() * 1.5; } // parou no terminal: pausa e volta
    }
    placeVehicle(v, route);
  }
}

// ---------- overlay 2D: flashes laterais (à la rainbow-pong) + confete ----------
const cfx = $('confetti'), cctx = cfx.getContext('2d'), confetti = [];
const hexCss = (h) => '#' + h.toString(16).padStart(6, '0');
const fx = { sides: 0, sidesDur: 1, cols: [], force: 1 };
const hoverFx = { cols: [], k: 0, target: 0 };
const FLASH_BANDS = [[6, 0.5], [16, 0.22], [34, 0.09]];
function kick(dur, cols, force = 1) { fx.sides = fx.sidesDur = dur; fx.cols = cols.length ? cols : ['#ffffff']; fx.force = force; }
function drawSideBands(ctx, W, Hh, cols, k, t, cascade, scrollSpeed) {
  const n = cols.length, seg = Hh / n, ciclo = seg * n, desl = n > 1 ? (t * scrollSpeed) % ciclo : 0;
  const suave = Hh * 0.16, frente = cascade < 1 ? -suave + cascade * (Hh + suave) : Hh + suave;
  const revelado = (y) => Math.max(0, Math.min(1, (frente - y) / suave));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let edge = 0;
  for (const [thick, alpha] of FLASH_BANDS) {
    for (let sIdx = -1; sIdx <= n; sIdx++) {
      const cor = cols[((sIdx % n) + n) % n], y = sIdx * seg + desl, vem = revelado(y + seg / 2);
      if (vem <= 0) continue;
      ctx.globalAlpha = Math.min(1, k * alpha * vem); ctx.fillStyle = cor;
      ctx.fillRect(edge, y, thick, seg + 1); ctx.fillRect(W - edge - thick, y, thick, seg + 1);
    }
    edge += thick;
  }
  ctx.restore();
}
function updateOverlay(dt, now) {
  const t = now * 0.001, dpr = Math.min(devicePixelRatio || 1, 2), W = cfx.width, Hh = cfx.height;
  if (fx.sides > 0) fx.sides = Math.max(0, fx.sides - dt);
  hoverFx.k += (hoverFx.target - hoverFx.k) * Math.min(1, dt * 6);
  const hasFx = fx.sides > 0 || hoverFx.k > 0.01 || confetti.length > 0;
  if (!hasFx) { if (cfx._dirty) { cctx.clearRect(0, 0, W, Hh); cfx._dirty = false; } return; }
  cctx.clearRect(0, 0, W, Hh); cfx._dirty = true;
  cctx.save(); cctx.scale(dpr, dpr);
  const w = W / dpr, h = Hh / dpr;
  if (hoverFx.k > 0.01 && hoverFx.cols.length) {
    const k = hoverFx.k * (0.12 + 0.05 * Math.sin(t * 6) + 0.02 * Math.abs(Math.sin(t * 19)));
    drawSideBands(cctx, w, h, hoverFx.cols, k, t, 1, 90);
  }
  if (fx.sides > 0) {
    const prog = 1 - fx.sides / fx.sidesDur;
    const k = (fx.sides / fx.sidesDur) * fx.force * (0.9 + 0.1 * Math.sin(t * 40));
    drawSideBands(cctx, w, h, fx.cols, k, t, Math.min(1, prog * 1.5), 260);
  }
  cctx.restore();
  for (let i = confetti.length - 1; i >= 0; i--) {
    const p = confetti[i]; p.t += dt;
    p.vy += 900 * dt; p.vx *= 1 - 1.4 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.t >= p.life || p.y > innerHeight + 30) { confetti.splice(i, 1); continue; }
    cctx.save(); cctx.globalAlpha = Math.min(1, (p.life - p.t) / 0.5); cctx.translate(p.x * dpr, p.y * dpr); cctx.rotate(p.rot); cctx.scale(dpr, dpr);
    cctx.fillStyle = p.c; cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.4 + 0.6 * Math.abs(Math.cos(p.t * 9 + p.rot)))); cctx.restore();
  }
}
function confettiBurst(strength = 1) {
  const W = innerWidth, H = innerHeight, n = 40 * strength;
  for (const side of [0, 1]) for (let i = 0; i < n; i++) {
    const dir = side ? -1 : 1;
    confetti.push({ x: side ? W + 8 : -8, y: H * (0.3 + Math.random() * 0.35), vx: dir * (260 + Math.random() * 520), vy: -(250 + Math.random() * 450), rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14,
      w: 5 + Math.random() * 6, h: 9 + Math.random() * 8, c: NEON[(Math.random() * NEON.length) | 0], t: 0, life: 2 + Math.random() * 1.2 });
  }
}

// ---------- HUD, banners, rótulos ----------
// Letreiro neon animado com os pontos: letras pulam uma a uma, o letreiro voa até o placar e o número rola
let scoreShown = 0, scoreRoll = null;
function scoreSign(pts, cls = '', sub = '') {
  const el = document.createElement('div');
  el.className = `sign ${cls}`;
  const chars = `+${pts}`.split('');
  el.innerHTML = chars.map((c, i) => `<span style="--i:${i}">${c}</span>`).join('') + `<small style="--i:${chars.length}">${sub || (pts >= 60 ? 'incrível!' : pts >= 30 ? 'ótimo!' : 'pontos')}</small>`;
  $('signs').appendChild(el);
  const target = $('score').getBoundingClientRect(), start = () => el.getBoundingClientRect();
  setTimeout(() => {
    const r = start(), dx = target.left + target.width / 2 - (r.left + r.width / 2), dy = target.top + target.height / 2 - (r.top + r.height / 2);
    el.animate([{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.25)`, opacity: 0.2 }], { duration: 520, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' })
      .onfinish = () => { el.remove(); const sb = $('score-box'); sb.classList.remove('pulse'); void sb.offsetWidth; sb.classList.add('pulse'); scoreRoll = { from: scoreShown, to: S.score, t: 0 }; };
  }, 950 + Math.min(600, chars.length * 70));
}
function rollScore(dt) {
  if (scoreRoll) { scoreRoll.t += dt; const p = Math.min(1, scoreRoll.t / 0.55), e = 1 - Math.pow(1 - p, 3); scoreShown = Math.round(scoreRoll.from + (scoreRoll.to - scoreRoll.from) * e); $('score').textContent = scoreShown; if (p >= 1) scoreRoll = null; }
  else if (scoreShown !== S.score && !document.querySelector('#signs .sign')) { scoreShown = S.score; $('score').textContent = scoreShown; }
}
let toastTimer = null;
function toast(msg, ms = 2600) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function banner(title, sub, cls = '', ms = 3000) {
  const box = $('banners');
  while (box.children.length >= 2) box.firstChild.remove();
  const el = document.createElement('div');
  el.className = 'banner ' + cls.split(' ').filter(Boolean).map((c) => 'bn-' + c).join(' ');
  el.innerHTML = `<div class="bt">${title}</div>${sub ? `<span>${sub}</span>` : ''}`;
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, ms);
}
// Peças novas voam (em arco, acelerando) até o contador da pilha; cada chegada faz o número pular e a pilha 3D receber a lâmina
function rewardTiles(n, from) {
  const target = $('stack-count').getBoundingClientRect(), tx = target.left + target.width / 2, ty = target.top + target.height / 2;
  S.pendingGain += n; updateHUD();
  for (let i = 0; i < n; i++) {
    const el = document.createElement('div'); el.className = 'flyhex'; el.innerHTML = icon('tile', 30, '#c4ff2a');
    el.style.left = `${from.x}px`; el.style.top = `${from.y}px`; document.body.appendChild(el);
    const dx = tx - from.x, dy = ty - from.y, up = -Math.min(220, 90 + Math.abs(dy) * 0.35) - i * 12;
    const delay = 650 + i * 140;
    el.animate([
      { transform: 'translate(-50%,-50%) scale(0.2) rotate(-40deg)', opacity: 0, offset: 0 },
      { transform: `translate(-50%,-50%) scale(1.25) rotate(0deg)`, opacity: 1, offset: 0.18 },
      { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${up}px)) scale(1.1) rotate(120deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.45) rotate(300deg)`, opacity: 0.9, offset: 1 },
    ], { duration: 900, delay, easing: 'cubic-bezier(0.4, 0, 0.9, 0.5)', fill: 'forwards' }).onfinish = () => {
      el.remove();
      if (S.pendingGain > 0) S.pendingGain--;
      if (i === 0) rebuildStack(Math.min(n, STACK_SHOW), false);
      updateHUD(true); play('appear');
    };
  }
}
function renderQuests(delayMs = 0) {
  const el = $('quests'), lab = $('qlabels');
  const build = () => {
    el.innerHTML = ''; lab.innerHTML = '';
    for (const q of S.quests) {
      const info = GROUP_INFO[q.group], left = questLeft(q), pct = Math.max(0, Math.min(1, q.progress / q.target)), ic = questIcon(q);
      const d = document.createElement('div'); d.className = 'quest' + (q._open ? ' open' : ''); d.style.setProperty('--qc', q.color || info.color);
      const R = 17, C = 2 * Math.PI * R;
      d.innerHTML = `<div class="qhead">
          <span class="qicon"><svg class="qring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="${R}"/><circle cx="20" cy="20" r="${R}" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - pct)}"/></svg>${icon(ic, 20)}</span>
          <span class="qleft${q._bump ? ' bump' : ''}">${left}</span>
          <span class="qrew">+${q.reward.tiles}${icon('tile', 11)}</span>
        </div>
        <div class="qbody">
          <p>${q.kind === 'city' ? `Cidade com <b>exatamente ${q.target}</b> prédios ligada à bandeira — tem <b>${q.progress}</b>, faltam <b>${left}</b>.` : `Ligue <b>${q.target}</b> peças de <b>${info.name}</b> à bandeira — já são <b>${q.progress}</b>, faltam <b>${left}</b>.`}</p>
          <p class="qr">Recompensa: <b>+${q.reward.points}</b> pts · <b>+${q.reward.tiles}</b> peças${q.kind === 'city' ? ' · passar do número cancela a missão' : ''}</p>
          <button class="qgo" type="button">${icon('pin', 14)} ir até a bandeira</button>
        </div>`;
      q._bump = false;
      d.addEventListener('click', (e) => {
        if (e.target.closest('.qgo')) { const t = S.tiles.get(q.tileKey); if (t) { const w = toWorld(t.q, t.r); rig.flyTo(w.x, w.z); pulse(w, new THREE.Color(q.color).getHex()); } return; }
        const open = !d.classList.contains('open');
        for (const o of S.quests) o._open = false; el.querySelectorAll('.quest.open').forEach((x) => x.classList.remove('open'));
        q._open = open; d.classList.toggle('open', open);
      });
      q._card = d; el.appendChild(d);
      const l = document.createElement('div'); l.className = 'qlabel'; l.style.setProperty('--qc', q.color || info.color);
      l.innerHTML = `${icon(ic, 16)}<b>${left}</b>`;
      q._label = l; lab.appendChild(l);
    }
    $('quests-title').classList.toggle('hidden', S.quests.length === 0);
  };
  if (delayMs) setTimeout(build, delayMs); else build();
}
function updateQuestLabels() {
  for (const q of S.quests) {
    const t = S.tiles.get(q.tileKey), l = q._label; if (!t || !l) continue;
    const w = toWorld(t.q, t.r), v = new THREE.Vector3(w.x, 0.95, w.z).project(camera);
    const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    l.style.display = vis ? '' : 'none';
    if (vis) { l.style.left = `${((v.x + 1) / 2) * innerWidth}px`; l.style.top = `${((1 - v.y) / 2) * innerHeight}px`; }
  }
}
// contador da pilha: número grande no topo; ao mudar, o dígito antigo sai por cima e o novo entra por baixo com quique
let stackShown = -1;
function setStackCount(n, animate) {
  const el = $('stack-count'), num = el.querySelector('.num');
  if (stackShown === n) return;
  const dir = n > stackShown ? 1 : -1, prev = stackShown; stackShown = n;
  if (!animate || prev < 0) { num.innerHTML = `<span>${n}</span>`; return; }
  num.innerHTML = `<span class="out ${dir > 0 ? 'up' : 'down'}">${prev}</span><span class="in ${dir > 0 ? 'up' : 'down'}">${n}</span>`;
  el.classList.remove('bump', 'bump-up'); void el.offsetWidth; el.classList.add(dir > 0 ? 'bump-up' : 'bump');
  setTimeout(() => { if (stackShown === n) num.innerHTML = `<span>${n}</span>`; }, 520);
}
function updateHUD(animateCount = true) {
  if (!S.started || S.score === 0) { scoreShown = S.score; $('score').textContent = S.score; }
  const total = S.stack.length + (S.current ? 1 : 0), shown = Math.max(0, total - S.pendingGain);
  setStackCount(shown, animateCount);
  $('best').textContent = S.best;
  const low = S.started && !S.over && total <= 5;
  $('stack-area').classList.toggle('low', low);
  if (low && !S.lowWarned) { S.lowWarned = true; play('warn'); banner(`<b>ÚLTIMAS ${total} PEÇAS</b>`, `missões ${icon('flag', 12)} e encaixes perfeitos ★ dão peças novas`, 'warn', 4200); }
  if (total > 5) S.lowWarned = false;
}
function showOverlay(id) { document.querySelectorAll('.overlay').forEach((o) => o.classList.add('hidden')); if (id) $(id).classList.remove('hidden'); }
function syncMenuToggles() {
  $('tg-bloom').textContent = `Brilho neon: ${prefs.bloom ? 'ligado' : 'desligado'}`;
  $('tg-sound').textContent = `Som: ${isMuted() ? 'desligado' : 'ligado'}`;
  $('tg-lens').textContent = `Efeito de lente: ${prefs.lens ? 'ligado' : 'desligado'}`;
  $('tg-grain').textContent = `Granulação: ${prefs.grain ? 'ligada' : 'desligada'}`;
  $('grain').classList.toggle('hidden', !prefs.grain);
}

// ---------- ranking online (nome salvo no navegador; servidor guarda a lista) ----------
const RANK_API = 'api/scores';
let rankSubmitted = false;
function prepareRankForm() {
  rankSubmitted = false;
  const inp = $('rank-name'); inp.value = localStorage.getItem('pr_name') || ''; inp.disabled = false;
  $('rank-submit').disabled = false; $('rank-status').textContent = ''; $('rank-list').innerHTML = '';
  $('rank-form').classList.remove('hidden');
  setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) { /* teclado no celular */ } }, 60);
}
function renderRankList(ol, rows, meName, meRank) {
  ol.innerHTML = '';
  if (!rows.length) { ol.innerHTML = '<li class="empty">ainda ninguém — seja o primeiro</li>'; return; }
  rows.forEach((r, i) => {
    const li = document.createElement('li');
    const pos = r.rank || i + 1;
    if (meRank && pos === meRank && r.name === meName) li.className = 'me';
    li.innerHTML = `<span class="pos">${pos <= 3 ? ['🥇', '🥈', '🥉'][pos - 1] : pos}</span><span class="nm"></span><span class="sc">${r.score}</span><span class="tl">${icon('tile', 11)} ${r.tiles ?? '–'}</span>`;
    li.querySelector('.nm').textContent = r.name;
    ol.appendChild(li);
  });
}
async function submitScore(e) {
  if (e) e.preventDefault();
  if (rankSubmitted) return;
  const name = $('rank-name').value.trim().slice(0, 16);
  if (!name) { $('rank-name').focus(); return; }
  localStorage.setItem('pr_name', name);
  rankSubmitted = true; $('rank-submit').disabled = true; $('rank-name').disabled = true; $('rank-status').textContent = 'enviando…';
  try {
    const res = await fetch(RANK_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, score: S.score, tiles: S.tiles.size, perfects: S.perfects, quests: S.questsDone }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    $('rank-status').innerHTML = `${icon('trophy', 16, '#ffe93a')} você ficou em <b>${data.rank}º</b> de ${data.total}`;
    renderRankList($('rank-list'), data.top, name, data.rank);
  } catch (err) {
    $('rank-status').textContent = 'ranking indisponível agora — seu recorde ficou salvo neste navegador';
    rankSubmitted = false; $('rank-submit').disabled = false; $('rank-name').disabled = false;
  }
}
async function openRanking() {
  showOverlay('overlay-rank');
  const ol = $('rank-list-all'); ol.innerHTML = '<li class="empty">carregando…</li>';
  try {
    const res = await fetch(`${RANK_API}?limit=30`); if (!res.ok) throw new Error();
    const data = await res.json();
    renderRankList(ol, data.top, localStorage.getItem('pr_name') || '', 0);
    $('rank-total').textContent = data.total ? `${data.total} partidas registradas` : '';
  } catch (err) { ol.innerHTML = '<li class="empty">ranking indisponível (servidor offline)</li>'; }
}

// ---------- entrada ----------
const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TILE_H), hitPoint = new THREE.Vector3(), ndc = new THREE.Vector2();
function cellAt(x, y) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(plane, hitPoint)) return null;
  const c = fromWorld(hitPoint.x, hitPoint.z);
  return S.slots.has(key(c.q, c.r)) ? c : null;
}
attachInput(canvas, rig, {
  onHover(x, y) { const c = cellAt(x, y); if (c) selectSlot(c, true); },
  onTap(x, y) {
    if (!S.started || S.over) return;
    const c = cellAt(x, y);
    if (!c) return;
    if (S.selected && S.selected.q === c.q && S.selected.r === c.r) commitPlacement();
    else selectSlot(c);
  },
  onRotate(dir) { rotate(dir); },
  onWheel(e) {
    if (e.ctrlKey || e.metaKey || e.shiftKey || !S.started || S.over || !S.current) { rig.zoom(Math.exp(e.deltaY * 0.0012)); return; }
    if (Math.abs(e.deltaY) >= 50) { wheelAcc = 0; rotate(e.deltaY > 0 ? 1 : -1); return; }
    wheelAcc += e.deltaY;
    while (wheelAcc >= 60) { wheelAcc -= 60; rotate(1); }
    while (wheelAcc <= -60) { wheelAcc += 60; rotate(-1); }
  },
});
let wheelAcc = 0;
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  if (k === 'r' || k === 'e') rotate(1);
  else if (k === 'q') rotate(-1);
  else if (k === ' ' || k === 'enter') { e.preventDefault(); commitPlacement(); }
  else if (k === 'h') hint();
  else if (k === 'z' || k === 'u' || k === 'backspace') { e.preventDefault(); undoLast(); }
  else if (k === 'arrowleft' || k === 'a') rig.pan(-40, 0);
  else if (k === 'arrowright' || k === 'd') rig.pan(40, 0);
  else if (k === 'arrowup' || k === 'w') rig.pan(0, -40);
  else if (k === 'arrowdown' || k === 's') rig.pan(0, 40);
  else if (k === '+' || k === '=') rig.zoom(0.85);
  else if (k === '-') rig.zoom(1.18);
  else if (k === 'escape') { const open = [...document.querySelectorAll('.overlay')].some((o) => !o.classList.contains('hidden')); if (open) showOverlay(null); else if (S.started) { syncMenuToggles(); showOverlay('overlay-menu'); } }
});
// Move a peça atual para o melhor encaixe (usado pela dica e pela demonstração automática)
function applyBest() {
  if (!S.current || S.over) return false;
  const b = bestPlacement(S.current);
  if (!b) return false;
  S.rot = b.rot; S.selected = { q: b.q, r: b.r }; S.ghostSolid = true;
  updateGhost();
  const w = toWorld(b.q, b.r); rig.flyTo(w.x, w.z);
  return true;
}
function hint() {
  if (!S.current || S.over) return;
  if (S.hints <= 0) { play('bad'); toast('Suas 5 dicas desta partida acabaram.'); return; }
  if (!applyBest()) return;
  S.hints--; play('select'); updateHintButton();
  if (S.hints === 0) toast('Última dica usada — agora é com você!');
}
function updateHintButton() {
  const b = $('btn-hint');
  b.innerHTML = `${icon('bulb', 18)}<b>${S.hints}</b>`;
  b.disabled = S.hints <= 0;
}

$('rot-l').addEventListener('click', () => rotate(-1));
$('current-area').addEventListener('click', () => rotate(1));
$('current-area').addEventListener('wheel', (e) => { e.preventDefault(); rotate(e.deltaY > 0 ? 1 : -1); }, { passive: false });
$('rot-r').addEventListener('click', () => rotate(1));
$('btn-place').addEventListener('click', commitPlacement);
$('btn-hint').addEventListener('click', hint);
$('btn-undo').addEventListener('click', undoLast);
$('btn-help').addEventListener('click', () => showOverlay('overlay-help'));
$('btn-menu').addEventListener('click', () => { syncMenuToggles(); showOverlay('overlay-menu'); });
$('btn-sound').addEventListener('click', () => { setMuted(!isMuted()); $('btn-sound').textContent = isMuted() ? '🔇' : '🔊'; });
$('btn-start').addEventListener('click', () => { initAudio(); showOverlay(null); newGame(); });
$('btn-rank').addEventListener('click', openRanking);
$('btn-restart').addEventListener('click', () => { showOverlay(null); newGame(); });
$('btn-look').addEventListener('click', () => showOverlay(null));
$('rank-form').addEventListener('submit', submitScore);
$('menu-continue').addEventListener('click', () => showOverlay(null));
$('menu-restart').addEventListener('click', () => { showOverlay(null); newGame(); });
$('menu-home').addEventListener('click', () => returnToMenu());
$('menu-rank').addEventListener('click', openRanking);
$('tg-bloom').addEventListener('click', () => { prefs.bloom = !prefs.bloom; localStorage.setItem('pr_bloom', prefs.bloom ? '1' : '0'); syncMenuToggles(); });
$('tg-grain').addEventListener('click', () => { prefs.grain = !prefs.grain; localStorage.setItem('pr_grain', prefs.grain ? '1' : '0'); syncMenuToggles(); });
$('tg-lens').addEventListener('click', () => { prefs.lens = !prefs.lens; localStorage.setItem('pr_lens', prefs.lens ? '1' : '0'); syncMenuToggles(); });
$('tg-sound').addEventListener('click', () => { setMuted(!isMuted()); $('btn-sound').textContent = isMuted() ? '🔇' : '🔊'; syncMenuToggles(); });
document.querySelectorAll('.close-overlay').forEach((b) => b.addEventListener('click', () => showOverlay(null)));
document.querySelectorAll('.to-start').forEach((b) => b.addEventListener('click', () => showOverlay(S.started ? null : 'overlay-start')));
document.querySelectorAll('.ic-slot').forEach((el) => { el.innerHTML = icon(el.dataset.icon, +(el.dataset.size || 18)); });

// ---------- laço ----------
function resize() {
  const w = window.innerWidth, h = window.innerHeight, dpr = Math.min(devicePixelRatio || 1, 2);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  if (finalComposer) { bloomComposer.setSize(w, h); finalComposer.setSize(w, h); bloomPass.setSize(w / 2, h / 2); }
  cfx.width = Math.round(w * dpr); cfx.height = Math.round(h * dpr);
}
window.addEventListener('resize', resize);
resize();

const easeOutBack = (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  rig.tick(dt);
  scene.fog.near = rig.dist * 1.3; scene.fog.far = rig.dist * 3.8;
  // fantasma: surgimento + flutuação
  if (ghostGroup.visible) {
    let y = 0.24 + Math.sin(now * 0.004) * 0.02 + ghostPos.arc * (1 - ghostPos.arc) * 0.5;
    ghostGroup.position.x = ghostPos.x.v; ghostGroup.position.z = ghostPos.z.v;
    if (ghostAnim) {
      ghostAnim.t += dt;
      const p = Math.max(0, Math.min(1, ghostAnim.t / 0.42));
      ghostGroup.scale.setScalar(Math.max(0.01, easeOutBack(p))); y += (1 - p) * (1 - p) * 1.0;
      if (ghostAnim.t >= 0.42) { ghostAnim = null; ghostGroup.scale.setScalar(1); }
    }
    ghostGroup.position.y = y;
  }
  ghostRot.target += Math.atan2(Math.sin(ghostRotTarget - ghostRot.target), Math.cos(ghostRotTarget - ghostRot.target));
  spring(ghostRot, 220, 20, dt); spring(curRot, 220, 20, dt); curRot.target = ghostRot.target;
  if (ghostGroup.visible) ghostGroup.rotation.y = ghostRot.v;
  if (curTileGroup) curTileGroup.rotation.y = curRot.v;
  spring(ghostPos.x, 320, 30, dt); spring(ghostPos.z, 320, 30, dt);
  if (ghostPos.arc > 0) ghostPos.arc = Math.max(0, ghostPos.arc - dt * 5);
  updateSeams(seamGhost, now, dt); updateSeams(seamPlaced, now, dt);
  updateFormation(now, dt);
  rollScore(dt);
  if (cameraShake) { cameraShake.t += dt; const p = Math.min(1, cameraShake.t / cameraShake.dur), k = cameraShake.amp * (1 - p); camera.position.x += (Math.random() - 0.5) * k; camera.position.y += (Math.random() - 0.5) * k; if (p >= 1) cameraShake = null; }
  stackRoot.rotation.y = Math.sin(now * 0.0007) * 0.03; stackRoot.position.y = Math.sin(now * 0.0011) * 0.008;
  if (stackTopGroup && !uiAnims.some((a) => a.obj === stackTopGroup)) { stackTopGroup.position.y = stackTopGroup.userData.baseY + Math.sin(now * 0.0021) * 0.05; stackTopGroup.rotation.y = Math.sin(now * 0.0009) * 0.12; } // paira de leve
  // anéis radiais: peça com missão na pilha, na mão e no tabuleiro
  ringAcc += dt;
  if (ringAcc >= 0.85) {
    ringAcc = 0;
    if (S.started && !S.over) {
      if (S.stack[0] && S.stack[0].quest && stackTopGroup) spawnRingPulse(uiScene, stackTopGroup.position.x, stackTopGroup.position.y + 0.02, stackTopGroup.position.z, S.stack[0].quest.color);
      if (S.current && S.current.quest) { spawnRingPulse(uiScene, 50, 0.02, 0, S.current.quest.color); if (ghostGroup.visible) spawnRingPulse(scene, ghostGroup.position.x, TILE_H + 0.02, ghostGroup.position.z, S.current.quest.color, true); }
    }
  }
  updateRingPulses(dt);
  for (let i = uiAnims.length - 1; i >= 0; i--) {
    const a = uiAnims[i]; a.t += dt; if (a.t < 0) continue;
    const p = Math.min(1, a.t / a.dur);
    if (a.kind === 'lift') { // arco: sobe rápido (slow-out) e sai para o lado ganhando velocidade
      const eo = 1 - (1 - p) * (1 - p), ei = p * p;
      a.obj.position.y = a.from + (a.to - a.from) * eo; a.obj.position.x = 1.6 * ei; a.obj.position.z = -0.4 * ei;
      a.obj.rotation.y += dt * 2.5; a.obj.rotation.z = -0.35 * eo;
      const sc = 1 - 0.55 * ei; a.obj.scale.setScalar(Math.max(0.01, sc));
      if (p >= 1) { uiScene.remove(a.obj); uiAnims.splice(i, 1); }
    } else if (a.kind === 'rise') { // a seguinte sobe e passa a pairar (overshoot leve = antecipação do próximo saque)
      a.obj.position.y = a.from + (a.to - a.from) * easeOutBack(p);
      if (p >= 1) { a.obj.position.y = a.to; uiAnims.splice(i, 1); }
    }
    else { const e = 1 - Math.pow(1 - p, 3), bounce = p > 0.8 ? Math.sin((p - 0.8) / 0.2 * Math.PI) * 0.04 : 0; a.obj.position.y = a.from + (a.to - a.from) * e + bounce; if (p >= 1) { a.obj.position.y = a.to; uiAnims.splice(i, 1); } }
  }
  const pulseK = 0.9 + 0.1 * Math.sin(now * 0.0025) - (Math.random() < 0.015 ? 0.18 : 0);
  glowMat.color.setScalar(pulseK);
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i]; a.t += dt;
    const p = Math.min(1, a.t / a.dur), e = 1 - Math.pow(1 - p, 3);
    if (a.prop === 'y') a.obj.position.y = a.from + (a.to - a.from) * e;
    else if (a.prop === 'settle') { if (a.t >= 0) a.obj.position.y = -a.amp * Math.sin(Math.PI * p); if (p >= 1) a.obj.position.y = 0; }
    else if (a.prop === 'undo') { // antecipação (afunda um tiquinho) -> sobe acelerando, gira e encolhe
      const o = a.obj;
      if (p < 0.18) { const q = p / 0.18; o.position.y = -0.03 * Math.sin(Math.PI * q); o.scale.set(1 + 0.04 * q, 1 - 0.06 * q, 1 + 0.04 * q); }
      else { const q = (p - 0.18) / 0.82, ei = q * q; o.position.y = 1.6 * ei; o.rotation.y += dt * 4; o.scale.setScalar(Math.max(0.01, 1 - 0.9 * ei)); }
      if (p >= 1) scene.remove(o);
    }
    else if (a.prop === 'drop') { // antecipação -> queda acelerada -> impacto com squash & stretch e follow-through
      const o = a.obj;
      if (p < 0.2) { const q = p / 0.2, e2 = 1 - (1 - q) * (1 - q); o.position.y = a.y0 + 0.14 * e2; o.scale.set(1 - 0.03 * e2, 1 + 0.07 * e2, 1 - 0.03 * e2); }
      else if (p < 0.55) { const q = (p - 0.2) / 0.35; o.position.y = (a.y0 + 0.14) * (1 - q * q); o.scale.set(0.97, 1.07 + 0.05 * q, 0.97); }
      else {
        if (!a.impact) {
          a.impact = true; o.position.y = 0;
          spawnBurst({ x: a.w.x, z: a.w.z }, ['#6a6a7a', '#9a9aaa', '#ffd166'], 10, 0.55);
          spawnBurst({ x: a.w.x, z: a.w.z }, a.ev.matchedTypes.map((t) => TERRAIN[t].color), a.ev.perfect ? 34 : 3 + a.ev.matches * 3);
          for (const d of DIRS) { const nb = S.tiles.get(key(fromWorld(a.w.x, a.w.z).q + d[0], fromWorld(a.w.x, a.w.z).r + d[1])); if (nb && nb.group !== o) anims.push({ obj: nb.group, prop: 'settle', t: -0.03, dur: 0.3, amp: 0.03 }); }
          sealSeams(a.ev, a.w);
          cameraShake = { t: 0, dur: a.ev.perfect ? 0.45 : 0.22, amp: a.ev.perfect ? 0.07 : 0.028 };
          const cols = a.ev.sides.map((st, i) => (st === 1 ? hexCss(EDGE_COLORS[a.ev.types[i]] || 0xffffff) : null)).filter(Boolean);
          if (cols.length) kick(a.ev.perfect ? 0.8 : 0.45 + 0.05 * cols.length, a.ev.perfect ? cols.concat('#ffd166') : cols, a.ev.perfect ? 0.4 : 0.22 + 0.03 * cols.length);
        }
        const q = (p - 0.55) / 0.45, sq = Math.sin(Math.PI * Math.min(1, q * 1.6)) * (1 - q) * 0.2;
        o.scale.set(1 + sq * 0.55, 1 - sq, 1 + sq * 0.55);
      }
      if (p >= 1) { o.scale.set(1, 1, 1); o.position.y = 0; }
    }
    else if (a.prop === 'pulse') { const s = a.from + (a.to - a.from) * e; a.obj.scale.set(s, 1, s); a.obj.material.opacity = 0.7 * (1 - p); if (p >= 1) { fxGroup.remove(a.obj); a.obj.material.dispose(); } }
    if (p >= 1) anims.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.t += dt;
    p.vy -= p.g * dt; p.m.position.x += p.vx * dt + (p.wob ? Math.sin(now * 0.001 * p.wf + p.ph) * p.wob * dt : 0); p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt + (p.wob ? Math.cos(now * 0.0013 * p.wf + p.ph) * p.wob * dt : 0);
    p.m.rotation.x += dt * p.rs; p.m.rotation.z += dt * p.rs;
    const f = p.t / p.life;
    const s = p.mode === 'burst' ? 1 - f : p.mode === 'twinkle' ? Math.sin(Math.PI * f) * (0.6 + 0.4 * Math.abs(Math.sin(now * 0.01 + p.ph))) : Math.sin(Math.PI * f);
    p.m.scale.setScalar(Math.max(0.01, s * p.base));
    if (p.t >= p.life) { fxGroup.remove(p.m); particles.splice(i, 1); }
  }
  if (S.tileList.length) { ambAcc += dt * Math.min(26, 5 + S.tileList.length * 0.9); while (ambAcc >= 1) { ambAcc -= 1; if (particles.length < 170) spawnAmbient(); } }
  waterMat.uniforms.time.value = now * 0.001; waterGhost.uniforms.time.value = now * 0.001;
  const groups = boardGroup.children.concat(ghostGroup.children);
  for (const g of groups) {
    for (const r of g.userData.rotors || []) r.rotation.x += r.userData.speed * dt;
    for (const d of g.userData.drones || []) { const { a } = d; d.ph += a.speed * dt; d.mesh.position.set(a.x + Math.cos(d.ph) * a.r, a.y + Math.sin(now * 0.003 + d.ph) * 0.03, a.z + Math.sin(d.ph) * a.r); d.mesh.rotation.y = -d.ph - (a.speed > 0 ? Math.PI / 2 : -Math.PI / 2); }
    for (const b of g.userData.bolts || []) {
      const st = b.userData.bolt; st.t += dt;
      if (st.t >= st.next) {
        st.on = st.on ? Math.random() < 0.6 : Math.random() < 0.22;
        st.next = st.t + (st.on ? 0.04 + Math.random() * 0.06 : 0.3 + Math.random() * 1.1);
        b.visible = st.on; if (st.on) rerollBolt(b);
      }
    }
  }
  updateVehicles(dt);
  for (let i = 0; i < DUST_N; i++) {
    const d = dustVel[i]; let x = dustPos[i * 3], y = dustPos[i * 3 + 1] + d.vy * dt, z = dustPos[i * 3 + 2];
    x += Math.sin(now * 0.0005 * d.f + d.ph) * 0.12 * dt; z += Math.cos(now * 0.0004 * d.f + d.ph) * 0.12 * dt;
    if (y > 4.5) y = 0.2;
    if (x - rig.target.x > 13) x -= 26; else if (x - rig.target.x < -13) x += 26;
    if (z - rig.target.z > 13) z -= 26; else if (z - rig.target.z < -13) z += 26;
    dustPos[i * 3] = x; dustPos[i * 3 + 1] = y; dustPos[i * 3 + 2] = z;
  }
  dust.geometry.attributes.position.needsUpdate = true;
  for (const c of clouds) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > rig.target.x + 45) c.position.x = rig.target.x - 45;
    if (c.position.x < rig.target.x - 50) c.position.x = rig.target.x + 44;
    if (Math.abs(c.position.z - rig.target.z) > 45) c.position.z = rig.target.z + (Math.random() * 80 - 40);
  }
  updateQuestLabels();
  renderFrame();
  renderUI();
  updateOverlay(dt, now);
  requestAnimationFrame(loop);
}

// acesso para testes/automação no console
window.PR = { S, rig, camera, toWorld, selectSlot, commitPlacement, hint, applyBest, rotate, evalPlacement, bestPlacement, newGame, confettiBurst, banner, vehicles, fx, hoverFx, kick, undoLast, rewardTiles, checkQuests, regionKeys, buildingsOf, tileGeo, showOverlay };
const params = new URLSearchParams(location.search);
if (params.has('nobloom')) prefs.bloom = false;
if (params.has('nolens')) prefs.lens = false;
if (params.has('nograin')) prefs.grain = false;
$('grain').classList.toggle('hidden', !prefs.grain);
if (params.has('play')) {
  showOverlay(null); newGame(params.has('seed') ? +params.get('seed') : undefined);
  if (params.get('zoom')) rig.dist = +params.get('zoom');
  const auto = +(params.get('auto') || 0); // ?play&auto=N joga N peças sozinho (teste/demonstração)
  if (auto > 0) { let n = 0; const iv = setInterval(() => { if (S.over || n++ >= auto) return clearInterval(iv); applyBest(); commitPlacement(); }, 350); }
} else demoBoard(30);
updateHUD(false);
requestAnimationFrame(loop);
