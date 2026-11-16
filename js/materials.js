// Materiais do projeto. As texturas vêm de textures.js (procedurais, sem imagens).
// tier.low = celular/aparelho fraco: texturas menores e sem relevo (bump).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/+esm';
import { TextureKit, mosaic, slats, water, solar, tactile, numberPlate } from './textures.js';

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {{ low: boolean }} tier
 */
export function createMaterials(renderer, tier) {
  const big = tier.low ? 256 : 512;
  const mid = tier.low ? 128 : 256;
  const kit = new TextureKit(big);
  const aniso = Math.min(tier.low ? 4 : 8, renderer.capabilities.getMaxAnisotropy());

  const tex = (canvas, meters) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / meters, 1 / meters);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = aniso;
    return t;
  };
  const S = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o });
  /** Material com textura; no modo completo usa a própria textura como relevo. */
  const T = (canvas, meters, o = {}, bump = 0) => {
    const map = tex(canvas, meters);
    const m = S({ map, ...o });
    if (bump && !tier.low) {
      m.bumpMap = map;
      m.bumpScale = bump;
    }
    return m;
  };

  const woodWarm = ['#8d5a34', '#9b663c', '#80502d', '#a46d42', '#93603a'];
  const waterTex = tex(water(31), 1.4);
  const cascadeTex = tex(water(39), 0.6);

  const M = {
    wallExt: T(kit.plaster('#c6c2b9', big, 0.11), 2.2, { roughness: 0.95 }, 0.6),
    wallInt: T(kit.plaster('#efece6', mid, 0.04, 40), 2.2, { roughness: 0.95 }),
    wallGarage: T(kit.plaster('#aaa69d', mid, 0.1, 80), 2.2, { roughness: 0.95 }),
    ceiling: S({ color: 0xf2f0ec, roughness: 0.95 }),
    black: S({ color: 0x1d1e20, roughness: 0.6 }),
    frame: S({ color: 0x18191b, roughness: 0.4, metalness: 0.4 }),
    white: S({ color: 0xf4f3f0, roughness: 0.6 }),
    woodClad: T(kit.wood(woodWarm, 6, big, { segs: 1 }), 1.2, { roughness: 0.62 }, 0.5),
    ripado: T(kit.wood(woodWarm, 16, mid, { gap: 0.3, grain: 0.6 }), 1.0, { roughness: 0.7 }, 0.8),
    woodFloor: T(kit.wood(['#b08457', '#a67a4e', '#bb8f62', '#9d7148'], 8, big, { vertical: false, segs: 2 }), 1.6, { roughness: 0.55 }),
    deck: T(kit.wood(['#7a5232', '#6d4a2c', '#86593a', '#73492a'], 7, big, { vertical: false, segs: 2 }), 1.0, { roughness: 0.8 }, 0.6),
    woodCeil: T(kit.wood(['#a87b4f', '#9a6e44', '#b4875a'], 8, mid, {}), 1.2, { roughness: 0.7 }),
    oak: T(kit.wood(['#b38a5c', '#a98053', '#bd9466'], 6, mid, { vertical: false, segs: 1, grain: 0.7, lines: false }), 0.9, { roughness: 0.55 }),
    tileFloor: T(kit.tiles('#dcd7cd', '#c2bcb0', 2, big, { vary: 0.04, cloud: 0.07 }), 1.8, { roughness: 0.32 }),
    tileOut: T(kit.tiles('#b4ada2', '#958e83', 2, mid, { vary: 0.08, cloud: 0.12 }), 1.2, { roughness: 0.8 }),
    marble: T(kit.marble('#efede9', big), 1.2, { roughness: 0.22 }),
    garageFloor: T(kit.plaster('#9f9c96', mid, 0.16, 120), 1.5, { roughness: 0.9 }),
    muro: T(kit.roughConcrete('#bfbab0', big), 1.6, { roughness: 1 }, 1.2),
    concreteLight: T(kit.plaster('#d0cdc6', mid, 0.14, 160), 1.2, { roughness: 0.9 }),
    sidewalk: T(kit.tiles('#bab7b0', '#8f8c86', 2, mid, { vary: 0.08, cloud: 0.16 }), 2.0, { roughness: 0.95 }),
    asphalt: T(kit.asphalt(mid), 2.0, { roughness: 1 }),
    tactile: S({ map: tex(tactile(), 0.4), roughness: 0.9 }),
    grass: T(kit.grass(big), 1.6, { roughness: 1 }),
    soil: S({ color: 0x4b3b2c, roughness: 1 }),
    pebbles: T(kit.plaster('#e2ded5', mid, 0.45, 200), 0.6, { roughness: 1 }, 1.0),
    stone: T(kit.ashlar(big, ['#77736d', '#8a857e', '#6b6762', '#958f87', '#5f5b56']), 1.6, { roughness: 0.95 }, 1.2),
    coping: T(kit.plaster('#ddd7cb', mid, 0.1, 240), 1.0, { roughness: 0.8 }),
    mosaic: S({ map: tex(mosaic(), 0.5), roughness: 0.3 }),
    water: new THREE.MeshStandardMaterial({ color: 0x9fdcef, map: waterTex, transparent: true, opacity: 0.62, roughness: 0.05, metalness: 0.1, depthWrite: false }),
    cascade: new THREE.MeshStandardMaterial({ color: 0xdff6ff, map: cascadeTex, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    greenWall: T(kit.greenWall(tier.low ? 256 : 512, tier.low ? 1100 : 2600), 1.0, { roughness: 1 }, 0.8),
    shutter: S({ map: tex(slats(), 0.32), roughness: 0.55 }),
    solar: S({ map: tex(solar(), 1.0), roughness: 0.3, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xa9c6d4, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.2, depthWrite: false }),
    glassDark: S({ color: 0x1d262c, roughness: 0.1, metalness: 0.5 }),
    mirror: S({ color: 0xc3ced4, roughness: 0.12, metalness: 0.55 }),
    steel: S({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.85 }),
    graphite: S({ color: 0x3a3c3f, roughness: 0.55 }),
    quartz: S({ color: 0xe9e7e2, roughness: 0.25 }),
    ceramic: S({ color: 0xf7f7f5, roughness: 0.2 }),
    fabric: S({ color: 0x8e8a83, roughness: 1 }),
    fabricDark: S({ color: 0x4d4a46, roughness: 1 }),
    terracotta: S({ color: 0xb4694a, roughness: 1 }),
    sage: S({ color: 0x6f7f62, roughness: 1 }),
    linen: S({ color: 0xf1efea, roughness: 1 }),
    duvet: S({ color: 0xd6cfc2, roughness: 1 }),
    navy: S({ color: 0x3f4f68, roughness: 1 }),
    rug: S({ color: 0xcbc1b0, roughness: 1 }),
    leather: S({ color: 0x7a4b2e, roughness: 0.7 }),
    carPaint: S({ color: 0xf1f1f0, roughness: 0.25, metalness: 0.35 }),
    tyre: S({ color: 0x161616, roughness: 0.9 }),
    redLight: S({ color: 0x8a1c1c, emissive: 0x5a0a0a, emissiveIntensity: 0.6 }),
    pot: S({ color: 0x3b3936, roughness: 0.8 }),
    potLight: S({ color: 0xd8d2c6, roughness: 0.9 }),
    leaf: S({ color: 0x4f7a33, roughness: 0.9, side: THREE.DoubleSide }),
    leafDark: S({ color: 0x35571f, roughness: 0.9, side: THREE.DoubleSide }),
    trunk: S({ color: 0x6b5a45, roughness: 1 }),
    umbrella: S({ color: 0xece6da, roughness: 1, side: THREE.DoubleSide }),
    screen: S({ color: 0x0c0d0f, roughness: 0.2, metalness: 0.2 }),
    books: S({ color: 0x8c5a3c, roughness: 0.9 }),
    lamp: S({ color: 0xfff6e6, emissive: 0xffd49a, emissiveIntensity: 0.3 }),
    poolLamp: S({ color: 0xe0fbff, emissive: 0x6fe3ff, emissiveIntensity: 0.3 }),
    fire: S({ color: 0x2b1a12, emissive: 0xff7a2a, emissiveIntensity: 0.0 }),
  };
  const plate = new THREE.CanvasTexture(numberPlate());
  plate.colorSpace = THREE.SRGBColorSpace;
  M.numberPlate = S({ map: plate, transparent: true, roughness: 0.6 });
  M.animated = [waterTex, cascadeTex];
  return M;
}
