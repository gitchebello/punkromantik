import { key, opp, DIRS, toWorld, fromWorld, edgeAt, groundAt, edgeAngle } from './hex.js';
import { RNG } from './rng.js';
import { TERRAIN, GROUP_INFO, isConnector, compatible, groupOf, sideGroups, genTile, starterTile, makeStack, makeQuest, isTerminal, questGoal, continuationTile, questLevel } from './tilegen.js';
import { buildTile, buildSlab, buildSlotRing, buildHexDisc, buildRotorGeometry, buildVaxRotorGeometry, buildVehicleGeometry, buildTrainCarGeometry, buildDroneGeometry, buildGlyphGeometry, buildCamelGeometry, buildBearGeometry, buildYetiGeometry, buildBirdGeometry, buildBirdWingGeometry, buildHighlight, buildAuroraGeometry, buildBoatGeometry, routeLift, walkRoute, pathLength, pointAt, TILE_H } from './tilemesh.js';
import { initAudio, play, setMuted, isMuted } from './audio.js';
import { CameraRig, attachInput } from './controls.js';

const THREE = window.THREE;
const STACK_SIZE = 40;
const NEON = ['#ff2bd6', '#22f3ff', '#ffe93a', '#ff7a1a', '#9dff2b', '#b66bff', '#ffffff'];
const $ = (id) => document.getElementById(id);
const prefs = { bloom: localStorage.getItem('pr_bloom') !== '0', lens: localStorage.getItem('pr_lens') !== '0', grain: localStorage.getItem('pr_grain') !== '0' };

// ---------- ícones (SVG inline: a HUD fala por números e símbolos, não por texto) ----------
// Ícones de missão: o conjunto de 07/10, restaurado a pedido do usuário em 09/10 (as duas reformas
// seguintes — "fofos" com recortes e silhuetas — foram rejeitadas). Não redesenhar sem ele pedir.
const ICON_PATHS = {
  cyber: '<path d="M2 22V11h4V6h5v4h4v3h4v9z"/><path fill="#fff" opacity=".6" d="M4 13h1.6v2H4zm0 3.5h1.6v2H4zM8 8h1.6v2H8zm0 3.5h1.6v2H8zm0 3.5h1.6v2H8zm4 0h1.6v2H12zm4 3h1.6v2H16z"/>',
  city: '<path d="M4 22V4h16v18z"/><path fill="#fff" opacity=".75" d="M6.5 6.5h2.4v2.4H6.5zm4.3 0h2.4v2.4h-2.4zm4.3 0h2.4v2.4h-2.4zM6.5 10.8h2.4v2.4H6.5zm4.3 0h2.4v2.4h-2.4zm4.3 0h2.4v2.4h-2.4zM6.5 15.1h2.4v2.4H6.5zm4.3 0h2.4v2.4h-2.4zm4.3 0h2.4v2.4h-2.4z"/><path d="M2 22h20v1.5H2z"/>',
  solar: '<path d="M12 23V12" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/><path d="M12 14.5C8.5 14 3 12 2 3.5c6.5.6 10 5 10 11z"/><path d="M12 13c3.5-.5 9-2.5 10-11-6.5.6-10 5-10 11z"/><path d="M11 13 4.5 6.5M13 11.5 19.5 5" stroke="#fff" stroke-width="1" opacity=".5" fill="none"/>',
  rock: '<path d="M1.5 21.5h21V19h-21zM4 19h16v-2.6H4zM6.6 16.4h10.8v-2.6H6.6zM9.2 13.8h5.6v-2.6H9.2zM10.8 11.2h2.4V8.4h-2.4z"/><path fill="#fff" opacity=".55" d="M4 18.4h16v.7H4zM6.6 15.8h10.8v.7H6.6zM9.2 13.2h5.6v.7H9.2z"/>',
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
const questLeft = (q) => Math.max(0, q.target - q.progress);
const plus = (q) => (q.exact ? '' : '+'); // "N+": pelo menos N

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
// Achado oculto: a peça inteira em cinza, "desligada". Dessatura mantendo o claro/escuro, então a
// silhueta continua legível — a cor o jogador deduz pelo ambiente ao redor, e só vê ao encostar nela.
function greyed(mat, lift, k) {
  mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n  diffuseColor.rgb = vec3(${lift.toFixed(2)} + ${k.toFixed(2)} * dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)));`); };
  return mat;
}
const hiddenLit = greyed(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.3, 0.45);
const hiddenGlow = greyed(new THREE.MeshBasicMaterial({ vertexColors: true }), 0.22, 0.2);
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
// Aurora: folha aditiva que clareia na barra de baixo e esmaece para cima, com raios verticais
// correndo devagar e a cortina ondulando de lado. Três paletas (verde→ciano, verde→violeta, ciano→rosa).
const AURORA_VS = `attribute vec2 perp; attribute float aph; uniform float time; varying vec2 vUv; varying float ph;
void main(){ vUv = uv; ph = aph; vec3 p = position;
  float w = sin(uv.x * 9.0 + time * 0.7 + ph) * 0.025 + sin(uv.x * 3.1 - time * 0.45 + ph * 2.0) * 0.03;
  p.xz += perp * w * (0.35 + uv.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;
const AURORA_FS = `uniform float time; varying float ph; uniform vec3 c0; uniform vec3 c1; varying vec2 vUv;
float hash(float n){ return fract(sin(n) * 43758.5453); }
float noise(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), f); }
void main(){
  float u = vUv.x, v = vUv.y;
  float rays = 0.45 + 0.55 * noise(u * 34.0 + time * 0.6 + ph * 5.0) * noise(u * 11.0 - time * 0.35 + ph);
  float edge = smoothstep(0.0, 0.16, u) * smoothstep(1.0, 0.84, u);
  float a = smoothstep(0.0, 0.07, v) * pow(1.0 - v, 1.6) * edge * rays;
  float hem = smoothstep(0.0, 0.05, v) * (1.0 - smoothstep(0.05, 0.22, v)); // barra de baixo, mais viva
  vec3 col = mix(c0, c1, smoothstep(0.15, 0.95, v)) * (0.8 + hem * 1.1);
  gl_FragColor = vec4(col, min(1.0, a * 1.25));
}`;
const AURORA_COLS = [['#38ff9b', '#22f3ff'], ['#38ff9b', '#b66bff'], ['#22f3ff', '#ff5fd2']];
const auroraMats = AURORA_COLS.map((_, hue) => new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, c0: { value: new THREE.Color(AURORA_COLS[hue][0]) }, c1: { value: new THREE.Color(AURORA_COLS[hue][1]) } },
    vertexShader: AURORA_VS, fragmentShader: AURORA_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
const boltMats = {};
const boltMat = (c) => boltMats[c] || (boltMats[c] = new THREE.MeshBasicMaterial({ color: c }));
const ringGeo = buildSlotRing(), discGeo = buildHexDisc(), rotorGeo = buildRotorGeometry(), vaxRotorGeo = buildVaxRotorGeometry();
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
const EDGE_COLORS = { plain: 0x6fd2f5, grass: 0xffd98a, cyber: 0xff2bd6, solar: 0x7dff4a, rock: 0xff9a3c, pool: 0x2dffb8, sewage: 0x2dffb8, rail: 0x22f3ff, road: 0xffe36a };
const GROUP_HEX = { plain: 0x6fd2f5, grass: 0xffd98a, cyber: 0xff2bd6, solar: 0x7dff4a, rock: 0xff9a3c, toxic: 0x2dffb8, rail: 0x22f3ff, road: 0xffe36a };
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
    const hex = st === -1 ? 0xff3b5c : st === 2 ? 0x55506a : st === 3 ? 0xdfe3ee : (EDGE_COLORS[ev.types[i]] || 0xffffff);
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
    } else if (it.st === 3) { // encosta num achado oculto: friso branco respirando devagar, sem resposta
      it.strip.material.color.copy(it.base).multiplyScalar(0.55 + 0.45 * Math.sin(t * 2.4 + it.ph)); it.strip.material.opacity = 0.85 * fade; it.strip.scale.y = 1;
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
function formationGroups(q, r, ev, tile = S.current, rot = S.rot) {
  const byGroup = new Map();
  for (let i = 0; i < 6; i++) {
    if (ev.sides[i] !== 1) continue;
    const nk = key(q + DIRS[i][0], r + DIRS[i][1]), nb = S.tiles.get(nk);
    for (const g of sideGroups(tile, local(i, rot))) { // a estrada na cidade liga a rede E a cidade
      if (g === 'plain' || g === 'grass') continue; // gelo e baldio não formam "formação": não vale realçar meio tabuleiro
      if (!nb || !sideHas(nb, opp(i), g)) continue;
      let set = byGroup.get(g); if (!set) { set = new Set(); byGroup.set(g, set); }
      if (!set.has(nk)) for (const k of regionKeys(nk, g)) set.add(k);
    }
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
  const t = S.tiles.get(key(q, r)), byGroup = t ? formationGroups(q, r, ev, t.tile, t.rot) : new Map();
  for (const [g, keys] of byGroup) for (const k of keys) { const t2 = S.tiles.get(k); if (!t2) continue; const m = takeHi(); placeHi(m, t2, g); hiSealed.push(m); }
  if (t) for (const g of byGroup.keys()) { const m = takeHi(); placeHi(m, t, g); hiSealed.push(m); }
  formation.seal = byGroup.size ? 0 : -1;
  hideFormation();
}
function updateFormation(now, dt) {
  const t = now * 0.001;
  const hoverK = 0.11 + 0.07 * Math.sin(t * 5.5) + 0.02 * Math.sin(t * 17);
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
const unbloomed = []; // sprites que não podem brilhar (névoa): somem só durante o passe do bloom
function renderFrame() {
  renderer.autoClear = true;
  if (!finalComposer) { renderer.render(scene, camera); return; }
  mixPass.enabled = prefs.bloom; lensPass.enabled = prefs.lens || prefs.grain;
  if (prefs.bloom) {
    scene.traverse((o) => { if ((o.isMesh || o.isPoints) && !bloomLayer.test(o.layers)) { swapped.set(o, o.material); o.material = darkMat; } else if (o.userData.noBloom && o.visible) { o.visible = false; unbloomed.push(o); } });
    scene.background = BLACK; scene.fog.color = BLACK;
    bloomComposer.render();
    for (const [o, m] of swapped) o.material = m; swapped.clear(); for (const o of unbloomed) o.visible = true; unbloomed.length = 0;
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
const stackHalo = makeHalo(3.0), curHalo = makeHalo(3.0);
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
function setBadge(id, tile) {
  const el = $(id), n = tile ? buildingsOf(tile) : 0;
  el.hidden = !n; if (n) el.innerHTML = `${icon('city', 13)}${n}`;
}
function refreshCurrentPreview() {
  curRoot.clear(); curTileGroup = null;
  setBadge('cur-bld', S.current); setBadge('next-bld', S.stack[0]);
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
  stackCam.position.set(3.3, stackCamY + 3.6, 3.3); stackCam.lookAt(0, stackCamY + FLOAT_H + 0.34, 0);
  stackHalo.position.set(-0.9, stackCamY + FLOAT_H + 0.1, -0.9);
  curCam.position.set(50 + 2.4, 2.9, 2.4); curCam.lookAt(50, 0.36, 0);
  draw($('stack-area'), stackCam, 40, 30); draw($('current-area'), curCam, 33, 26);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, W, Hh); renderer.autoClear = true;
}
// Anéis radiais saindo do centro do hexágono: chamam a atenção para uma peça com missão (pilha, mão e tabuleiro)
const ringPulseGeo = (() => { const g = new THREE.RingGeometry(0.9, 1.0, 6, 1); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI / 6); return g; })();
const ringPulses = [];
let ringAcc = 0;
function spawnRingPulse(parent, x, y, z, color, bloom = false) {
  const m = new THREE.Mesh(ringPulseGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  m.position.set(x, y, z); m.scale.setScalar(0.25); m.renderOrder = 5; if (bloom) m.layers.enable(BLOOM);
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
  best: +(localStorage.getItem('pr_best') || 0), tips: new Set(), lowWarned: false, tileList: [], hints: 5, undo: null, sinceQuest: 0, pendingGain: 0, relics: [], sinceRelic: 0, gains: {},
};
const HINTS_PER_GAME = 5, QUEST_CAP = 4;
const gain = (src, n = 1) => { S.gains[src] = (S.gains[src] || 0) + n; }; // de onde vêm as peças extras (balanceamento)
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
  v.mesh.position.set(p.x + nx * off, TILE_H + routeLift(route, p.x, p.z), p.z + nz * off);
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
      const rotor = new THREE.Mesh(a.geo === 'vax' ? vaxRotorGeo : rotorGeo, lit); rotor.userData.speed = a.speed; rotor.rotation.x = Math.random() * 6; rotor.scale.setScalar(a.scale || 1);
      pivot.add(rotor); g.add(pivot); g.userData.rotors.push(rotor);
    } else if (a.type === 'bolt') {
      const m = makeBolt(a, boltMat(a.color)); g.add(m); g.userData.bolts.push(m);
    } else if (a.type === 'drone') {
      const gk = (a.geo || 'drone') + a.color, dg = droneGeos[gk] || (droneGeos[gk] = a.geo === 'glyph' ? buildGlyphGeometry(a.color) : buildDroneGeometry(a.color));
      const dm = new THREE.Group(); const dgl = new THREE.Mesh(dg.glow, glow); dgl.layers.enable(BLOOM); dm.add(new THREE.Mesh(dg.lit, lit), dgl);
      dm.position.set(a.x + a.r, a.y, a.z); g.add(dm); g.userData.drones.push({ mesh: dm, a, ph: Math.random() * 6.28 });
    } else if (a.type === 'aurora') {
      const am = new THREE.Mesh(a._geo || (a._geo = buildAuroraGeometry(a)), auroraMats[a.hue]); am.layers.enable(BLOOM); am.renderOrder = 3; g.add(am);
      am.userData.aurora = true;
    } else if (geo.routes && geo.routes.some((r) => r.type === 'road')) {
      const roadIdx = geo.routes.map((r, i) => (r.type === 'road' ? i : -1)).filter((i) => i >= 0);
      const ri = roadIdx[(carIdx + 1) % roadIdx.length], route = geo.routes[ri], L = route.L, mesh = makeVehicleMesh(a.type, a.color, lit, glow);
      const v = { type: a.type, mesh, route: ri, dir: a.dir, speed: 0.75, s: L * (0.3 + 0.4 * (carIdx++ % 2)), wait: 0 };
      placeVehicle(v, route); g.add(mesh);
      if (live) { v.tileKey = null; g.userData.vehicles = g.userData.vehicles || []; g.userData.vehicles.push(v); }
    }
  }
  return g;
}

// ---------- regras ----------
// `peek`: só na hora de colocar de verdade. Antes disso, o lado que dá para um achado oculto fica
// em aberto (estado 3): sem prévia de pontos nem friso colorido — senão a prévia entregava o bioma.
function evalPlacement(q, r, tile, rot, peek = false) {
  let matches = 0, neighbors = 0, legal = true;
  const matchedTypes = [], sides = [], types = [];
  for (let i = 0; i < 6; i++) {
    const nb = S.tiles.get(key(q + DIRS[i][0], r + DIRS[i][1]));
    types.push(edgeAt(tile, rot, i));
    if (!nb) { sides.push(0); continue; }
    neighbors++;
    const mine = edgeAt(tile, rot, i), theirs = edgeAt(nb.tile, nb.rot, opp(i));
    if (nb.tile.hidden && !peek) { if (isConnector(mine)) { legal = false; sides.push(-1); } else sides.push(3); continue; }
    if (compatible(mine, theirs)) { matches++; matchedTypes.push(mine); sides.push(1); }
    else if (isConnector(mine) || isConnector(theirs)) { legal = false; sides.push(-1); }
    else sides.push(2);
  }
  return { legal, matches, neighbors, matchedTypes, sides, types, perfect: neighbors === 6 && matches === 6 };
}
// lado local de uma aresta do mundo
const local = (i, rot) => (((i - rot) % 6) + 6) % 6;
// o lado `i` (do mundo) da peça colocada pertence ao grupo? Numa peça com conector, o lado de saída
// tem as DUAS qualidades: a estrada que cruza a cidade conta para a rodovia e para a cidade.
const sideHas = (t, i, group) => sideGroups(t.tile, local(i, t.rot)).includes(group);
// casas ligadas a `startKey` pelo grupo (região ou rede de conectores)
function regionKeys(startKey, group) {
  const seen = new Set([startKey]), stack = [startKey];
  while (stack.length) {
    const k = stack.pop(), t = S.tiles.get(k); if (!t) continue;
    for (let i = 0; i < 6; i++) {
      if (!sideHas(t, i, group)) continue;
      const nk = key(t.q + DIRS[i][0], t.r + DIRS[i][1]), nb = S.tiles.get(nk);
      if (!nb || seen.has(nk)) continue;
      if (!sideHas(nb, opp(i), group)) continue;
      seen.add(nk); stack.push(nk);
    }
  }
  return seen;
}
// a formação ainda tem alguma borda do grupo dando para uma casa vazia? (senão, não pode mais crescer)
function regionOpen(keys, group) {
  for (const k of keys) {
    const t = S.tiles.get(k);
    for (let i = 0; i < 6; i++) if (sideHas(t, i, group) && !S.tiles.has(key(t.q + DIRS[i][0], t.r + DIRS[i][1]))) return true;
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
  const group = makeTileGroup(tile, tile.hidden ? hiddenLit : litMat, tile.hidden ? hiddenGlow : glowMat, true);
  if (tile.hidden) { // nada de água colorida, aurora, raio nem bloom: tudo apagado até alguém encostar
    const drop = [];
    group.traverse((m) => { if (!m.isMesh) return; m.layers.disable(BLOOM); if (m.material === waterMat) m.material = hiddenLit; else if (m.userData.aurora || m.userData.bolt) drop.push(m); });
    for (const m of drop) m.parent.remove(m);
    group.userData.bolts = [];
  }
  const w = toWorld(q, r), k = key(q, r);
  group.position.set(w.x, animate ? ghostGroup.position.y : 0, w.z);
  group.rotation.y = (-rot * Math.PI) / 3;
  boardGroup.add(group);
  S.tiles.set(k, { q, r, tile, rot, group });
  S.tileList = [...S.tiles.values()];
  for (const v of group.userData.vehicles || []) { v.tileKey = k; vehicles.push(v); }
  if (animate) anims.push({ obj: group, prop: 'drop', t: 0, dur: 0.46, y0: ghostGroup.position.y, w, ev, impact: false });
  if (!tile.hidden) spawnFauna(k);
}
function removeTile(k) {
  const t = S.tiles.get(k); if (!t) return null;
  boardGroup.remove(t.group); S.tiles.delete(k); S.tileList = [...S.tiles.values()];
  for (let i = vehicles.length - 1; i >= 0; i--) if (vehicles[i].tileKey === k) vehicles.splice(i, 1);
  for (let i = trains.length - 1; i >= 0; i--) if (trains[i].tileKey === k) removeTrain(i);
  for (let i = fauna.length - 1; i >= 0; i--) if (fauna[i].k === k) dropFlock(i);
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
  while (fauna.length) dropFlock(fauna.length - 1);
  S.tiles.clear(); S.slots.clear(); S.tileList = []; vehicles.length = 0; clearTrains(); particles.length = 0; anims.length = 0; fx.sides = 0; hoverFx.k = 0; hoverFx.target = 0;
  ghostGroup.clear(); ghostShadow.visible = false; seamGhost.group.visible = false; seamPlaced.group.visible = false; seamPlaced.seal = -1; ghostAnim = null;
  hideFormation(); releaseHi(hiSealed); formation.seal = -1;
  for (const p of ringPulses) p.parent.remove(p.m); ringPulses.length = 0;
  stackRoot.clear(); curRoot.clear(); curTileGroup = null; stackTopGroup = null; uiAnims.length = 0;
  for (const hk of [...harmonyFx.keys()]) removeHarmonyFx(hk);
  for (const R of S.relics) fxGroup.remove(R.beam); S.relics = []; S.sinceRelic = 0;
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
  previewQuests(ev.legal ? formationGroups(S.selected.q, S.selected.r, ev) : new Map());
  hoverFx.cols = !ev.legal ? ['#ff3b5c'] : ev.sides.map((st, i) => (st === 1 ? hexCss(EDGE_COLORS[ev.types[i]] || 0xffffff) : null)).filter(Boolean);
  hoverFx.target = hoverFx.cols.length ? (!ev.legal ? 0.5 : ev.perfect ? 1.0 : 0.5 + 0.1 * ev.matches) : 0;
  if (ghostPos.x.target !== w.x || ghostPos.z.target !== w.z) { ghostPos.x.target = w.x; ghostPos.z.target = w.z; ghostPos.arc = 1; }
  const tint = ev.legal ? 0xffffff : 0xff7f92;
  ghostLit.color.setHex(tint); ghostGlow.color.setHex(tint);
  setSlotMaterials(ev);
  bp.disabled = !ev.legal;
  const bonus = ev.legal ? previewBonus(S.selected.q, S.selected.r, S.current, S.rot) : { shut: 0, harmony: 0 }, basePts = ev.matches * 10 + (ev.perfect ? 60 : 0) + bonus.shut + bonus.harmony;
  bp.innerHTML = ev.legal ? `Colocar <b>+${basePts}</b>${ev.perfect ? ' ★' : ''}${bonus.shut ? ' ⬢' : ''}${bonus.harmony ? ' ✺' : ''}` : `${icon('x', 16)} Bloqueado`;
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
  S.selected = { q: b.q, r: b.r }; S.rot = b.rot; S.ghostSolid = true; // sólida desde o início: translúcida atrapalhava ler o encaixe
  updateGhost();
  ghostAnim = { t: -0.26 };
  ghostGroup.scale.setScalar(0.01);
  const w = toWorld(b.q, b.r);
  spawnBurst(w, ['#ffffff', '#ffd6ea'], 6, 0.6);
  play('appear');
}

// Borda do tabuleiro: quantos lados livres cada grupo tem (onde ainda dá para crescer) e as pontas
// de conector abertas. Alimenta a escolha do grupo das missões e as peças de continuação.
function frontier() {
  const groups = {}, ends = [];
  for (const t of S.tiles.values()) for (let i = 0; i < 6; i++) {
    if (S.tiles.has(key(t.q + DIRS[i][0], t.r + DIRS[i][1]))) continue;
    const e = edgeAt(t.tile, t.rot, i), g = groupOf(e);
    groups[g] = (groups[g] || 0) + 1;
    if (isConnector(e)) ends.push({ type: e, ground: t.tile.ground[0] });
  }
  return { groups, ends };
}
// Às vezes troca a 3ª peça da pilha (ainda escondida: só as duas primeiras aparecem) por uma que
// continua uma ponta aberta de trilho/rodovia/esgoto. Sem isso as redes ficavam em pedaços de uma
// peça e as missões de conector empacavam com progresso 1.
const STEER_CHANCE = 0.38;
function steerStack() {
  const t = S.stack[2]; if (!t || t.quest || t._steered) return;
  const { ends } = frontier(); if (!ends.length || !S.rng.chance(STEER_CHANCE)) return;
  const e = S.rng.pick(ends), nt = continuationTile(S.rng, e.type, e.ground); nt._steered = true;
  S.stack[2] = nt;
}

// Tamanho da maior formação de cada grupo (e prédios da maior cidade): o alvo da missão parte
// daí, senão a bandeira caía numa rede que já tinha passado do número e cumpria na hora.
function questContext() {
  const have = {}, seen = {}; let city = 0;
  for (const [k, t] of S.tiles) for (let i = 0; i < 6; i++) for (const g of sideGroups(t.tile, local(i, t.rot))) {
    if (g === 'plain' || g === 'grass') continue;
    const sg = seen[g] || (seen[g] = new Set()); if (sg.has(k)) continue;
    const keys = regionKeys(k, g); for (const x of keys) sg.add(x);
    have[g] = Math.max(have[g] || 0, keys.size);
    if (g === 'cyber') { let b = 0; for (const x of keys) b += buildingsOf(S.tiles.get(x).tile); city = Math.max(city, b); }
  }
  return { level: questLevel(S.placed), have, city };
}
// ---------- missões: nascem na peça que está no topo da pilha (o jogador vê chegando) ----------
function maybeAssignQuest() {
  const tile = S.stack[0]; if (!tile || tile.quest || S.placed < 2) return;
  S.sinceQuest++;
  const starving = S.quests.length === 0 && (S.sinceQuest >= 5 || S.stack.length <= 8);
  if (S.quests.length >= QUEST_CAP) return;
  if (!(S.rng.chance(0.26) || S.sinceQuest >= 7 || starving)) return;
  const q = makeQuest(S.rng, tile, buildingsOf(tile), frontier().groups, questContext());
  if (!q) return;
  q.color = GROUP_INFO[q.group].color; tile.quest = q; tile._geo = null; tile._slab = null; tile._hi = null;
  if (q.kind === 'city') q.progress = buildingsOf(tile);
  S.sinceQuest = 0;
}

// ---------- turno ----------
function drawNext(from, silentStack) {
  if (!silentStack) liftTopOfStack();
  S.current = S.stack.shift() || null;
  S.rot = 0;
  if (!S.current) { setGhost(null); refreshCurrentPreview(); rebuildStack(); updateHUD(); gameOver(); return; }
  steerStack();
  maybeAssignQuest();
  if (S.started && S.tileList.length) spawnRelic();
  setGhost(S.current); refreshCurrentPreview(); rebuildStack(0, true); updateHUD();
  ghostGroup.rotation.y = 0; if (curTileGroup) curTileGroup.rotation.y = 0;
  autoPreview(from);
  renderQuests(); // a missão da peça na mão aparece como card pendente (sem texto no meio da tela)
}
const ORD = ['', '', 'DUPLO', 'TRIPLO', 'QUÁDRUPLO', 'QUÍNTUPLO', 'SÊXTUPLO'];
function commitPlacement() {
  if (!S.current || !S.selected || S.over) return;
  const { q, r } = S.selected, tile = S.current, rot = S.rot;
  const ev = evalPlacement(q, r, tile, rot, true);
  if (!ev.legal) { play('bad'); toast(`${icon('x', 14, '#ff5c7a')} conector interrompido`, 1600); return; }
  // instantâneo para o único "desfazer" permitido
  S.undo = { q, r, tile, rot, score: S.score, placed: S.placed, perfects: S.perfects, questsDone: S.questsDone, questsLost: S.questsLost, quests: S.quests.map((x) => ({ ...x })), gained: 0, sinceQuest: S.sinceQuest, lowWarned: S.lowWarned, hints: S.hints };
  addTile(q, r, tile, rot, true, ev);
  S.placed++;
  const w = toWorld(q, r);
  let pts = ev.matches * 10, gained = 0;
  if (ev.perfect) { pts += 60; S.perfects++; S.stack.push(genTile(S.rng)); gained++; gain('perfect'); }
  let closed = false;
  if (isTerminal(tile) && ev.sides[(tile.conn.exits[0] + rot) % 6] === 1) { pts += 20; S.stack.push(genTile(S.rng)); gained++; closed = true; gain('terminal'); } // fechou uma linha: sensação de "ponto final"
  const shut = closedRegions(q, r, tile, rot); // regiões que esta peça acabou de cercar por completo
  for (const c of shut) { pts += c.points; if (c.tiles) { for (let i = 0; i < c.tiles; i++) S.stack.push(genTile(S.rng)); gained += c.tiles; gain('closed', c.tiles); } }
  const harm = newHarmonies(q, r); // peças que acabaram de ficar perfeitamente cercadas pelo mesmo ambiente
  for (const h of harm) { pts += HARMONY_PTS; S.tiles.get(h.k).harmony = h.g; addHarmonyFx(h.k, h.g); }
  S.undo.harmony = harm.map((h) => h.k);
  let relicHit = null;
  S.undo.revealed = revealAround(q, r); // achado oculto ao lado acende (o encaixe com ele já contou de verdade em `ev`)
  S.undo.relics = [];
  for (const R of S.relics) if (!R.claimed && relicConnected(R)) { // ligou o tabuleiro ao achado distante
    relicHit = relicHit || R; R.claimed = true; S.undo.relics.push(R);
    const rt = relicTiles(); relicHit._tiles = rt; pts += RELIC_PTS; for (let i = 0; i < rt; i++) S.stack.push(genTile(S.rng)); gained += rt; gain('relic', rt);
  }
  S.score += pts;
  play('place', ev.matches);
  if (pts > 0) scoreSign(pts, ev.perfect || harm.length ? 'perfect' : ev.matches >= 3 ? 'good' : ev.matches >= 2 ? 'ok' : '', harm.length ? 'harmonia!' : relicHit ? 'achado distante' : S.undo.revealed.length ? (ev.sides.some((st, i) => st === 1 && S.undo.revealed.some((R) => R.k === key(q + DIRS[i][0], r + DIRS[i][1]))) ? 'bom palpite!' : 'achado revelado') : ev.perfect ? 'encaixe perfeito!' : shut.length ? `${GROUP_INFO[shut[0].group].name} fechado` : closed ? 'ponto final' : ev.matches >= 2 ? `encaixe ${ORD[ev.matches].toLowerCase()}` : '', w);
  spawnBurst(w, ev.matchedTypes.map((t) => TERRAIN[t].color), ev.perfect ? 34 : 4 + ev.matches * 3);
  if (ev.perfect) {
    play('perfect'); pulse(w, 0xffd166); confettiBurst(2);
    banner(`★ <b>PERFEITO</b> +1 ${icon('tile', 14)}`, '', 'perfect', 2600);
  } else if (ev.matches >= 3) {
    confettiBurst(ev.matches >= 4 ? 2 : 1); play('confetti');
  }
  if (closed) pulse(w, GROUP_HEX[groupOf(tile.conn.type)]);
  for (const c of shut) flashRegion(c);
  for (const h of harm) {
    const t = S.tiles.get(h.k), hw = toWorld(t.q, t.r), color = GROUP_INFO[h.g].color;
    setTimeout(() => {
      play('harmony'); confettiBurst(1); starBurst(color); pulse(hw, GROUP_HEX[h.g]); pulse(hw, 0xffd166); spawnBurst(hw, [color, '#ffd166', '#ffffff'], 46, 1.3); cameraShake = { t: 0, dur: 0.5, amp: 0.09 };
      [0, 300, 600, 900].forEach((ms, n) => setTimeout(() => kick(0.38, n % 2 ? ['#ffd166', color] : [color], 1.25), ms)); // flashes curtos na cor do bioma
    }, 260);
    banner(`✺ <b>PERFEITO!</b> <small>harmonia ${GROUP_INFO[h.g].name}</small> <b class="big">+${HARMONY_PTS}</b>`, '', 'perfect harmony', 3400);
  }
  if (relicHit) {
    const rw = toWorld(relicHit.q, relicHit.r);
    play('relic'); confettiBurst(2); pulse(rw, GROUP_HEX[relicHit.g]); spawnBurst(rw, [GROUP_INFO[relicHit.g].color, '#ffffff'], 36, 1.1);
    banner(`✦ <b>ACHADO</b> <b class="big">+${relicHit._tiles}</b> ${icon('tile', 18)} <small>+${RELIC_PTS}</small>`, '', 'quest reward', 3200);
  }
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
// Bônus de região fechada: uma área de bioma que ficou cercada por completo (não tem mais lado
// livre para crescer) rende 5 pts por peça e, a partir de 8 peças, +1 peça. Dá um objetivo de
// médio prazo além do encaixe de cada jogada. Gelo conta; Baldio (respiro) e redes não.
const CLOSABLE = ['plain', 'cyber', 'solar', 'rock'];
// prevê os bônus (região fechada, harmonia) pondo a peça no tabuleiro por um instante (regionKeys lê S.tiles)
function previewBonus(q, r, tile, rot) {
  const k = key(q, r); if (S.tiles.has(k)) return { shut: 0, harmony: 0 };
  S.tiles.set(k, { q, r, tile, rot });
  try { return { shut: closedRegions(q, r, tile, rot).reduce((n, c) => n + c.points, 0), harmony: newHarmonies(q, r).length * HARMONY_PTS }; } finally { S.tiles.delete(k); }
}
function closedRegions(q, r, tile, rot) {
  const k = key(q, r), out = [], seen = new Set();
  for (let i = 0; i < 6; i++) for (const g of sideGroups(tile, i)) {
    if (!CLOSABLE.includes(g) || seen.has(g)) continue; seen.add(g);
    const keys = regionKeys(k, g);
    if (keys.size >= 3 && !regionOpen(keys, g)) out.push({ group: g, keys, points: keys.size * 5, tiles: keys.size >= 8 ? 1 : 0 });
  }
  return out;
}
function flashRegion(c) {
  const color = GROUP_INFO[c.group].color;
  let n = 0;
  for (const kk of c.keys) { const t = S.tiles.get(kk); if (!t) continue; const w = toWorld(t.q, t.r); setTimeout(() => { spawnBurst(w, [color, '#ffffff'], 8, 0.7); pulse(w, new THREE.Color(color).getHex()); }, 90 * n++); }
  play('quest');
}
// ---------- harmonia: peça cercada pelos 6 vizinhos do MESMO ambiente vira peça especial ----------
// Os seis lados da peça e os seis lados que dão para ela são do mesmo bioma (chão — a peça de
// estrada na cidade também conta). Vale 100 pontos uma vez por peça e ela ganha um halo girando.
// Pode ser disparada pela peça do centro OU pela sexta vizinha que fecha o anel.
const HARMONY_PTS = 100;
const harmonyFx = new Map();
function harmonyGroup(t) {
  let g0 = null;
  for (let i = 0; i < 6; i++) {
    const nb = S.tiles.get(key(t.q + DIRS[i][0], t.r + DIRS[i][1])); if (!nb) return null;
    const g = groupOf(groundAt(t.tile, t.rot, i)), gn = groupOf(groundAt(nb.tile, nb.rot, opp(i)));
    if (g !== gn || (g0 && g !== g0)) return null;
    g0 = g;
  }
  return g0;
}
function newHarmonies(q, r) {
  const out = [];
  for (const k of [key(q, r), ...DIRS.map((d) => key(q + d[0], r + d[1]))]) {
    const t = S.tiles.get(k); if (!t || t.harmony) continue;
    const g = harmonyGroup(t); if (g) out.push({ k, g });
  }
  return out;
}
// Arte da peça em harmonia: friso no contorno do hexágono com contas douradas nos cantos, névoa leve
// pairando por cima, vaga-lumes subindo e uma joia pequena. Nada de disco no chão nem anel branco
// espetado: os dois estouravam no bloom e escondiam justamente a peça que está sendo celebrada.
const rimGeo = (() => { const g = new THREE.RingGeometry(0.88, 0.965, 6, 1); g.rotateX(-Math.PI / 2); return g; })();
const rimInGeo = (() => { const g = new THREE.RingGeometry(0.8, 0.82, 6, 1); g.rotateX(-Math.PI / 2); return g; })();
const beadGeo = new THREE.OctahedronGeometry(0.045, 0), gemGeo = new THREE.OctahedronGeometry(0.06, 0);
const puffTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
function addHarmonyFx(k, g) {
  const t = S.tiles.get(k); if (!t) return;
  const w = toWorld(t.q, t.r), c = new THREE.Color(GROUP_HEX[g]), add = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide };
  const grp = new THREE.Group(); grp.position.set(w.x, TILE_H, w.z);
  const rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.6), opacity: 0.55, ...add })); // tom fechado: aditivo + bloom estourava em branco rim.position.y = 0.02;
  const rimIn = new THREE.Mesh(rimInGeo, new THREE.MeshBasicMaterial({ color: 0xb08a2e, opacity: 0.45, ...add })); rimIn.position.y = 0.02;
  for (const m of [rim, rimIn]) { m.layers.enable(BLOOM); grp.add(m); }
  const beads = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3, b = new THREE.Mesh(beadGeo, new THREE.MeshBasicMaterial({ color: 0xd9a63a }));
    b.position.set(Math.cos(a) * 0.93, 0.07, Math.sin(a) * 0.93); b.layers.enable(BLOOM); grp.add(b); beads.push(b);
  }
  const gem = new THREE.Mesh(gemGeo, new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(0.75) })); gem.layers.enable(BLOOM); grp.add(gem);
  // névoa: tufos claros, tingidos de leve com o bioma, em blending normal (fora do bloom — névoa não brilha)
  const mistCol = c.clone().lerp(new THREE.Color(0xffffff), 0.7), mist = [];
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: mistCol, transparent: true, opacity: 0, depthWrite: false }));
    sp.userData = { noBloom: true, a: (i / 7) * Math.PI * 2, r: 0.2 + 0.45 * ((i * 0.618) % 1), y: 0.38 + 0.25 * ((i * 0.37) % 1), s: 1 + 0.55 * ((i * 0.73) % 1), ph: i * 1.7 };
    grp.add(sp); mist.push(sp);
  }
  // vaga-lumes: sobem devagar de pontos do tile e somem no alto
  const motes = [];
  for (let i = 0; i < 10; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: c.clone().lerp(new THREE.Color(0xffd166), 0.35), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(0.09); sp.layers.enable(BLOOM); sp.userData = { t: i / 10, a: Math.random() * Math.PI * 2, r: 0.15 + Math.random() * 0.6, sp: 0.18 + Math.random() * 0.12 };
    grp.add(sp); motes.push(sp);
  }
  // cintilas: brilhos de quatro pontas girando em volta da joia — de longe é o que diz "esta é especial"
  const sparks = [];
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTex, color: i % 2 ? 0xffd166 : c.clone().lerp(new THREE.Color(0xffffff), 0.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    sp.layers.enable(BLOOM); sp.userData = { a: (i / 5) * Math.PI * 2, r: 0.42 + 0.12 * (i % 2), y: 0.55 + 0.25 * ((i * 0.61) % 1), ph: i * 1.3 };
    grp.add(sp); sparks.push(sp);
  }
  grp.userData = { rim, rimIn, beads, gem, mist, motes, sparks, born: 0, ring: 0.6, color: GROUP_HEX[g] };
  grp.scale.setScalar(0.01); fxGroup.add(grp); harmonyFx.set(k, grp);
}
const sparkleTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 10); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff';
  x.beginPath(); x.moveTo(32, 2); x.quadraticCurveTo(35, 29, 62, 32); x.quadraticCurveTo(35, 35, 32, 62); x.quadraticCurveTo(29, 35, 2, 32); x.quadraticCurveTo(29, 29, 32, 2); x.fill();
  return new THREE.CanvasTexture(c);
})();
function removeHarmonyFx(k) { const g = harmonyFx.get(k); if (g) { fxGroup.remove(g); harmonyFx.delete(k); } }
function updateHarmonyFx(dt, now) {
  const t = now * 0.001;
  for (const g of harmonyFx.values()) {
    const u = g.userData; u.born = Math.min(1, u.born + dt * 1.6);
    g.scale.setScalar(Math.max(0.01, easeOutBack(u.born)));
    const glow = 0.5 + 0.5 * Math.sin(t * 1.8 + g.position.x);
    u.rim.material.opacity = 0.55 + 0.3 * glow; u.rimIn.material.opacity = 0.25 + 0.25 * (1 - glow);
    u.beads.forEach((b, i) => { b.rotation.y = t * 1.5 + i; b.position.y = 0.07 + 0.025 * Math.sin(t * 2.2 + i); });
    u.gem.position.y = 0.95 + Math.sin(t * 1.4 + g.position.z) * 0.06; u.gem.rotation.y = t * 1.6; u.gem.rotation.z = Math.sin(t) * 0.3;
    for (const m of u.mist) {
      const d = m.userData, a = d.a + t * 0.12;
      m.position.set(Math.cos(a) * d.r, d.y + 0.04 * Math.sin(t * 0.7 + d.ph), Math.sin(a) * d.r);
      m.scale.setScalar(d.s * (1 + 0.08 * Math.sin(t * 0.9 + d.ph)));
      m.material.opacity = u.born * (0.17 + 0.06 * Math.sin(t * 0.8 + d.ph));
    }
    for (const m of u.sparks) {
      const d = m.userData, a = d.a + t * 0.6, tw = Math.max(0, Math.sin(t * 2.6 + d.ph));
      m.position.set(Math.cos(a) * d.r, d.y + 0.05 * Math.sin(t * 1.3 + d.ph), Math.sin(a) * d.r);
      m.scale.setScalar(0.08 + 0.16 * tw * tw); m.material.opacity = u.born * (0.25 + 0.75 * tw);
    }
    if ((u.ring -= dt) <= 0) { u.ring = 2.6; spawnRingPulse(scene, g.position.x, TILE_H + 0.03, g.position.z, u.color, true); } // anel na cor do bioma, de tempos em tempos
    for (const m of u.motes) {
      const d = m.userData; d.t = (d.t + dt * d.sp) % 1;
      m.position.set(Math.cos(d.a + d.t * 2) * d.r, 0.1 + d.t * 1.1, Math.sin(d.a + d.t * 2) * d.r);
      m.material.opacity = u.born * Math.sin(d.t * Math.PI) * 0.9;
    }
  }
}

// ---------- achados distantes: peças soltas longe do tabuleiro, ocultas em cinza ----------
// (como as peças especiais do Dorfromantik): um hexágono inteiro de um bioma, com marco, sob um
// facho de luz branca. Ela chega DESLIGADA — toda cinza, só a silhueta — e o jogador deduz o bioma
// pelo ambiente em volta (o bioma é sorteado com peso pelas peças do tabuleiro mais próximas).
// Encostar uma peça nela ativa a casa: a cor aparece e o encaixe conta de verdade (acertou o palpite,
// ganha os pontos do lado). Antes de ativar, o encaixe com ela fica "?" — friso branco, sem prévia de
// pontos, e a dica não sabe a resposta. Quando o tabuleiro principal se LIGA a ela, rende pontos e
// peças. Pode haver até RELIC_MAX esperando ao mesmo tempo, espalhados como faróis: dão um norte.
const RELIC_FROM = 18, RELIC_PTS = 80, RELIC_MAX = 2, RELIC_BEAM = 0xc8ccd6;
const relicTiles = () => (questLevel(S.placed) < 4 ? 2 : 1); // como as missões: no fim da partida o achado paga menos peças
const hexDist = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
const relicBeamGeo = new THREE.CylinderGeometry(0.06, 0.32, 9, 14, 1, true);
const relicAt = (k) => S.relics.find((R) => R.k === k);
function spawnRelic(force) {
  const waiting = S.relics.filter((R) => !R.claimed).length;
  if (!force && (waiting >= RELIC_MAX || S.placed < RELIC_FROM || S.stack.length < 6 || ++S.sinceRelic < 9 || !S.rng.chance(0.25))) return false;
  const list = S.tileList, opts = ['cyber', 'solar', 'rock', 'plain'];
  for (let tries = 0; tries < 120; tries++) {
    const base = list[S.rng.int(list.length)], d = S.rng.int(6), dist = 5 + S.rng.int(3), side = S.rng.chance(0.5) ? DIRS[(d + 1) % 6] : [0, 0];
    const c = { q: base.q + DIRS[d][0] * dist + side[0], r: base.r + DIRS[d][1] * dist + side[1] };
    if (list.some((t) => hexDist(t, c) < 4)) continue; // longe de verdade: pelo menos três casas vazias no meio
    if (S.relics.some((R) => !R.claimed && hexDist(R, c) < 5)) continue; // faróis espalhados, não em cacho
    // o ambiente decide: as peças mais próximas pesam mais (quem olha em volta consegue adivinhar)
    const w = {}, near = Math.min(...list.map((t) => hexDist(t, c)));
    for (const t of list) { const dd = hexDist(t, c); if (dd > near + 2) continue; for (const gr of t.tile.ground) { const g0 = groupOf(gr); if (opts.includes(g0)) w[g0] = (w[g0] || 0) + 1 / (1 + dd - near); } }
    const g = S.rng.weighted(opts.map((x) => [x, 0.4 + (w[x] || 0)]));
    const tile = genTile(S.rng, { simple: true });
    tile.ground = new Array(6).fill(g); tile.edges = tile.ground.slice(); tile.conn = null; tile.relic = true; tile.hidden = true; tile._geo = null;
    addTile(c.q, c.r, tile, S.rng.int(6), false); refreshSlots();
    const wp = toWorld(c.q, c.r), beam = new THREE.Mesh(relicBeamGeo, new THREE.MeshBasicMaterial({ color: RELIC_BEAM, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.position.set(wp.x, TILE_H + 4.5, wp.z); beam.layers.enable(BLOOM); fxGroup.add(beam);
    S.relics.push({ k: key(c.q, c.r), q: c.q, r: c.r, g, beam, claimed: false, hidden: true, pulse: 0 });
    S.sinceRelic = 0;
    spawnBurst(wp, ['#c8ccd6', '#ffffff'], 18, 0.8); play('appear');
    return true;
  }
  return false;
}
// liga/desliga a casa do achado: troca a peça pela versão colorida (ou cinza, no desfazer)
function setRelicHidden(R, hidden) {
  const t = S.tiles.get(R.k); if (!t || R.hidden === hidden) return;
  R.hidden = hidden; t.tile.hidden = hidden;
  removeTile(R.k); addTile(R.q, R.r, t.tile, t.rot, false);
  R.beam.material.color.setHex(hidden ? RELIC_BEAM : GROUP_HEX[R.g]);
  if (!hidden) {
    const w = toWorld(R.q, R.r), color = GROUP_INFO[R.g].color;
    pulse(w, GROUP_HEX[R.g]); spawnBurst(w, [color, '#ffffff'], 28, 1); play('appear');
    popup(GROUP_INFO[R.g].name, w, 'good', 0.9); // o jogador confere o palpite
  }
}
// achados ocultos encostados na casa (q,r): acendem quando uma peça é colocada ao lado
function revealAround(q, r) {
  const out = [];
  for (const d of DIRS) { const R = relicAt(key(q + d[0], r + d[1])); if (R && R.hidden) { setRelicHidden(R, false); out.push(R); } }
  return out;
}
function relicConnected(R) { // o tabuleiro principal (a partir da peça inicial) já encosta no achado?
  const seen = new Set([key(0, 0)]), stack = [{ q: 0, r: 0 }];
  while (stack.length) {
    const c = stack.pop();
    for (const d of DIRS) { const q = c.q + d[0], r = c.r + d[1], k = key(q, r); if (seen.has(k) || !S.tiles.has(k)) continue; if (k === R.k) return true; seen.add(k); stack.push({ q, r }); }
  }
  return false;
}
function updateRelic(dt, now) {
  for (const R of S.relics) {
    // o facho chama o jogador até lá; assim que ele começa a construir encostado no achado (mesmo antes
    // de ligar ao tabuleiro principal), já cumpriu o papel e se dissolve. Desfeita a peça, volta.
    const used = R.claimed || DIRS.some((d) => S.tiles.has(key(R.q + d[0], R.r + d[1])));
    R.beam.visible = R.beam.material.opacity > 0.002;
    if (used) { R.beam.material.opacity = Math.max(0, R.beam.material.opacity - dt * 0.4); R.beam.scale.x = R.beam.scale.z = 1 + (0.32 - R.beam.material.opacity) * 6; continue; }
    R.beam.scale.set(1, 1, 1); R.beam.visible = true;
    R.beam.material.opacity = 0.2 + 0.08 * Math.sin(now * 0.003 + R.q); R.beam.rotation.y += dt * 0.4;
    if ((R.pulse -= dt) <= 0) { R.pulse = 1.8; const w = toWorld(R.q, R.r); spawnRingPulse(scene, w.x, TILE_H + 0.02, w.z, R.hidden ? RELIC_BEAM : GROUP_HEX[R.g], true); }
  }
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
  for (const hk of u.harmony || []) { removeHarmonyFx(hk); const ht = S.tiles.get(hk); if (ht) ht.harmony = null; }
  for (const R of u.relics || []) { R.claimed = false; R.beam.material.opacity = 0.32; R.beam.scale.set(1, 1, 1); }
  for (const R of u.revealed || []) setRelicHidden(R, true); // o palpite volta a ficar em aberto
  const k = key(u.q, u.r), t = removeTile(k); if (!t) { S.undo = null; updateUndoButton(); return; }
  play('appear');
  const w = toWorld(u.q, u.r);
  spawnBurst(w, ['#ffffff', '#9ff5ff'], 10, 0.7);
  // a peça sobe girando e some (anima uma cópia) enquanto a mão recebe a peça de volta
  const ghostCopy = t.group; ghostCopy.position.y = 0; scene.add(ghostCopy);
  anims.push({ obj: ghostCopy, prop: 'undo', t: 0, dur: 0.4 });
  S.score = u.score; scoreShown = S.score; scoreRoll = null; $('score').textContent = S.score; $('score-box').classList.remove('rolling'); syncRecord();
  S.placed = u.placed; S.perfects = u.perfects; S.questsDone = u.questsDone; S.questsLost = u.questsLost; S.sinceQuest = u.sinceQuest; S.lowWarned = u.lowWarned; S.hints = u.hints; updateHintButton();
  S.quests = u.quests.map((x) => ({ ...x }));
  if (u.gained) S.stack.splice(S.stack.length - u.gained, u.gained);
  document.querySelectorAll('.flyhex').forEach((e) => e.remove()); S.pendingGain = 0;
  if (S.current) S.stack.unshift(S.current);
  S.current = u.tile; S.rot = u.rot;
  S.undo = null;
  refreshSlots();
  S.selected = { q: u.q, r: u.r }; S.ghostSolid = true;
  setGhost(S.current); refreshCurrentPreview(); rebuildStack(); renderQuests(); updateHUD(); updateGhost(); updateUndoButton();
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
    // "N+" cumpre ao chegar OU passar do número (ligar numa rede maior também vale); "N" exige o número exato
    if (qst.exact ? qst.progress === qst.target : qst.progress >= qst.target) done.push(qst);
    else if ((qst.exact && qst.progress > qst.target) || !regionOpen(keys, qst.group)) lost.push(qst); // passou do número exato, ou a formação ficou cercada: não tem mais como cumprir
  }
  for (const qst of done) {
    S.quests.splice(S.quests.indexOf(qst), 1);
    S.questsDone++;
    S.score += qst.reward.points;
    for (let i = 0; i < qst.reward.tiles; i++) S.stack.push(genTile(S.rng));
    gained += qst.reward.tiles; gain('quest', qst.reward.tiles);
    if (qst.reward.hints) { S.hints += qst.reward.hints; updateHintButton(); }
    const t = S.tiles.get(qst.tileKey), w = toWorld(t.q, t.r);
    play('quest'); confettiBurst(2); kick(0.6, ['#c4ff2a', qst.color], 0.3);
    scoreSign(qst.reward.points, 'quest', `${icon(questIcon(qst), 16)} missão`, w);
    rewardBanner(qst);
    pulse(w, new THREE.Color(qst.color).getHex());
    spawnBurst(w, [qst.color, '#ffffff'], 40);
    if (qst._card) { qst._card.classList.add('done'); const c = qst._card; setTimeout(() => c.remove(), 900); qst._card = null; }
  }
  for (const qst of lost) {
    S.quests.splice(S.quests.indexOf(qst), 1);
    S.questsLost++;
    play('bad');
    banner(`${icon('x', 16, '#ff5c7a')} ${icon(questIcon(qst), 20, '#ff5c7a')} <b>missão perdida</b>`, '', 'warn', 2600);
    if (qst._card) { qst._card.classList.add('lost'); const c = qst._card; setTimeout(() => c.remove(), 900); qst._card = null; }
    const t = S.tiles.get(qst.tileKey); if (t) spawnBurst(toWorld(t.q, t.r), ['#ff5c7a', '#55506a'], 14, 0.6);
  }
  renderQuests(done.length || lost.length ? 0 : 400);
  return gained;
}
function rewardBanner(q) {
  banner(`${icon('check', 18, '#c4ff2a')} ${icon(questIcon(q), 22, q.color)} <b class="big">+${q.reward.tiles}</b> ${icon('tile', 18)} <small>+${q.reward.points}</small>`, '', 'quest reward', 3600);
}
function gameOver() {
  if (S.over) return;
  S.over = true;
  play('over');
  updateUndoButton();
  $('end-title').textContent = S.daily ? `Desafio do dia · ${dayLabel(S.daily)}` : 'Acabaram as peças';
  $('end-score').textContent = S.score;
  $('end-best').textContent = S.best;
  $('end-stats').innerHTML = `<span>${icon('tile', 14)} ${S.tiles.size}</span><span>★ ${S.perfects}</span><span>${icon('flag', 14)} ${S.questsDone}</span>`;
  setTimeout(() => { showOverlay('overlay-end'); prepareRankForm(); }, 700);
}

// ---------- novo jogo / demonstração / menu ----------
// Desafio do dia: a semente sai da data local, então todo mundo recebe as mesmas peças hoje
// e o ranking do dia compara partidas iguais. `?daily` na URL também abre o desafio.
function todayStr() { const d = new Date(), p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function dailySeed(str) { let h = 2166136261; for (const ch of 'punkromantik:' + str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const dayLabel = (str) => str.slice(8, 10) + '/' + str.slice(5, 7);
function newGame(seed, daily = null) {
  clearBoard();
  S.daily = daily;
  $('daily-chip').textContent = daily ? `📅 desafio ${dayLabel(daily)}` : ''; $('daily-chip').classList.toggle('hidden', !daily);
  if (daily) seed = dailySeed(daily);
  S.rng = new RNG(seed != null ? seed >>> 0 : (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  S.stack = makeStack(S.rng, STACK_SIZE);
  S.score = 0; S.placed = 0; S.perfects = 0; S.questsDone = 0; S.questsLost = 0; S.quests = []; S.over = false; S.started = true; S.tips.clear(); S.lowWarned = false; S.hints = HINTS_PER_GAME; S.sinceQuest = 0; S.pendingGain = 0; S.undo = null; S.gains = {};
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
  const sew = geo && geo.routes ? geo.routes.filter((r) => r.type === 'sewage') : [];
  if (sew.length && Math.random() < 0.6) {
    const route = sew[(Math.random() * sew.length) | 0], p = pointAt(route.pts, Math.random() * route.L), q = local(p.x + (Math.random() - 0.5) * 0.15, p.z + (Math.random() - 0.5) * 0.15);
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
// ---------- fauna: caravanas, ursos e revoadas percorrendo o próprio bioma ----------
// Mesma ideia dos veículos, só que a "via" é o terreno: o bicho vai do meio de uma aresta do seu
// bioma ao meio de outra e, se a peça vizinha casar por aquele lado, atravessa — é isso que faz
// a caravana andar por hexágonos interconectados. Quem anda em bando segue um rastro de migalhas
// do líder (posição + rumo a cada passo), que é o que mantém a fila sem cada bicho ter estado.
const faunaGroup = new THREE.Group();
boardGroup.add(faunaGroup);
const FAUNA = {
  camel: { group: 'rock',  fly: false, speed: 0.27, turn: 2.8, flock: [1, 3], gap: 0.2,  side: 0.016, bob: 0.009, bobHz: 7.5, roll: 0.05, pause: [0.7, 2.6], cap: 3, p2: 0.13, p3: 0.28 },
  bear:  { group: 'plain', fly: false, speed: 0.19, turn: 2.2, flock: [1, 2], gap: 0.22, side: 0.05,  bob: 0.007, bobHz: 5.5, roll: 0.07, pause: [1.2, 3.6], cap: 3, p2: 0.11, p3: 0.24 },
  // Revoada: bando maior e solto. `wander` é o desvio próprio de cada pássaro (duas senoides com
  // frequência sorteada), `lag` embaralha a distância no rastro e `smooth` arredonda a rota —
  // sem os três o bando virava uma fila reta que dava trancos nas quinas do caminho.
  bird:  { group: 'solar', fly: true,  speed: 0.6,  turn: 2.4, flock: [3, 6], gap: 0.13, side: 0.13,  bob: 0.035, bobHz: 2.2, roll: 0,    pause: [0, 0],     cap: 3, p2: 0.13, p3: 0.26,
           smooth: 2.6, wander: 0.11, wanderY: 0.06, lag: 0.26, bank: 0.3 },
  // Iéti: sozinho, lento e raro — é o que faz valer a pena topar com um.
  yeti:  { group: 'plain', fly: false, speed: 0.15, turn: 1.8, flock: [1, 1], gap: 0.3,  side: 0,     bob: 0.012, bobHz: 3.4, roll: 0.09, pause: [1.5, 4.5], cap: 2, p2: 0.05, p3: 0.11 },
};
const FLY_Y = 0.45, PI2 = Math.PI * 2;
const fauna = [];
const faunaGeos = {};
let birdWingGeo = null;
const angWrap = (d) => { while (d > Math.PI) d -= PI2; while (d < -Math.PI) d += PI2; return d; };

function faunaMesh(kind, v) {
  const gk = kind + (kind === 'camel' ? v % 3 : '');
  const geo = faunaGeos[gk] || (faunaGeos[gk] = kind === 'camel' ? buildCamelGeometry(v % 3) : kind === 'bear' ? buildBearGeometry() : kind === 'yeti' ? buildYetiGeometry() : buildBirdGeometry());
  const g = new THREE.Group(), gl = new THREE.Mesh(geo.glow, glowMat);
  gl.layers.enable(BLOOM);
  g.add(new THREE.Mesh(geo.lit, litMat), gl);
  if (kind === 'bird') { // asas separadas para bater; a direita é a mesma malha espelhada
    birdWingGeo = birdWingGeo || buildBirdWingGeometry();
    const wl = new THREE.Mesh(birdWingGeo, litMat), wr = new THREE.Mesh(birdWingGeo, litMat);
    wr.scale.z = -1; g.add(wl, wr); g.userData.wings = [wl, wr];
  }
  return g;
}
const walkableEdge = (t, i, group) => !t.tile.hidden && groupOf(edgeAt(t.tile, t.rot, i)) === group; // bicho entrando no achado oculto entregaria o bioma
// Escolhe a próxima travessia da peça, entrando pela aresta `entry`. Entre as saídas possíveis,
// puxa para as que CONTINUAM na peça vizinha: a graça é o bando atravessando a formação inteira,
// não indo bater na borda e dando meia-volta.
function faunaRoute(f, entry) {
  const t = S.tiles.get(f.k); if (!t) return false;
  const cands = [], open = [];
  for (let i = 0; i < 6; i++) {
    if (i === entry || !walkableEdge(t, i, f.cfg.group)) continue;
    cands.push(i);
    const nb = S.tiles.get(key(t.q + DIRS[i][0], t.r + DIRS[i][1]));
    if (nb && walkableEdge(nb, opp(i), f.cfg.group)) open.push(i);
  }
  const pool = open.length && Math.random() < 0.82 ? open : cands;
  f.entry = entry; f.exit = pool.length ? pool[(Math.random() * pool.length) | 0] : entry;
  f.pts = walkRoute(entry, f.exit, tileGeo(t.tile).hub);
  f.L = pathLength(f.pts); f.s = 0;
  const w = toWorld(t.q, t.r); f.cx = w.x; f.cz = w.z;
  return true;
}
function crumbAt(cr, d) {
  if (d <= cr[0].d) return cr[0];
  for (let i = cr.length - 1; i > 0; i--) {
    if (cr[i - 1].d > d) continue;
    const a = cr[i - 1], b = cr[i], t = (d - a.d) / Math.max(1e-6, b.d - a.d);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, h: a.h + angWrap(b.h - a.h) * t };
  }
  return cr[cr.length - 1];
}
function dropFlock(i) {
  for (const m of fauna[i].members) faunaGroup.remove(m.mesh);
  fauna.splice(i, 1);
}
function addFlock(kind, t, rng) {
  const cfg = FAUNA[kind], edges = [];
  for (let i = 0; i < 6; i++) if (walkableEdge(t, i, cfg.group)) edges.push(i);
  const f = { kind, cfg, k: key(t.q, t.r), crumbs: [], members: [], wait: 0, sp: 1, head: 0, fly: cfg.fly ? FLY_Y + rng.range(-0.1, 0.26) : 0 };
  if (!faunaRoute(f, edges[rng.int(edges.length)])) return;
  f.s = rng.float() * f.L;
  const n = cfg.flock[0] + rng.int(cfg.flock[1] - cfg.flock[0] + 1), y = TILE_H + f.fly;
  const spread = cfg.wander ? rng.range(0.75, 1.7) : 1; // cada revoada tem a sua largura
  const back = cfg.gap * (n - 1) + (cfg.lag || 0) + 0.06;
  for (let i = 12; i >= 0; i--) { // pré-carrega o rastro para o bando já nascer em fila
    const q = pointAt(f.pts, Math.max(0, f.s - (back * i) / 12)), x = f.cx + q.x, z = f.cz + q.z, pv = f.crumbs[f.crumbs.length - 1];
    f.crumbs.push({ x, y, z, h: q.a, d: pv ? pv.d + Math.hypot(x - pv.x, z - pv.z) : 0 });
  }
  f.head = f.crumbs[f.crumbs.length - 1].h;
  for (let m = 0; m < n; m++) {
    const mesh = faunaMesh(kind, m + rng.int(3));
    faunaGroup.add(mesh);
    const mem = { mesh, ph: rng.float() * PI2, wings: mesh.userData.wings };
    if (cfg.wander) { // voo: cada um com o seu posto no bando e o seu bamboleio
      mem.side = cfg.side * spread * rng.range(-1, 1);
      mem.lag = cfg.lag * rng.float();
      mem.up = cfg.wanderY * rng.range(-1.2, 1.2);
      mem.wt = rng.float() * 40;
      mem.wf1 = rng.range(0.5, 1.25); mem.wp1 = rng.float() * PI2;
      mem.wf2 = rng.range(0.7, 1.7); mem.wp2 = rng.float() * PI2;
      mem.amp = spread * rng.range(0.6, 1.4);
    } else mem.side = n === 1 ? 0 : cfg.side * (m % 2 ? 1 : -1) * Math.ceil(m / 2);
    f.members.push(mem);
  }
  fauna.push(f);
}
// Uma peça nova PODE trazer bicho: precisa de 2+ lados do bioma (senão não teria para onde andar)
// e ainda passar no sorteio — a maioria das peças fica sem nada, de propósito.
function spawnFauna(k) {
  const t = S.tiles.get(k); if (!t) return;
  let idx = 0;
  for (const kind of Object.keys(FAUNA)) {
    const cfg = FAUNA[kind]; idx++;
    if (fauna.reduce((n, f) => n + (f.kind === kind ? 1 : 0), 0) >= cfg.cap) continue;
    let n = 0;
    for (let i = 0; i < 6; i++) if (walkableEdge(t, i, cfg.group)) n++;
    if (n < 2) continue;
    const rng = new RNG(((t.tile.seed ^ (0x5eed * idx)) >>> 0) || idx);
    if (rng.chance(n >= 3 ? cfg.p3 : cfg.p2)) addFlock(kind, t, rng);
  }
}
function updateFauna(dt) {
  for (let i = fauna.length - 1; i >= 0; i--) {
    const f = fauna[i], cfg = f.cfg, t = S.tiles.get(f.k);
    if (!t) { dropFlock(i); continue; }
    if (f.wait > 0) f.wait -= dt;
    else {
      f.s += cfg.speed * f.sp * dt;
      if (f.s >= f.L) { // chegou no meio da aresta de saída: atravessa se o vizinho casar por ali
        const e = f.exit, nb = S.tiles.get(key(t.q + DIRS[e][0], t.r + DIRS[e][1]));
        if (nb && walkableEdge(t, e, cfg.group) && walkableEdge(nb, opp(e), cfg.group)) { f.k = key(nb.q, nb.r); faunaRoute(f, opp(e)); }
        else { faunaRoute(f, e); f.wait = cfg.pause[0] + Math.random() * (cfg.pause[1] - cfg.pause[0]); } // sem saída: dá meia-volta
      }
    }
    const p = pointAt(f.pts, Math.min(f.s, f.L));
    let x = f.cx + p.x, z = f.cz + p.z;
    if (cfg.smooth) { // quem voa não segue a poligonal: persegue o ponto do caminho com atraso
      const a = 1 - Math.exp(-dt * cfg.smooth);
      f.smx = f.smx === undefined ? x : f.smx + (x - f.smx) * a;
      f.smz = f.smz === undefined ? z : f.smz + (z - f.smz) * a;
      x = f.smx; z = f.smz;
      const dx = x - (f.px ?? x), dz = z - (f.pz ?? z);
      if (dx * dx + dz * dz > 1e-8) { const d2 = angWrap(Math.atan2(dz, dx) - f.head); f.turnRate = d2 / Math.max(dt, 1e-3); f.head += Math.sign(d2) * Math.min(Math.abs(d2), cfg.turn * dt); }
      f.px = x; f.pz = z; f.sp = 1;
    } else {
      const d = angWrap(p.a - f.head);
      f.head += Math.sign(d) * Math.min(Math.abs(d), cfg.turn * dt);
      f.sp = Math.max(0.12, 1 - Math.abs(d) / 1.1); // quase para para virar
    }
    const y = TILE_H + f.fly, last = f.crumbs[f.crumbs.length - 1];
    const step = Math.hypot(x - last.x, z - last.z);
    if (step > 0.004) f.crumbs.push({ x, y, z, h: f.head, d: last.d + step });
    const headD = f.crumbs[f.crumbs.length - 1].d, keep = cfg.gap * (f.members.length - 1) + (cfg.lag || 0) + 0.3;
    while (f.crumbs.length > 2 && f.crumbs[1].d < headD - keep) f.crumbs.shift();
    for (let m = 0; m < f.members.length; m++) {
      const mem = f.members[m], c = crumbAt(f.crumbs, headD - (m * cfg.gap + (mem.lag || 0)));
      mem.ph += dt * cfg.bobHz * (0.35 + 0.65 * f.sp);
      const nx = -Math.sin(c.h), nz = Math.cos(c.h);
      let side = mem.side, up = Math.sin(mem.ph) * cfg.bob, lean = 0;
      if (cfg.wander) {
        mem.wt += dt;
        const w1 = Math.sin(mem.wt * mem.wf1 + mem.wp1);
        side += cfg.wander * mem.amp * w1;
        up += cfg.wanderY * mem.amp * Math.sin(mem.wt * mem.wf2 + mem.wp2) + mem.up;
        lean = -(cfg.bank || 0) * (mem.amp * mem.wf1 * Math.cos(mem.wt * mem.wf1 + mem.wp1) + (f.turnRate || 0) * 0.25);
      }
      mem.mesh.position.set(c.x + nx * side, c.y + up, c.z + nz * side);
      mem.mesh.rotation.y = -c.h;
      if (cfg.roll) mem.mesh.rotation.z = Math.sin(mem.ph) * cfg.roll;       // gingado
      else if (lean) mem.mesh.rotation.z = Math.max(-0.5, Math.min(0.5, lean)); // inclinação nas curvas
      if (mem.wings) { const fl = Math.sin(mem.ph) * 0.8; mem.wings[0].rotation.x = fl; mem.wings[1].rotation.x = -fl; }
    }
  }
}

// carros percorrem a rede de rodovias entre peças; em bifurcações escolhem um ramo; em pontos finais param e voltam
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
        if (nb && edgeAt(nb.tile, nb.rot, opp(worldEdge)) === 'road') {
          const le = (((opp(worldEdge) - nb.rot) % 6) + 6) % 6, nr = tileGeo(nb.tile).routes || [];
          const cands = []; nr.forEach((r, i) => { if (r.type === 'road' && (r.from === le || r.to === le)) cands.push(i); });
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

// ---------- comboios: trem-bala nos trilhos, barquinhos e patinhos no esgoto ----------
// Antes cada peça de trilho tinha um trem do tamanho do hexágono que só ia e voltava dentro dela.
// Agora: de tempos em tempos nasce um comboio numa rede, entra por uma ponta, segue de peça em
// peça (escolhendo ramos nas bifurcações) e some ao chegar numa ponta aberta. Os vagões de trás
// leem o rastro do primeiro, então fazem as curvas exatamente sobre a via. O esgoto ganhou a
// mesma vida: um rebocador neon soltando bolhas, ou um patinho de borracha amarelo — às vezes
// com a ninhada atrás. Barco não entra no tanque nem bate na torre do filtro: dá meia-volta.
const CONVOY = {
  // Antes o trem exigia rede de 2+ peças e saía a cada 9-19 s: como as redes ficam picadas em
  // pedaços de uma peça boa parte da partida, trem e barco quase nunca apareciam ("sumiram").
  rail:   { minNet: 1, speed: 0.85, gap: 0.215, scale: 1.18, every: [5, 11], ends: 'stop', life: 70 },
  sewage: { minNet: 1, speed: 0.26, gap: 0.085, scale: 1.25, every: [4, 9], ends: 'turn', life: 55 },
};
const trains = [];
let trainGeos = null, boatGeos = {};
const nextIn = { rail: 3, sewage: 4 };
const _tv = new THREE.Vector3();
const hasConnType = (tile, type) => !!((tile.conn && tile.conn.type === type) || (tile.conn2 && tile.conn2.type === type));
function connNetworks(type) {
  const seen = new Set(), nets = [];
  for (const [k, t] of S.tiles) {
    if (seen.has(k) || !hasConnType(t.tile, type)) continue;
    const keys = regionKeys(k, groupOf(type)); for (const x of keys) seen.add(x);
    nets.push([...keys].filter((x) => hasConnType(S.tiles.get(x).tile, type)));
  }
  return nets;
}
function exitOpen(t, localExit, type) { // a saída `localExit` desta peça não tem a mesma via do outro lado?
  if (localExit < 0) return true;
  const we = (localExit + t.rot) % 6, nb = S.tiles.get(key(t.q + DIRS[we][0], t.r + DIRS[we][1]));
  return !(nb && edgeAt(nb.tile, nb.rot, opp(we)) === type);
}
function convoyMeshes(type, lit, glow) {
  const geos = [];
  if (type === 'rail') {
    if (!trainGeos) trainGeos = { head: buildTrainCarGeometry(true), car: buildTrainCarGeometry(false) };
    for (let c = 0; c < 3; c++) geos.push({ geo: c === 0 || c === 2 ? trainGeos.head : trainGeos.car, flip: c === 2, scale: 1 });
  } else if (Math.random() < 0.55) { // patinho de borracha (às vezes com a ninhada)
    boatGeos.duck = boatGeos.duck || buildBoatGeometry('duck');
    const kids = Math.random() < 0.45 ? 1 + ((Math.random() * 3) | 0) : 0;
    geos.push({ geo: boatGeos.duck, scale: 1, duck: true });
    for (let k = 0; k < kids; k++) geos.push({ geo: boatGeos.duck, scale: 0.55, duck: true });
  } else {
    const c = ['#ff3b5c', '#ff7a1a', '#22c8ff', '#ffe02a'][(Math.random() * 4) | 0];
    boatGeos[c] = boatGeos[c] || buildBoatGeometry({ color: c });
    geos.push({ geo: boatGeos[c], scale: 1, tug: true });
  }
  return geos.map((g) => {
    const m = new THREE.Group(), gl = new THREE.Mesh(g.geo.glow, glow); gl.layers.enable(BLOOM); m.add(new THREE.Mesh(g.geo.lit, lit), gl);
    m.userData = { flip: !!g.flip, s: g.scale, duck: g.duck, tug: g.tug, ph: Math.random() * 6.28 };
    m.visible = false; m.scale.setScalar(CONVOY[type].scale * g.scale); boardGroup.add(m);
    return m;
  });
}
function spawnConvoy(type) {
  const spec = CONVOY[type], nets = connNetworks(type).filter((n) => n.length >= spec.minNet); if (!nets.length) return false;
  const net = nets[(Math.random() * nets.length) | 0], ok = (r) => r.type === type;
  // prefere entrar por uma ponta aberta da rede (o comboio "chega" de fora); senão nasce no meio dela
  const starts = [];
  for (const k of net) { const t = S.tiles.get(k), rs = tileGeo(t.tile).routes || []; rs.forEach((r, i) => { if (!ok(r)) return; if (r.to >= 0 && exitOpen(t, r.from, type)) starts.push({ k, i, dir: 1 }); if (r.to >= 0 && exitOpen(t, r.to, type) && !exitOpen(t, r.from, type)) starts.push({ k, i, dir: -1 }); }); }
  let st = starts.length ? starts[(Math.random() * starts.length) | 0] : null;
  if (!st) { const k = net[(Math.random() * net.length) | 0], rs = (tileGeo(S.tiles.get(k).tile).routes || []).map((r, i) => (ok(r) ? i : -1)).filter((i) => i >= 0); if (!rs.length) return false; st = { k, i: rs[(Math.random() * rs.length) | 0], dir: 1 }; }
  const t = S.tiles.get(st.k), r = tileGeo(t.tile).routes[st.i];
  const lit = litMat.clone(), glow = glowMat.clone(); lit.transparent = glow.transparent = true; lit.opacity = glow.opacity = 0;
  const cars = convoyMeshes(type, lit, glow);
  trains.push({ type, spec, tileKey: st.k, route: st.i, dir: st.dir, s: st.dir > 0 ? 0 : r.L, d: 0, trail: [], cars, lit, glow, fade: 0, state: 'run', wait: 0, age: 0, puff: 0 });
  return true;
}
function removeTrain(i) {
  const tr = trains[i]; for (const m of tr.cars) boardGroup.remove(m); tr.lit.dispose(); tr.glow.dispose(); trains.splice(i, 1);
}
function clearTrains() { while (trains.length) removeTrain(trains.length - 1); nextIn.rail = 3; nextIn.sewage = 4; }
function trailAt(tr, d) { // ponto do rastro na distância percorrida `d` (interpolado)
  const T = tr.trail; if (!T.length || d < T[0].d) return null;
  let i = T.length - 1; while (i > 0 && T[i - 1].d > d) i--;
  const b = T[i], a = T[i - 1] || b, f = b.d > a.d ? (d - a.d) / (b.d - a.d) : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f };
}
function updateTrains(dt, now) {
  if (!S.started && !S.tiles.size) return;
  for (const type in CONVOY) {
    const live = trains.filter((x) => x.type === type).length, max = 1 + (S.tiles.size >= 25 ? 1 : 0) + (S.tiles.size >= 55 ? 1 : 0), ev = CONVOY[type].every;
    if (live < max && (nextIn[type] -= dt) <= 0) nextIn[type] = spawnConvoy(type) ? ev[0] + Math.random() * (ev[1] - ev[0]) : 2;
  }
  for (let i = trains.length - 1; i >= 0; i--) {
    const tr = trains[i], t = S.tiles.get(tr.tileKey), spec = tr.spec, type = tr.type;
    if (!t) { removeTrain(i); continue; }
    tr.age += dt;
    let route = tileGeo(t.tile).routes[tr.route];
    if (tr.state === 'run') {
      const step = spec.speed * dt; tr.s += tr.dir * step; tr.d += step;
      if (route.stop) { // barco: obstáculo no miolo (tanque, filtro, grade) → meia-volta
        const p = pointAt(route.pts, Math.max(0, Math.min(route.L, tr.s)));
        if (Math.hypot(p.x, p.z) < route.stop) { tr.dir *= -1; tr.s += tr.dir * step * 2; }
      }
      if (tr.s > route.L || tr.s < 0) {
        const localExit = tr.dir > 0 ? route.to : route.from, over = tr.dir > 0 ? tr.s - route.L : -tr.s;
        let moved = false;
        if (localExit >= 0 && !exitOpen(t, localExit, type) && tr.age < spec.life) {
          const we = (localExit + t.rot) % 6, nk = key(t.q + DIRS[we][0], t.r + DIRS[we][1]), nb = S.tiles.get(nk);
          const le = (((opp(we) - nb.rot) % 6) + 6) % 6, nr = tileGeo(nb.tile).routes || [];
          const cands = []; nr.forEach((r2, j) => { if (r2.type === type && (r2.from === le || r2.to === le)) cands.push(j); });
          // nas bifurcações, prefere o ramo que continua em outra peça (a graça é atravessar a rede)
          const onward = cands.filter((j) => { const r2 = nr[j], out = r2.from === le ? r2.to : r2.from; return out >= 0 && !exitOpen(nb, out, type); });
          const pool = onward.length && Math.random() < 0.8 ? onward : cands;
          if (pool.length) {
            const j = pool[(Math.random() * pool.length) | 0], r2 = nr[j];
            if (r2.from === le) { tr.dir = 1; tr.s = Math.min(over, r2.L); } else { tr.dir = -1; tr.s = Math.max(r2.L - over, 0); }
            tr.route = j; tr.tileKey = nk; route = r2; moved = true;
          }
        }
        if (!moved) {
          if (localExit < 0 && spec.ends === 'turn') { tr.dir *= -1; tr.s = Math.max(0, Math.min(route.L, tr.s)); } // barco no fim do canal: volta
          else { tr.ext = Math.abs(over); tr.s = Math.max(0, Math.min(route.L, tr.s)); tr.state = localExit < 0 ? 'stop' : 'leave'; tr.wait = localExit < 0 ? 2.2 : 0; tr.ext = localExit < 0 ? 0 : tr.ext; }
        }
      }
      if (tr.age > spec.life + 10 && tr.state === 'run') { tr.state = 'leave'; tr.parked = true; } // barco perdido num canal fechado: some devagar
    } else if (tr.state === 'stop') { if ((tr.wait -= dt) <= 0) { tr.state = 'leave'; tr.parked = true; } }
    else if (tr.state === 'leave' && !tr.parked) { const step = spec.speed * dt; tr.ext += step; tr.d += step; } // ponta aberta: segue reto para fora da rede enquanto some
    const cur = S.tiles.get(tr.tileKey), p = pointAt(route.pts, Math.max(0, Math.min(route.L, tr.s))), ex = (tr.ext || 0) * tr.dir;
    const lx = p.x + Math.cos(p.a) * ex, lz = p.z + Math.sin(p.a) * ex;
    _tv.set(lx, TILE_H + routeLift(route, lx, lz) + (type === 'sewage' ? 0.012 : 0), lz).applyMatrix4(cur.group.matrix);
    const last = tr.trail[tr.trail.length - 1];
    if (!last || Math.abs(tr.d - last.d) > 0.012) { tr.trail.push({ x: _tv.x, y: _tv.y, z: _tv.z, d: tr.d }); if (tr.trail.length > 400) tr.trail.shift(); }
    // aparece entrando e some saindo (sem pular de repente)
    tr.fade = tr.state === 'leave' ? tr.fade - dt * 1.4 : Math.min(1, tr.fade + dt * 1.6);
    if (tr.fade <= 0 && tr.state === 'leave') { removeTrain(i); continue; }
    tr.lit.opacity = tr.glow.opacity = Math.max(0, tr.fade);
    const tt = now * 0.001;
    tr.cars.forEach((m, c) => {
      const dc = tr.d - c * spec.gap, a = trailAt(tr, dc), b = trailAt(tr, dc - 0.04) || a, f = trailAt(tr, dc + 0.04) || a;
      if (!a) { m.visible = false; return; }
      m.visible = true; m.position.set(a.x, a.y, a.z);
      const dx = f.x - b.x, dz = f.z - b.z; if (Math.abs(dx) + Math.abs(dz) > 1e-5) m.rotation.y = -Math.atan2(dz, dx) + (m.userData.flip ? Math.PI : 0);
      if (type === 'sewage') { // boia: sobe e desce, balança, e o patinho dá umas viradinhas de curiosidade
        const u = m.userData; m.position.y += Math.sin(tt * 3.1 + u.ph) * 0.004;
        m.rotation.z = Math.sin(tt * 2.3 + u.ph) * 0.12; m.rotation.x = Math.sin(tt * 1.7 + u.ph) * 0.08;
        if (u.duck) m.rotation.y += Math.sin(tt * 0.9 + u.ph) * 0.35;
      }
    });
    if (type === 'sewage' && tr.cars[0].userData.tug && tr.fade > 0.5 && (tr.puff -= dt) <= 0) { // fumacinha de bolhas da chaminé
      tr.puff = 0.35 + Math.random() * 0.3; const m = tr.cars[0], r = m.rotation.y;
      addParticle({ x: m.position.x - Math.cos(r) * 0.045, y: m.position.y + 0.08, z: m.position.z + Math.sin(r) * 0.045 }, Math.random() < 0.5 ? '#c4ff2a' : '#2dffb8', { vy: 0.22, life: 1.2, size: 0.35 + Math.random() * 0.3, mode: 'rise', wob: 0.1, wf: 3 });
    }
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
  const hasFx = fx.sides > 0 || hoverFx.k > 0.01 || confetti.length > 0 || stars.length > 0;
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
  }  updateStars(dt, dpr);
}
// Estrelas da harmonia: sobem pelas duas laterais da tela, girando e cintilando na cor do bioma
// completado (com algumas douradas), enquanto as faixas laterais piscam em flashes curtos da mesma cor.
const stars = [];
function starBurst(color, n = 26) {
  const W = innerWidth, H = innerHeight;
  for (const side of [0, 1]) for (let i = 0; i < n; i++) {
    const dir = side ? -1 : 1;
    stars.push({ x: side ? W - 6 - Math.random() * 40 : 6 + Math.random() * 40, y: H * (0.55 + Math.random() * 0.5), vx: dir * (30 + Math.random() * 140), vy: -(260 + Math.random() * 420),
      r: 7 + Math.random() * 11, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 6, c: Math.random() < 0.3 ? '#ffd166' : color, t: -Math.random() * 0.5, life: 1.3 + Math.random() * 0.9, ph: Math.random() * 6 });
  }
}
function drawStar(ctx, r) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function updateStars(dt, dpr) {
  for (let i = stars.length - 1; i >= 0; i--) {
    const p = stars[i]; p.t += dt; if (p.t < 0) continue;
    p.vy += 160 * dt; p.vx *= 1 - 1.2 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.t >= p.life) { stars.splice(i, 1); continue; }
    const fade = Math.min(1, (p.life - p.t) / 0.5, p.t / 0.12), tw = 0.7 + 0.3 * Math.sin(p.t * 22 + p.ph);
    cctx.save(); cctx.globalCompositeOperation = 'lighter'; cctx.globalAlpha = fade * tw;
    cctx.translate(p.x * dpr, p.y * dpr); cctx.rotate(p.rot); cctx.scale(dpr, dpr);
    cctx.shadowColor = p.c; cctx.shadowBlur = 14; cctx.fillStyle = p.c; drawStar(cctx, p.r);
    cctx.shadowBlur = 0; cctx.fillStyle = '#ffffff'; cctx.globalAlpha = fade * tw * 0.8; drawStar(cctx, p.r * 0.4);
    cctx.restore();
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
// número flutuando sobre uma casa do tabuleiro (sobe e some)
function popup(text, w, cls = '', y = 0.5) {
  const p = screenOf(w, y); if (!p) return;
  const el = document.createElement('div');
  el.className = `popup ${cls}`; el.textContent = text;
  el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
  $('popups').appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
// Letreiro neon animado com os pontos: letras pulam uma a uma, o letreiro voa até o placar e o número rola
let scoreShown = 0, scoreRoll = null;
function scoreSign(pts, cls = '', sub = '', w = null) {
  if (isNarrow() && w) { // celular: nada no meio da tela — número pequeno sobe da peça e o placar rola
    popup(`+${pts}`, w, cls === 'perfect' ? 'perfect' : cls === 'quest' ? 'pquest' : pts >= 30 ? 'good' : '');
    setTimeout(() => bumpScore(cls), 500);
    return;
  }
  const el = document.createElement('div');
  el.className = `sign ${cls}`;
  const chars = `+${pts}`.split('');
  el.innerHTML = chars.map((c, i) => `<span style="--i:${i}">${c}</span>`).join('') + `<small style="--i:${chars.length}">${sub || (pts >= 60 ? 'incrível!' : pts >= 30 ? 'ótimo!' : 'pontos')}</small>`;
  $('signs').appendChild(el);
  const target = $('score').getBoundingClientRect(), start = () => el.getBoundingClientRect();
  setTimeout(() => {
    const r = start(), dx = target.left + target.width / 2 - (r.left + r.width / 2), dy = target.top + target.height / 2 - (r.top + r.height / 2);
    el.animate([{ transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.25)`, opacity: 0.2 }], { duration: 520, easing: 'cubic-bezier(0.55, 0, 1, 0.45)', fill: 'forwards' })
      .onfinish = () => { el.remove(); bumpScore(cls); };
  }, 950 + Math.min(600, chars.length * 70));
}
// placar recebe os pontos: salta, brilho atravessa, faíscas, "+N" escorrega por baixo e o número rola
let recordFrom = 0; // recorde de antes desta partida — passou dele, o placar entra em modo "novo recorde"
function bumpScore(cls = '') {
  const sb = $('score-box'), gain = S.score - scoreShown;
  sb.classList.remove('pulse'); void sb.offsetWidth; sb.classList.add('pulse', 'rolling');
  scoreRoll = { from: scoreShown, to: S.score, t: 0 };
  if (gain <= 0) return;
  const kind = cls === 'perfect' ? 'perfect' : cls === 'quest' ? 'quest' : '';
  sb.querySelectorAll('.sb-gain').forEach(g => g.remove());
  const g = document.createElement('div'); g.className = `sb-gain ${kind}`; g.textContent = `+${gain}`;
  sb.appendChild(g); setTimeout(() => g.remove(), 1150);
  const colors = kind === 'perfect' ? ['#7dff9a', '#22f3ff', '#fff'] : kind === 'quest' ? ['#c4ff2a', '#ffe93a', '#fff'] : ['#ffe93a', '#ff2bd6', '#22f3ff', '#fff'];
  const n = Math.min(18, 8 + Math.round(gain / 10)), w = sb.offsetWidth;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.4, d = w * (0.45 + Math.random() * 0.35);
    const sp = document.createElement('i'); sp.className = 'sb-spark';
    sp.style.cssText = `--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d * 0.55).toFixed(1)}px;--c:${colors[i % colors.length]}`;
    sb.appendChild(sp); setTimeout(() => sp.remove(), 750);
  }
}
function syncRecord() { $('score-box').classList.toggle('record', recordFrom > 0 && scoreShown > recordFrom); }
function rollScore(dt) {
  if (scoreRoll) { scoreRoll.t += dt; const p = Math.min(1, scoreRoll.t / 0.55), e = 1 - Math.pow(1 - p, 3); scoreShown = Math.round(scoreRoll.from + (scoreRoll.to - scoreRoll.from) * e); $('score').textContent = scoreShown; if (p >= 1) { scoreRoll = null; $('score-box').classList.remove('rolling'); syncRecord(); } }
  else if (scoreShown !== S.score && !document.querySelector('#signs .sign')) { scoreShown = S.score; $('score').textContent = scoreShown; syncRecord(); }
}
let toastTimer = null;
function toast(msg, ms = 2600) {
  const t = $('toast'); t.innerHTML = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
function banner(title, sub, cls = '', ms = 3000) {
  const box = $('banners');
  while (box.children.length >= 1) box.firstChild.remove();
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
// texto da missão: "ligue 8+ peças de Sandpunk" / "cidade com exatamente 14 prédios"
function questText(q) {
  if (q.kind === 'city') return q.exact ? `cidade com <b>exatamente ${q.target}</b> prédios` : `cidade com <b>pelo menos ${q.target}</b> prédios`;
  return `ligue <b>${q.target} ou mais</b> peças de <b>${GROUP_INFO[q.group].name}</b>`;
}
// balão: ícone do grupo num disco da cor do grupo + número escuro sobre fundo amarelo
const labelHTML = (q, num) => `<i class="qarrow"></i><span class="qlic">${icon(questIcon(q), 15)}</span>${num}${icon(q.kind === 'city' ? 'city' : 'tile', 11, 'currentColor', 'unit')}`;
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
let pendLabel = null;
function renderQuests(delayMs = 0) {
  const el = $('quests'), lab = $('qlabels');
  const build = () => {
    el.innerHTML = ''; lab.innerHTML = '';
    const pend = S.current && S.current.quest && !S.over ? S.current.quest : null;
    if (pend) { // missão da peça na mão: card tracejado com ícone, alvo e recompensa (começa quando a peça for colocada)
      const d = document.createElement('div'); d.className = 'quest pending'; d.style.setProperty('--qc', pend.color || GROUP_INFO[pend.group].color);
      d.innerHTML = `<div class="qhead"><span class="qicon">${icon(questIcon(pend), 21)}</span><span class="qleft">${questGoal(pend)}</span><span class="qunit">${icon(pend.kind === 'city' ? 'city' : 'tile', 13)}</span><span class="qrew">+${pend.reward.tiles}${icon('tile', 11)}${pend.reward.hints ? ` +${pend.reward.hints}${icon('bulb', 11)}` : ''}</span></div>
        <div class="qbody"><div class="qin"><p>Nova missão: ${questText(pend)} a partir desta peça.</p><p class="qr">Recompensa: <b>+${pend.reward.points}</b> pts · <b>+${pend.reward.tiles}</b> peças${pend.reward.hints ? ' · <b>+1</b> dica' : ''}</p></div></div>`;
      d.addEventListener('click', () => d.classList.toggle('open'));
      el.appendChild(d);
    }
    for (const q of S.quests) {
      const info = GROUP_INFO[q.group], left = questLeft(q), pct = Math.max(0, Math.min(1, q.progress / q.target)), ic = questIcon(q);
      const d = document.createElement('div'); d.className = 'quest' + (q._open ? ' open' : ''); d.style.setProperty('--qc', q.color || info.color);
      const R = 17, C = 2 * Math.PI * R;
      d.innerHTML = `<div class="qhead">
          <span class="qicon"><svg class="qring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="${R}"/><circle cx="20" cy="20" r="${R}" style="stroke-dasharray:${C};stroke-dashoffset:${C * (1 - pct)}"/></svg>${icon(ic, 21)}</span>
          <span class="qleft${q._bump ? ' bump' : ''}">${left}${plus(q)}</span><span class="qunit">${icon(q.kind === 'city' ? 'city' : 'tile', 13)}</span>
          <span class="qrew">+${q.reward.tiles}${icon('tile', 11)}${q.reward.hints ? ` +${q.reward.hints}${icon('bulb', 11)}` : ''}</span>
        </div>
        <div class="qbody"><div class="qin">
          <p>${cap(questText(q))} a partir da bandeira — já são <b>${q.progress}</b>, faltam <b>${left}</b>.</p>
          <p class="qr">Recompensa: <b>+${q.reward.points}</b> pts · <b>+${q.reward.tiles}</b> peças${q.reward.hints ? ' · <b>+1</b> dica' : ''}${q.exact ? ' · passar do número cancela a missão' : ' · passar do número também vale'}</p>
          <button class="qgo" type="button">${icon('pin', 14)} ir até a bandeira</button>
        </div></div>`;
      q._bump = false;
      d.addEventListener('click', (e) => {
        if (e.target.closest('.qgo')) { const t = S.tiles.get(q.tileKey); if (t) { const w = toWorld(t.q, t.r); rig.flyTo(w.x, w.z); pulse(w, new THREE.Color(q.color).getHex()); } return; }
        const open = !d.classList.contains('open');
        for (const o of S.quests) o._open = false; el.querySelectorAll('.quest.open').forEach((x) => x.classList.remove('open'));
        q._open = open; d.classList.toggle('open', open);
      });
      q._card = d; el.appendChild(d);
      const l = document.createElement('div'); l.className = 'qlabel'; l.style.setProperty('--qc', q.color || info.color);
      l.innerHTML = labelHTML(q, `<b>${left}${plus(q)}</b>`);
      l.addEventListener('click', () => { const t = S.tiles.get(q.tileKey); if (t) { const w = toWorld(t.q, t.r); rig.flyTo(w.x, w.z); pulse(w, new THREE.Color(q.color).getHex()); } });
      q._label = l; lab.appendChild(l);
    }
    pendLabel = null;
    if (pend) { // a peça na mão também ganha o balão: a bandeira sozinha não dizia que ali tem peças a ganhar
      const l = document.createElement('div'); l.className = 'qlabel pending'; l.style.setProperty('--qc', pend.color || GROUP_INFO[pend.group].color);
      l.innerHTML = labelHTML(pend, `<b>${questGoal(pend)}</b>`) + `<span class="qgain">+${pend.reward.tiles}${icon('tile', 11)}${pend.reward.hints ? ` +1${icon('bulb', 11)}` : ''}</span>`;
      pendLabel = l; lab.appendChild(l);
    }
    $('quests-title').classList.toggle('hidden', S.quests.length === 0 && !pend);
    if (S.selected && S.current && !S.over) { const ev = evalPlacement(S.selected.q, S.selected.r, S.current, S.rot); previewQuests(ev.legal ? formationGroups(S.selected.q, S.selected.r, ev) : new Map()); }
  };
  if (delayMs) setTimeout(build, delayMs); else build();
}
// balão e cartão mostram "falta X → Y" para as missões que esta jogada mexeria (verde = fecha, vermelho = passa do número)
function previewQuests(byGroup) {
  for (const q of S.quests) {
    const keys = byGroup.get(q.group);
    let proj = null;
    if (keys && keys.has(q.tileKey) && S.current) {
      if (q.kind === 'city') { let sum = buildingsOf(S.current); for (const k of keys) sum += buildingsOf(S.tiles.get(k).tile); proj = sum; }
      else proj = keys.size + 1;
    }
    const left = questLeft(q), raw = proj == null ? null : q.target - proj, newLeft = raw == null ? null : q.exact ? raw : Math.max(0, raw);
    const cls = newLeft == null ? '' : newLeft === 0 ? 'hit' : newLeft < 0 ? 'over' : '';
    const html = newLeft == null || newLeft === left ? `<b>${left}${plus(q)}</b>` : `<b>${left}${plus(q)}<span class="to">→ ${newLeft < 0 ? '✕' : newLeft === 0 ? '✓' : newLeft}</span></b>`;
    if (q._label) { q._label.innerHTML = labelHTML(q, html); q._label.className = 'qlabel ' + cls; }
    if (q._card) { const ql = q._card.querySelector('.qleft'); if (ql) { ql.innerHTML = html.replace(/^<b>|<\/b>$/g, ''); ql.classList.toggle('hit', cls === 'hit'); ql.classList.toggle('over', cls === 'over'); } }
  }
}
function updateQuestLabels() {
  if (pendLabel) { // balão da peça na mão acompanha o fantasma
    const vis0 = ghostGroup.visible && S.current && S.current.quest && !S.over;
    const v = vis0 ? new THREE.Vector3(ghostGroup.position.x, ghostGroup.position.y + 0.95, ghostGroup.position.z).project(camera) : null;
    const vis = v && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    pendLabel.style.display = vis ? '' : 'none';
    if (vis) { pendLabel.style.left = `${((v.x + 1) / 2) * innerWidth}px`; pendLabel.style.top = `${((1 - v.y) / 2) * innerHeight}px`; }
  }
  // bandeira fora da tela: o balão encosta na borda com uma seta apontando para ela (toque = ir até lá)
  const W = innerWidth, Hh = innerHeight, narrow = isNarrow(), top = narrow ? 120 : 96, bottom = Hh - (narrow ? 200 : 150), side = 30, edgeIn = 62, cards = $('quests').getBoundingClientRect();
  for (const q of S.quests) {
    const t = S.tiles.get(q.tileKey), l = q._label; if (!t || !l) continue;
    const w = toWorld(t.q, t.r), v = new THREE.Vector3(w.x, 0.95, w.z).project(camera);
    let x = ((v.x + 1) / 2) * W, y = ((1 - v.y) / 2) * Hh;
    const behind = v.z > 1; if (behind) { x = W - x; y = Hh - y; }
    const inside = !behind && x > side && x < W - side && y > top && y < bottom;
    l.style.display = '';
    l.classList.toggle('edge', !inside);
    if (!inside) {
      const cx = W / 2, cy = (top + bottom) / 2; let dx = x - cx, dy = y - cy; if (!dx && !dy) dy = 1;
      const f = Math.min(Math.abs(dx) > 1e-3 ? (W / 2 - edgeIn) / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-3 ? (dy < 0 ? cy - top - 20 : bottom - cy - 20) / Math.abs(dy) : Infinity);
      x = cx + dx * f; y = cy + dy * f; l.style.setProperty('--ang', `${Math.atan2(dy, dx)}rad`);
      if (cards.height && x > cards.left - 70 && y < cards.bottom + 30) y = cards.bottom + 34; // não cobre a coluna de cartões
    }
    l.style.left = `${x}px`; l.style.top = `${y}px`;
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
  if (!S.started || S.score === 0) { scoreShown = S.score; $('score').textContent = S.score; recordFrom = S.best; syncRecord(); }
  const total = S.stack.length + (S.current ? 1 : 0), shown = Math.max(0, total - S.pendingGain);
  setStackCount(shown, animateCount);
  $('best').textContent = S.best;
  const low = S.started && !S.over && total <= 5;
  $('stack-area').classList.toggle('low', low);
  if (low && !S.lowWarned) { S.lowWarned = true; play('warn'); } // o contador vermelho piscando já avisa
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
    const res = await fetch(RANK_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, score: S.score, tiles: S.tiles.size, perfects: S.perfects, quests: S.questsDone, daily: S.daily || undefined }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    $('rank-status').innerHTML = `${icon('trophy', 16, '#ffe93a')} você ficou em <b>${data.rank}º</b> de ${data.total}${S.daily ? ` no desafio de ${dayLabel(S.daily)}` : ''}`;
    renderRankList($('rank-list'), data.top, name, data.rank);
  } catch (err) {
    $('rank-status').textContent = 'ranking indisponível agora — seu recorde ficou salvo neste navegador';
    rankSubmitted = false; $('rank-submit').disabled = false; $('rank-name').disabled = false;
  }
}
let rankTab = 'all';
async function openRanking(tab) {
  if (typeof tab === 'string') rankTab = tab;
  showOverlay('overlay-rank');
  document.querySelectorAll('.rank-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === rankTab));
  const ol = $('rank-list-all'), day = todayStr(); ol.innerHTML = '<li class="empty">carregando…</li>'; $('rank-total').textContent = '';
  try {
    const res = await fetch(`${RANK_API}?limit=30${rankTab === 'daily' ? `&daily=${day}` : ''}`); if (!res.ok) throw new Error();
    const data = await res.json();
    renderRankList(ol, data.top, localStorage.getItem('pr_name') || '', 0);
    if (!data.top.length && rankTab === 'daily') ol.innerHTML = '<li class="empty">ninguém jogou o desafio de hoje ainda</li>';
    $('rank-total').textContent = rankTab === 'daily' ? `desafio de ${dayLabel(day)} · ${data.total} partidas` : data.total ? `${data.total} partidas registradas` : '';
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
  if (S.hints <= 0) { play('bad'); return; }
  if (!applyBest()) return;
  S.hints--; play('select'); updateHintButton();
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
$('btn-daily').addEventListener('click', () => { initAudio(); showOverlay(null); newGame(null, todayStr()); });
document.querySelectorAll('.rank-tab').forEach((b) => b.addEventListener('click', () => openRanking(b.dataset.tab)));
$('btn-restart').addEventListener('click', () => { showOverlay(null); newGame(null, S.daily ? todayStr() : null); });
$('btn-look').addEventListener('click', () => showOverlay(null));
$('rank-form').addEventListener('submit', submitScore);
$('menu-continue').addEventListener('click', () => showOverlay(null));
$('menu-restart').addEventListener('click', () => { showOverlay(null); newGame(null, S.daily ? todayStr() : null); });
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
      if (S.stack[0] && S.stack[0].quest && stackTopGroup) spawnRingPulse(stackTopGroup, 0, TILE_H + 0.012, 0, S.stack[0].quest.color); // sai do centro do hexágono, sobre o topo da peça
      if (S.current && S.current.quest) { spawnRingPulse(uiScene, 50, TILE_H + 0.012, 0, S.current.quest.color); if (ghostGroup.visible) spawnRingPulse(scene, ghostGroup.position.x, TILE_H + 0.02, ghostGroup.position.z, S.current.quest.color, true); }
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
  for (const m of auroraMats) m.uniforms.time.value = now * 0.001;
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
  updateTrains(dt, now);
  updateHarmonyFx(dt, now); updateRelic(dt, now);
  updateFauna(dt);
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
window.PR = { S, addHarmonyFx, starBurst, revealAround, setRelicHidden, bumpScore, rig, camera, trains, connNetworks, spawnConvoy, harmonyGroup, spawnRelic, previewBonus, renderQuests, closedRegions, frontier, toWorld, selectSlot, commitPlacement, hint, applyBest, rotate, evalPlacement, bestPlacement, newGame, confettiBurst, banner, vehicles, fauna, fx, hoverFx, kick, undoLast, rewardTiles, checkQuests, regionKeys, buildingsOf, tileGeo, showOverlay, addTile, refreshSlots, genTile, RNG };
const params = new URLSearchParams(location.search);
if (params.has('nobloom')) prefs.bloom = false;
if (params.has('nolens')) prefs.lens = false;
if (params.has('nograin')) prefs.grain = false;
$('grain').classList.toggle('hidden', !prefs.grain);
if (params.has('play')) {
  showOverlay(null); newGame(params.has('seed') ? +params.get('seed') : undefined, params.has('daily') ? todayStr() : null);
  if (params.get('zoom')) rig.dist = +params.get('zoom');
  const auto = +(params.get('auto') || 0); // ?play&auto=N joga N peças sozinho (teste/demonstração)
  if (auto > 0) { let n = 0; const iv = setInterval(() => { if (S.over || n++ >= auto) return clearInterval(iv); applyBest(); commitPlacement(); }, 350); }
} else demoBoard(30);
updateHUD(false);
requestAnimationFrame(loop);
