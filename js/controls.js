// Câmera orbital + entrada de mouse/toque. Distingue "toque" de "arrasto".
const THREE = window.THREE;

export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera; this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 0);
    this.azimuth = -0.9; this.polar = 0.92; this.dist = 11;
    this.minDist = 4.5; this.maxDist = 34;
    this.autoOrbit = false;
    this.update();
  }
  update(dt = 0) {
    if (this.autoOrbit) this.azimuth += dt * 0.12;
    const sp = Math.sin(this.polar);
    this.camera.position.set(
      this.target.x + this.dist * sp * Math.cos(this.azimuth),
      this.target.y + this.dist * Math.cos(this.polar),
      this.target.z + this.dist * sp * Math.sin(this.azimuth));
    this.camera.lookAt(this.target);
  }
  pan(dx, dy) {
    this._fly = null;
    const k = (2 * this.dist * Math.tan((this.camera.fov * Math.PI) / 360)) / this.dom.clientHeight;
    const f = new THREE.Vector3(-Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));
    const r = new THREE.Vector3(Math.sin(this.azimuth), 0, -Math.cos(this.azimuth));
    this.target.addScaledVector(r, -dx * k).addScaledVector(f, (dy * k) / Math.max(0.4, Math.sin(this.polar)));
    this.target.x = Math.max(-60, Math.min(60, this.target.x));
    this.target.z = Math.max(-60, Math.min(60, this.target.z));
  }
  orbit(dx, dy) {
    this.azimuth += dx * 0.006;
    this.polar = Math.max(0.3, Math.min(1.3, this.polar + dy * 0.005));
  }
  zoom(f) { this.dist = Math.max(this.minDist, Math.min(this.maxDist, this.dist * f)); }
  flyTo(x, z) { this._fly = { x, z, sx: this.target.x, sz: this.target.z, t: 0 }; }
  tick(dt) {
    if (this._fly) {
      const f = this._fly; f.t += dt * 1.6;
      const a = Math.min(1, f.t), e = 1 - Math.pow(1 - a, 3);
      this.target.x = f.sx + (f.x - f.sx) * e;
      this.target.z = f.sz + (f.z - f.sz) * e;
      if (a >= 1) this._fly = null;
    }
    this.update(dt);
  }
}

// handlers: { onTap(x,y,e), onHover(x,y), onRotate(dir), onWheelZoom }
export function attachInput(dom, rig, handlers) {
  const pointers = new Map();
  let moved = false, pinch = null, lastTapTime = 0;
  dom.style.touchAction = 'none';
  dom.addEventListener('contextmenu', (e) => e.preventDefault());

  dom.addEventListener('pointerdown', (e) => {
    dom.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, button: e.button, type: e.pointerType });
    if (pointers.size === 1) moved = false;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      moved = true;
    }
  });
  dom.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) { if (e.pointerType === 'mouse' && e.buttons === 0) handlers.onHover(e.clientX, e.clientY); return; }
    const p = pointers.get(e.pointerId);
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 7) moved = true;
    if (pointers.size === 1) {
      if (p.button === 2 || p.button === 1 || e.shiftKey) rig.orbit(dx, dy); else rig.pan(dx, dy);
    } else if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (pinch.dist > 0) rig.zoom(pinch.dist / d);
      let da = ang - pinch.ang; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
      rig.azimuth -= da;
      rig.pan(mx - pinch.mx, my - pinch.my);
      pinch = { dist: d, ang, mx, my };
    }
  });
  const end = (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const single = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (single && !moved && e.type === 'pointerup') {
      if (p.button === 2) handlers.onRotate(1);
      else if (p.button === 0) {
        const now = performance.now();
        handlers.onTap(e.clientX, e.clientY, { double: now - lastTapTime < 320 });
        lastTapTime = now;
      }
    }
  };
  dom.addEventListener('pointerup', end);
  dom.addEventListener('pointercancel', end);
  dom.addEventListener('wheel', (e) => { e.preventDefault(); if (handlers.onWheel) handlers.onWheel(e); else rig.zoom(Math.exp(e.deltaY * 0.0012)); }, { passive: false });
}
