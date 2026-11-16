// Modo "Caminhar": primeira pessoa com colisão, escada funcional e controles de toque.
import { STAIR, SURFACES, WORLD } from './plan-data.js';

const EYE = 1.62;
const RADIUS = 0.22;
const STEP = 0.45;
const SPEED = 1.9;
const RUN = 3.8;

export class Walk {
  constructor(camera, dom, builder, ui) {
    this.camera = camera;
    this.dom = dom;
    this.B = builder;
    this.ui = ui;
    this.active = false;
    this.keys = new Set();
    this.p = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, vy: 0, eye: EYE };
    this.joy = { x: 0, y: 0 };
    this.drag = null;
    this.locked = false;
    this.lockFailed = false;
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (e) => {
      if (!this.active || e.target.closest?.('input, select, textarea')) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'q', 'e'].includes(k)) {
        this.keys.add(k);
        if (k.startsWith('arrow')) e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      this.ui.onLockChange?.(this.locked);
    });
    document.addEventListener('pointerlockerror', () => {
      this.lockFailed = true;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.active && this.locked) this.look(e.movementX, e.movementY, 0.0022);
    });

    this.dom.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      if (e.pointerType === 'mouse' && !this.lockFailed && !this.locked && this.dom.requestPointerLock) {
        try {
          const r = this.dom.requestPointerLock();
          if (r && r.catch) r.catch(() => { this.lockFailed = true; });
        } catch {
          this.lockFailed = true;
        }
      }
      if (!this.locked) this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.active || !this.drag || e.pointerId !== this.drag.id || this.locked) return;
      const k = e.pointerType === 'touch' ? 0.005 : 0.004;
      this.look(e.clientX - this.drag.x, e.clientY - this.drag.y, k);
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
    });
    const end = (e) => { if (this.drag && e.pointerId === this.drag.id) this.drag = null; };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  /** Liga o joystick virtual (toque). */
  bindJoystick(base, knob) {
    let id = null;
    let cx = 0;
    let cy = 0;
    const R = 46;
    const move = (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy = { x: dx / R, y: -dy / R };
    };
    const stop = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      this.joy = { x: 0, y: 0 };
      knob.style.transform = '';
    };
    base.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      id = e.pointerId;
      const r = base.getBoundingClientRect();
      cx = r.left + r.width / 2;
      cy = r.top + r.height / 2;
      base.setPointerCapture(id);
      move(e);
    });
    base.addEventListener('pointermove', move);
    base.addEventListener('pointerup', stop);
    base.addEventListener('pointercancel', stop);
  }

  look(dx, dy, k) {
    this.p.yaw -= dx * k;
    this.p.pitch = Math.max(-1.35, Math.min(1.35, this.p.pitch - dy * k));
  }

  enable(spot) {
    this.active = true;
    this.teleport(spot);
  }

  disable() {
    this.active = false;
    this.keys.clear();
    this.drag = null;
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  teleport(s) {
    Object.assign(this.p, { x: s.x, z: s.z, y: s.y, yaw: s.yaw, pitch: -0.05, vy: 0, eye: EYE });
    this.apply();
  }

  /** Altura do piso sob (x, z) que dá para alcançar a partir da altura dos pés. */
  floorAt(x, z, feet) {
    let best = -Infinity;
    const consider = (h) => { if (h <= feet + STEP && h > best) best = h; };
    for (const s of SURFACES) {
      const [x1, x2, z1, z2] = s.rect;
      if (x >= x1 && x <= x2 && z >= z1 && z <= z2) consider(s.y);
    }
    if (x >= STAIR.x1 && x <= STAIR.x2 && z >= STAIR.z0 - 0.02 && z <= STAIR.z1) {
      consider(Math.min(3.0, Math.max(0, ((z - STAIR.z0) / (STAIR.z1 - STAIR.z0)) * 3.0)));
    }
    return best === -Infinity ? 0 : best;
  }

  blocked(x, z, feet) {
    if (x < WORLD.x1 || x > WORLD.x2 || z < WORLD.z1 || z > WORLD.z2) return true;
    const lo = feet + 0.38;
    const hi = feet + 1.75;
    for (const c of this.B.colliders) {
      if (c.y2 <= lo || c.y1 >= hi) continue;
      if (c.layer && this.B.layers[c.layer] && !this.B.layers[c.layer].visible) continue;
      const nx = Math.max(c.x1, Math.min(x, c.x2));
      const nz = Math.max(c.z1, Math.min(z, c.z2));
      if ((x - nx) ** 2 + (z - nz) ** 2 < RADIUS * RADIUS) return true;
    }
    return false;
  }

  update(dt) {
    if (!this.active) return;
    const p = this.p;
    const k = this.keys;
    let f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0);
    let r = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0);
    const turn = (k.has('arrowleft') || k.has('q') ? 1 : 0) - (k.has('arrowright') || k.has('e') ? 1 : 0);
    p.yaw += turn * 1.8 * dt;
    f += this.joy.y;
    r += this.joy.x;
    const len = Math.hypot(f, r);
    if (len > 1) { f /= len; r /= len; }
    const speed = (k.has('shift') ? RUN : SPEED) * dt;
    // Em planta: frente = (-sin yaw, +cos yaw); direita = (cos yaw, sin yaw)
    const dx = (-Math.sin(p.yaw) * f + Math.cos(p.yaw) * r) * speed;
    const dz = (Math.cos(p.yaw) * f + Math.sin(p.yaw) * r) * speed;
    if (dx && !this.blocked(p.x + dx, p.z, p.y)) p.x += dx;
    if (dz && !this.blocked(p.x, p.z + dz, p.y)) p.z += dz;

    const ground = this.floorAt(p.x, p.z, p.y);
    if (ground >= p.y - 0.5) {
      p.y = ground;
      p.vy = 0;
    } else {
      p.vy -= 9.8 * dt;
      p.y = Math.max(ground, p.y + p.vy * dt);
    }
    this.apply(dt);
  }

  apply(dt = 0) {
    const p = this.p;
    const target = p.y + EYE;
    const cur = this.camera.position.y;
    const y = dt ? cur + (target - cur) * Math.min(1, dt * 14) : target;
    this.camera.position.set(p.x, y, -p.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(p.pitch, p.yaw, 0);
    this.ui.onMove?.(p);
  }
}
