// Desenho 2D de uma peça (para o HUD e a fila de próximas peças)
import { edgeAngle, vertexAngle, groundAt, APO } from './hex.js?v=20261011h';

const G2D = { plain: '#a9c7dd', grass: '#cdb68c', cyber: '#14162e', solar: '#4fc43f', rock: '#9a6538', pool: '#0d5a4c' }; // acompanha PAL.ground de tilemesh.js

export function drawTilePreview(canvas, tile, rot = 0, opts = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (!tile) return;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 4;
  const vx = (i) => cx + Math.cos(vertexAngle(i)) * R, vy = (i) => cy + Math.sin(vertexAngle(i)) * R;

  for (let i = 0; i < 6; i++) { // setores
    const g = groundAt(tile, rot, i);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(vx(i), vy(i)); ctx.lineTo(vx(i + 1), vy(i + 1)); ctx.closePath();
    ctx.fillStyle = G2D[g]; ctx.fill();
    drawGlyphs(ctx, g, cx, cy, R, i);
  }
  for (const cn of [tile.conn, tile.conn2]) if (cn) { // conector (2 saídas: curva; 1 ou 3: ramos até o centro); no cruzamento o de cima vem por último
    const ex = cn.exits.map((e) => (e + rot) % 6), P = (e) => [cx + Math.cos(edgeAngle(e)) * R * APO, cy + Math.sin(edgeAngle(e)) * R * APO];
    const stroke = (color, w, dash) => {
      ctx.beginPath();
      if (ex.length === 2) { const [ax, ay] = P(ex[0]), [bx, by] = P(ex[1]); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, bx, by); }
      else for (const e of ex) { const [ax, ay] = P(e); ctx.moveTo(ax, ay); ctx.lineTo(cx, cy); }
      ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'butt'; ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    };
    if (cn.type === 'sewage') { stroke('#3b3f52', R * 0.3); stroke('#0c5a4a', R * 0.18); stroke('#2dffb8', R * 0.05, [R * 0.1, R * 0.08]); }
    else if (cn.type === 'rail') { stroke('#7a7d8f', R * 0.26); stroke('#d5d9e6', R * 0.16, [R * 0.06, R * 0.06]); }
    else { stroke('#2b2e42', R * 0.28); stroke('#ffe36a', R * 0.03, [R * 0.08, R * 0.06]); }
  }
  ctx.beginPath(); // contorno
  for (let i = 0; i < 6; i++) i ? ctx.lineTo(vx(i), vy(i)) : ctx.moveTo(vx(i), vy(i));
  ctx.closePath(); ctx.strokeStyle = opts.stroke || 'rgba(255,255,255,0.85)'; ctx.lineWidth = opts.lineWidth || 2; ctx.stroke();

  if (tile.quest) { // bandeira de missão
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = tile.quest.color; ctx.fill();
    ctx.strokeStyle = '#1b1030'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#1b1030'; ctx.font = `bold ${Math.round(R * 0.24)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(tile.quest.target), cx, cy + 1);
  }
}

function drawGlyphs(ctx, g, cx, cy, R, i) {
  const a = edgeAngle(i), px = cx + Math.cos(a) * R * 0.55, py = cy + Math.sin(a) * R * 0.55;
  ctx.save();
  if (g === 'cyber') {
    ctx.fillStyle = '#ff2bd6'; ctx.fillRect(px - R * 0.1, py - R * 0.02, R * 0.06, R * 0.14);
    ctx.fillStyle = '#22f3ff'; ctx.fillRect(px + R * 0.02, py - R * 0.1, R * 0.06, R * 0.22);
  } else if (g === 'solar') {
    ctx.fillStyle = '#ffd21f'; ctx.beginPath(); ctx.arc(px + R * 0.1, py - R * 0.08, R * 0.035, 0, 7); ctx.fill(); // girassol
    ctx.fillStyle = '#17692f';
    for (const [ox, oy] of [[-0.09, 0.04], [0.07, -0.02]]) { ctx.beginPath(); ctx.moveTo(px + ox * R, py + (oy - 0.1) * R); ctx.lineTo(px + (ox - 0.07) * R, py + (oy + 0.06) * R); ctx.lineTo(px + (ox + 0.07) * R, py + (oy + 0.06) * R); ctx.closePath(); ctx.fill(); }
  } else if (g === 'rock') { // zigurate: três degraus e o santuário
    ctx.fillStyle = '#c68a52';
    for (let k = 0; k < 3; k++) ctx.fillRect(px - R * (0.13 - k * 0.035), py + R * (0.07 - k * 0.05), R * (0.26 - k * 0.07), R * 0.05);
    ctx.fillStyle = '#e0b47e'; ctx.fillRect(px - R * 0.035, py - R * 0.11, R * 0.07, R * 0.04);
    ctx.fillStyle = '#4f7bff'; ctx.fillRect(px - R * 0.13, py + R * 0.065, R * 0.26, R * 0.012);
  } else if (g === 'grass') {
    ctx.fillStyle = '#8fae4a'; for (const ox of [-0.06, 0, 0.06]) { ctx.beginPath(); ctx.moveTo(px + ox * R, py + R * 0.05); ctx.lineTo(px + (ox + 0.015) * R, py - R * 0.05); ctx.lineTo(px + (ox + 0.03) * R, py + R * 0.05); ctx.closePath(); ctx.fill(); }
  } else if (g === 'pool') {
    ctx.fillStyle = '#2dffb8'; ctx.beginPath(); ctx.arc(px - R * 0.06, py, R * 0.04, 0, 7); ctx.arc(px + R * 0.06, py + R * 0.05, R * 0.03, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#9ff5ff'; ctx.beginPath(); ctx.moveTo(px, py - R * 0.09); ctx.lineTo(px + R * 0.05, py + R * 0.04); ctx.lineTo(px - R * 0.05, py + R * 0.04); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
