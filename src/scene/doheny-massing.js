/**
 * doheny-massing.js
 *
 * Procedural massing + facade generator for the search-and-rescue sim.
 *
 * The extruded OSM footprint is the right thing for collision, the fire grid,
 * and the ground-truth outline. It is the wrong thing to look at, because a
 * single prism throws away every silhouette cue that makes the building
 * recognizable. This module rebuilds the visual layer as a composition of
 * volumes with real depth.
 *
 * Ranked by how much each contributes to it not reading as a box:
 *
 *   1. Hipped tile roof with a deep eave overhang. A flat-topped extrusion
 *      reads as fake instantly, from any distance, in any lighting. This is
 *      more than half the problem.
 *   2. Cornice and base course. Two projecting horizontal bands that break
 *      the wall plane and catch light. Very cheap, very effective.
 *   3. Window reveals with real depth. Not decals on a flat surface.
 *   4. A projecting, taller central entrance pavilion. Breaks the silhouette
 *      and gives the south facade a centre.
 *   5. Vertical bay rhythm — shallow pilaster strips between window bays.
 *   6. Material split: brick field, limestone trim. Two materials, not one.
 *
 * Usage:
 *   import { buildMassing, MASSING_CONFIG } from './doheny-massing.js';
 *   const group = buildMassing(siteData);   // siteData = site-data.json
 *   scene.add(group);
 *
 * The returned group carries userData.windows — an array of window meshes
 * keyed by { floor, facade, bayIndex } so the fire system can drive their
 * emissive intensity on vent.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------------------------------------------------------------- config

export const MASSING_CONFIG = {
  storeyHeight: 4.5,

  // Plinth the whole building sits on. Projects proud of the wall.
  baseCourse: { height: 1.4, projection: 0.35 },

  // Horizontal band between the ground floor and the tall main level.
  stringCourse: { height: 0.4, projection: 0.25 },

  // The band under the roof. Deep projection — this is what casts the
  // shadow line that makes the top of the wall read as architecture.
  cornice: { height: 1.1, projection: 0.75 },

  roof: {
    pitch: 0.34,          // radians, ~19.5° — low, Mediterranean
    eaveOverhang: 1.4,    // do not reduce this; the overhang is the point
    fasciaDepth: 0.35,
    maxHeight: 6.5,       // caps the truncated hip; see hipRoof() for why
    pavilionMaxHeight: 4.0,
  },

  // Central entrance pavilion on the south facade.
  pavilion: {
    width: 18,
    projection: 2.6,
    // Must clear the main roof by enough to read as a separate volume. At
    // 3.8 it only cleared by 1m, which is invisible from ground level.
    extraHeight: 6.0,
    bayClearance: 2.0,    // gap between pavilion edge and nearest window bay
    portalWidth: 6.5,
    portalHeight: 9.0,
    portalRecess: 1.8,
  },

  // Shallow end pavilions that terminate the long facade.
  endPavilion: { width: 11, projection: 1.1 },

  bay: {
    targetSpacing: 5.6,   // actual spacing solves to fit each facade evenly
    pilasterWidth: 0.9,
    pilasterProjection: 0.18,
  },

  window: {
    reveal: 0.42,         // how far the glass sits inside the wall plane
    surroundDepth: 0.22,
    surroundWidth: 0.35,
    groundFloor: { width: 1.6, height: 2.2, arched: false },
    mainFloor:   { width: 2.2, height: 5.2, arched: true },  // piano nobile
    upperFloor:  { width: 1.8, height: 2.6, arched: true },
  },
};

// ---------------------------------------------------------------- materials

function facadeMap(url, srgb) {
  if (typeof document === 'undefined') return null
  const tex = new THREE.TextureLoader().load(url)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(7, 4.5)
  tex.anisotropy = 4
  return tex
}

export function createMaterials() {
  const brickAlbedo = facadeMap('/textures/doheny-brick-albedo.png', true)
  const brickNormal = facadeMap('/textures/doheny-brick-normal.png', false)
  const limeAlbedo = facadeMap('/textures/doheny-lime-albedo.png', true)
  const limeNormal = facadeMap('/textures/doheny-lime-normal.png', false)
  limeAlbedo?.repeat.set(4, 3)
  limeNormal?.repeat.set(4, 3)
  return {
    // Pale brick field. Warm, slightly desaturated. Albedo + normal derived
    // from the Wikimedia elevation photograph (Padsquad19, CC BY-SA 3.0).
    brick: new THREE.MeshStandardMaterial({
      color: 0xf2e6d4, map: brickAlbedo, normalMap: brickNormal, roughness: 0.92, metalness: 0.0,
    }),
    // Limestone trim — base, cornice, surrounds, pilasters. Lighter and
    // smoother than the brick so the bands separate under firelight.
    limestone: new THREE.MeshStandardMaterial({
      color: 0xf4eee4, map: limeAlbedo, normalMap: limeNormal, roughness: 0.78, metalness: 0.0,
    }),
    roofTile: new THREE.MeshStandardMaterial({
      color: 0x8a4832, roughness: 0.88, metalness: 0.0,
    }),
    // Recessed void behind each window. Near-black, so unlit windows read
    // as holes and lit ones pop hard.
    recess: new THREE.MeshStandardMaterial({
      color: 0x0e0b09, roughness: 1.0, metalness: 0.0,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x1a1512, roughness: 0.35, metalness: 0.0,
      emissive: 0xff6420, emissiveIntensity: 0.0,   // driven by fire system
    }),
  };
}

// ---------------------------------------------------------------- helpers

function box(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/**
 * Limestone wrap (plinth / string course) with a gap on the south face so
 * the band does not cut a flickering rectangle through the entrance arch.
 */
function courseWithSouthGap(W, D, height, projection, cy, gapHalf) {
  const geos = [];
  const pw = W + projection * 2;
  const northDepth = D / 2 + projection;
  geos.push(box(pw, height, northDepth, 0, cy, -northDepth / 2));

  const leftW = W / 2 + projection - gapHalf;
  const southDepth = D / 2 + projection;
  if (leftW > 0.05) {
    geos.push(box(leftW, height, southDepth, -(gapHalf + leftW / 2), cy, southDepth / 2));
    geos.push(box(leftW, height, southDepth, gapHalf + leftW / 2, cy, southDepth / 2));
  }
  return geos;
}

/**
 * Truncated hipped roof over a w x d rectangle: four sloping faces rising to
 * a flat deck.
 *
 * A full ridge hip is wrong at this scale. Solving the pitch across a 65m
 * span gives an 11.5m ridge sitting on an 18m wall — the roof ends up nearly
 * two-thirds the height of the building and swamps it. Large 1930s
 * institutional buildings almost always used a hipped perimeter around a flat
 * deck for exactly this reason. Capping the height and truncating gets both
 * the correct eave line and sane proportions.
 */
function hipRoof(w, d, pitch, maxHeight, y) {
  const hw = w / 2, hd = d / 2;

  // Height the pitch wants, capped.
  const wanted = Math.min(hw, hd) * Math.tan(pitch);
  const height = Math.min(wanted, maxHeight);
  const inset = height / Math.tan(pitch);

  const dw = Math.max(hw - inset, 0.5);
  const dd = Math.max(hd - inset, 0.5);

  const v = [
    [-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd],       // eave
    [-dw, height, -dd], [dw, height, -dd], [dw, height, dd], [-dw, height, dd], // deck
  ];

  const tris = [
    [0, 1, 5], [0, 5, 4],   // north slope
    [1, 2, 6], [1, 6, 5],   // east slope
    [2, 3, 7], [2, 7, 6],   // south slope
    [3, 0, 4], [3, 4, 7],   // west slope
    [4, 5, 6], [4, 6, 7],   // flat deck
  ];

  // Winding is fixed against the interior centroid rather than reasoned about
  // by hand — shorter and less error-prone than getting ten triangles right.
  const centre = new THREE.Vector3(0, height * 0.4, 0);
  const positions = [];

  for (const tri of tris) {
    const a = new THREE.Vector3(...v[tri[0]]);
    const b = new THREE.Vector3(...v[tri[1]]);
    const c = new THREE.Vector3(...v[tri[2]]);

    const normal = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a));
    const faceCentre = new THREE.Vector3()
      .add(a).add(b).add(c).multiplyScalar(1 / 3);

    if (normal.dot(faceCentre.clone().sub(centre)) < 0) {
      positions.push(...a.toArray(), ...c.toArray(), ...b.toArray());
    } else {
      positions.push(...a.toArray(), ...b.toArray(), ...c.toArray());
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  g.translate(0, y, 0);
  return g;
}

/**
 * Round-arched opening profile. Romanesque means semicircular, not pointed —
 * getting this wrong is one of the few detail errors people actually notice.
 */
function archedShape(width, height, arched) {
  const s = new THREE.Shape();
  const hw = width / 2;

  if (!arched) {
    s.moveTo(-hw, 0);
    s.lineTo(hw, 0);
    s.lineTo(hw, height);
    s.lineTo(-hw, height);
    s.closePath();
    return s;
  }

  const springLine = height - hw;   // arch springs where the semicircle starts
  s.moveTo(-hw, 0);
  s.lineTo(hw, 0);
  s.lineTo(hw, springLine);
  s.absarc(0, springLine, hw, 0, Math.PI, false);
  s.lineTo(-hw, 0);
  s.closePath();
  return s;
}

/** Window surround: an arched frame with an arched hole through it. */
function windowSurround(spec, cfg) {
  const outer = archedShape(
    spec.width + cfg.window.surroundWidth * 2,
    spec.height + cfg.window.surroundWidth * 2,
    spec.arched
  );
  const hole = archedShape(spec.width, spec.height, spec.arched);
  outer.holes.push(hole);

  return new THREE.ExtrudeGeometry(outer, {
    depth: cfg.window.surroundDepth,
    bevelEnabled: false,
  });
}

// ---------------------------------------------------------------- facades

/**
 * Solve bay positions across a facade run. Returns centre offsets in metres
 * from the middle of the run, spaced as evenly as possible near the target.
 */
function solveBays(runLength, targetSpacing, skipCentre = 0) {
  const usable = runLength - skipCentre;
  const count = Math.max(2, Math.round(usable / targetSpacing));
  const spacing = usable / count;
  const offsets = [];

  for (let i = 0; i < count; i++) {
    let x = -usable / 2 + spacing * (i + 0.5);
    if (skipCentre > 0) {
      // Shift each half outward by exactly enough to clear the pavilion.
      // Shifting by skipCentre/2 outright overshoots, because the bays
      // already sit half a spacing clear of the centreline.
      const shift = Math.max(skipCentre / 2 - spacing / 2, 0);
      x += x < 0 ? -shift : shift;
    }
    offsets.push(x);
  }
  return offsets;
}

function floorSpec(floor, floors, cfg) {
  if (floor === 0) return cfg.window.groundFloor;
  if (floor === 1) return cfg.window.mainFloor;   // tall arched main level
  return cfg.window.upperFloor;
}

/**
 * Build one facade: pilasters, window surrounds, recesses, glass.
 *
 * Local space for this function is: facade runs along X, wall plane at Z=0,
 * outward direction is -Z. The caller rotates and positions it.
 */
function buildFacade(runLength, floors, cfg, materials, meta, out) {
  const trim = [];
  const brick = [];
  const recesses = [];

  const skipCentre = meta.facade === 'south'
    ? cfg.pavilion.width + cfg.pavilion.bayClearance * 2
    : 0;
  const bays = solveBays(runLength, cfg.bay.targetSpacing, skipCentre);

  // Pilaster strips between bays. Shallow — 18cm is enough to catch light.
  for (let i = 0; i <= bays.length; i++) {
    const prev = i === 0 ? -runLength / 2 : bays[i - 1];
    const next = i === bays.length ? runLength / 2 : bays[i];
    const x = (prev + next) / 2;
    if (Math.abs(x) < skipCentre / 2) continue;

    brick.push(box(
      cfg.bay.pilasterWidth,
      floors * cfg.storeyHeight - cfg.cornice.height,
      cfg.bay.pilasterProjection,
      x,
      (floors * cfg.storeyHeight - cfg.cornice.height) / 2,
      -cfg.bay.pilasterProjection / 2
    ));
  }

  for (let floor = 0; floor < floors; floor++) {
    const spec = floorSpec(floor, floors, cfg);
    const sillY = floor * cfg.storeyHeight + (cfg.storeyHeight - spec.height) * 0.42;

    for (let b = 0; b < bays.length; b++) {
      const x = bays[b];

      // Recessed void behind the opening.
      const voidDepth = cfg.window.reveal;
      recesses.push(box(
        spec.width, spec.height, voidDepth,
        x, sillY + spec.height / 2, voidDepth / 2
      ));

      // Surround, sitting proud of the wall face.
      const sur = windowSurround(spec, cfg);
      sur.translate(x, sillY, -cfg.window.surroundDepth);
      trim.push(sur);

      // Glass plane, set back inside the reveal. Registered so the fire
      // system can drive emissiveIntensity per window.
      const glassGeo = archedShape(spec.width * 0.94, spec.height * 0.96, spec.arched);
      const glassMesh = new THREE.Mesh(
        new THREE.ShapeGeometry(glassGeo),
        materials.glass.clone()
      );
      glassMesh.position.set(x, sillY, voidDepth * 0.82);
      glassMesh.rotation.y = Math.PI;
      glassMesh.userData = { floor, facade: meta.facade, bayIndex: b };
      out.windows.push(glassMesh);
      out.loose.push(glassMesh);
    }
  }

  return { trim, brick, recesses };
}

// ---------------------------------------------------------------- main

export function buildMassing(siteData, cfg = MASSING_CONFIG) {
  const materials = createMaterials();
  const group = new THREE.Group();
  const out = { windows: [], loose: [] };

  const ob = siteData.building.orientedBounds;
  const floors = siteData.building.levels || 4;
  const W = ob.width;
  const D = ob.depth;
  const wallH = floors * cfg.storeyHeight;

  const brickGeos = [];
  const trimGeos = [];
  const recessGeos = [];
  const roofGeos = [];

  // --- main block -----------------------------------------------------
  brickGeos.push(box(W, wallH, D, 0, wallH / 2, 0));

  const portalGap = cfg.pavilion.portalWidth / 2 + 0.2;

  // --- base course ----------------------------------------------------
  const bc = cfg.baseCourse;
  trimGeos.push(...courseWithSouthGap(W, D, bc.height, bc.projection, bc.height / 2, portalGap));

  // --- string course between ground and main level --------------------
  const sc = cfg.stringCourse;
  trimGeos.push(...courseWithSouthGap(W, D, sc.height, sc.projection, cfg.storeyHeight, portalGap));

  // --- cornice --------------------------------------------------------
  const cor = cfg.cornice;
  trimGeos.push(box(
    W + cor.projection * 2, cor.height, D + cor.projection * 2,
    0, wallH - cor.height / 2, 0
  ));

  // --- main hipped roof -----------------------------------------------
  const roofW = W + cfg.roof.eaveOverhang * 2;
  const roofD = D + cfg.roof.eaveOverhang * 2;
  roofGeos.push(hipRoof(roofW, roofD, cfg.roof.pitch, cfg.roof.maxHeight, wallH));
  // Fascia board at the eave — gives the overhang a visible thickness.
  trimGeos.push(box(roofW, cfg.roof.fasciaDepth, roofD, 0, wallH, 0));

  // --- end pavilions --------------------------------------------------
  const ep = cfg.endPavilion;
  for (const sign of [-1, 1]) {
    brickGeos.push(box(
      ep.width, wallH, ep.projection,
      sign * (W / 2 - ep.width / 2),
      wallH / 2,
      D / 2 + ep.projection / 2
    ));
  }

  // --- central entrance pavilion --------------------------------------
  // Split around the portal. A solid pavilion plus a black box in the same
  // volume z-fights, and the arch flickers as you move.
  const pv = cfg.pavilion;
  const pavH = wallH + pv.extraHeight;
  const holeW = pv.portalWidth;
  const holeH = pv.portalHeight;
  const sideW = (pv.width - holeW) / 2;
  const pavZ = D / 2 + pv.projection / 2;
  brickGeos.push(box(
    sideW, pavH, pv.projection,
    -(holeW / 2 + sideW / 2), pavH / 2, pavZ
  ));
  brickGeos.push(box(
    sideW, pavH, pv.projection,
    holeW / 2 + sideW / 2, pavH / 2, pavZ
  ));
  brickGeos.push(box(
    holeW, Math.max(0.4, pavH - holeH), pv.projection,
    0, holeH + (pavH - holeH) / 2, pavZ
  ));
  trimGeos.push(box(
    pv.width + cor.projection * 2, cor.height, pv.projection + cor.projection * 2,
    0, pavH - cor.height / 2, D / 2 + pv.projection / 2
  ));

  const pavRoofW = pv.width + cfg.roof.eaveOverhang * 2;
  const pavRoofD = pv.projection + D * 0.35 + cfg.roof.eaveOverhang * 2;
  roofGeos.push(hipRoof(
    pavRoofW, pavRoofD, cfg.roof.pitch, cfg.roof.pavilionMaxHeight, pavH
  ));

  // --- entrance portal: frame proud of the brick, dark door at the back
  const portalOuter = archedShape(pv.portalWidth + 1.6, pv.portalHeight + 1.6, true);
  portalOuter.holes.push(archedShape(pv.portalWidth, pv.portalHeight, true));
  const portalFrame = new THREE.ExtrudeGeometry(portalOuter, {
    depth: 0.6, bevelEnabled: false,
  });
  portalFrame.translate(0, 0, D / 2 + pv.projection + 0.02);
  trimGeos.push(portalFrame.index ? portalFrame.toNonIndexed() : portalFrame);

  const doorShape = archedShape(pv.portalWidth - 0.1, pv.portalHeight - 0.06, true);
  const doorGeo = new THREE.ShapeGeometry(doorShape, 24);
  doorGeo.translate(0, 0, D / 2 + pv.projection - pv.portalRecess + 0.08);
  doorGeo.computeVertexNormals();

  // Entrance steps rise toward the door. Lawn side is the bottom tread.
  const stepGeos = [];
  const stepFront = D / 2 + pv.projection;
  const stepCount = 5;
  const rise = 0.16;
  const tread = 0.72;
  for (let i = 0; i < stepCount; i++) {
    const fromLawn = stepCount - 1 - i;
    const w = pv.portalWidth + 3.2 - fromLawn * 0.15;
    stepGeos.push(box(
      w, rise, tread,
      0, rise * 0.5 + fromLawn * rise,
      stepFront + 0.55 + i * tread,
    ));
  }

  // --- facades --------------------------------------------------------
  const facadeDefs = [
    { facade: 'south', run: W, rotY: 0,             pos: [0, 0,  D / 2] },
    { facade: 'north', run: W, rotY: Math.PI,       pos: [0, 0, -D / 2] },
    { facade: 'east',  run: D, rotY: -Math.PI / 2,  pos: [ W / 2, 0, 0] },
    { facade: 'west',  run: D, rotY: Math.PI / 2,   pos: [-W / 2, 0, 0] },
  ];

  for (const def of facadeDefs) {
    const local = { windows: out.windows, loose: [] };
    const built = buildFacade(def.run, floors, cfg, materials, def, local);

    const holder = new THREE.Group();
    holder.rotation.y = def.rotY;
    holder.position.set(...def.pos);

    const push = (geos, target) => {
      for (const g of geos) {
        const m = new THREE.Matrix4()
          .makeRotationY(def.rotY)
          .setPosition(...def.pos);
        target.push(g.clone().applyMatrix4(m));
      }
    };
    push(built.brick, brickGeos);
    push(built.trim, trimGeos);
    push(built.recesses, recessGeos);

    for (const mesh of local.loose) {
      holder.add(mesh);
    }
    group.add(holder);
  }

  // --- merge and add --------------------------------------------------
  const addMerged = (geos, material, name) => {
    if (!geos.length) return;
    const prepared = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(prepared, false);
    if (!merged) {
      console.warn(`Merge failed for ${name}; adding unmerged.`);
      for (const g of geos) group.add(new THREE.Mesh(g, material));
      return;
    }
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  addMerged(brickGeos, materials.brick, 'brick');
  addMerged(trimGeos, materials.limestone, 'limestone');
  addMerged(stepGeos, materials.limestone, 'entranceSteps');
  addMerged(recessGeos, materials.recess, 'recesses');
  addMerged(roofGeos, materials.roofTile, 'roof');

  const doorMat = materials.recess.clone();
  doorMat.polygonOffset = true;
  doorMat.polygonOffsetFactor = 1;
  doorMat.polygonOffsetUnits = 1;
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.name = 'portalDoor';
  doorMesh.receiveShadow = true;
  group.add(doorMesh);

  // Position and rotate the whole composition onto the real site.
  group.rotation.y = -ob.angleRad;
  group.position.set(ob.centre.x, 0, ob.centre.z);

  group.userData.windows = out.windows;
  group.userData.materials = materials;
  return group;
}

/**
 * Drive window emissive from the fire simulation.
 *
 * TWO SEPARATE VISUAL CHANNELS. Do not merge them.
 *
 *   1. Fire glow — continuous, monotonic, slow. Heat only ever rises, so
 *      the glow must only ever rise. Any flicker here gets read as a UI
 *      signal ("this is unavailable / disabled") rather than as fire,
 *      because flashing is what interfaces use to mean unavailable.
 *
 *   2. Extraction status — discrete and deliberate: AVAILABLE, ACTIVE, DEAD.
 *      This is the channel allowed to animate, and it animates in a way
 *      that reads as a marker, not as lighting.
 *
 * Overloading one channel with both is why the windows looked like greyed-out
 * buttons. Keep glow smooth; put affordance in the marker.
 *
 * lookupHeat(userData) -> 0..100
 * lookupStatus(userData) -> 'AVAILABLE' | 'ACTIVE' | 'DEAD' | null
 */
export function updateWindowGlow(group, lookupHeat, lookupStatus = () => null, t = 0) {
  for (const win of group.userData.windows) {
    const heat = lookupHeat(win.userData);
    const h = Math.max(0, Math.min(1, heat / 100));

    // Channel 1: fire. Smooth, monotonic, no flicker. The mild sinusoid is
    // a slow breathe, not a blink — amplitude stays under 8% so it never
    // reads as a state change.
    const breathe = 1 + Math.sin(t * 1.7 + win.userData.bayIndex * 2.3) * 0.07;
    win.material.emissiveIntensity = h * h * 3.2 * breathe;
    win.material.color.setHex(h > 0.7 ? 0x2a1008 : 0x1a1512);

    // Channel 2: affordance. Steady when usable, a slow pulse only while
    // actively being used, and simply gone once dead — never a blink that
    // could be mistaken for "disabled".
    const marker = win.userData.marker;
    if (!marker) continue;

    const status = lookupStatus(win.userData);
    if (status === 'AVAILABLE') {
      marker.visible = true;
      marker.material.opacity = 0.85;
    } else if (status === 'ACTIVE') {
      marker.visible = true;
      marker.material.opacity = 0.6 + Math.sin(t * 4.0) * 0.35;
    } else {
      marker.visible = false;
    }
  }
}
