/**
 * site-environment.js
 *
 * Night environment for the search-and-rescue sim: sky, fog, ground, paths,
 * vegetation, distant campus silhouettes, and the lighting rig.
 *
 * The "building floating in a black void" problem is mostly atmosphere, not
 * scenery. In order of impact:
 *
 *   1. Fog. Without distance falloff the ground plane ends in a hard line
 *      against nothing. Exponential fog matched to the sky horizon colour
 *      makes the world fade instead of stop. This alone fixes most of it.
 *   2. A sky that is not black. LA has heavy light pollution — the night sky
 *      over campus is a dirty orange-brown near the horizon grading to deep
 *      blue overhead. Pure black reads as "missing", never as "night".
 *   3. Distant silhouettes. A ring of dark building masses at 150-300m gives
 *      the eye a horizon and an implied campus. Extremely cheap, enormous
 *      payoff — these are untextured boxes with a few lit windows.
 *   4. Ground that reaches the fog. The plane must extend past the fog's
 *      effective range so no edge is ever visible.
 *
 * Only after those four does vegetation matter.
 *
 * Usage:
 *   import { buildEnvironment, LIGHT_RIG } from './site-environment.js';
 *   const env = buildEnvironment(scene, siteData);
 *   // in the frame loop:
 *   env.update(dt, { fireIntensity, robotPosition });
 */

import * as THREE from 'three';
import { buildStagingApparatus } from './staging-apparatus.js';
import {
  defaultPaths,
  heightAt,
  lightPoleSites,
  trousdaleRibbon,
} from './site-ground.js';

// ---------------------------------------------------------------- palette

export const NIGHT = {
  // Sampled to read as LA light pollution rather than generic night.
  skyZenith:   0x10162a,
  skyHorizon:  0x462c1c,   // dirty orange-brown sodium glow
  skyGlow:     0x7a4624,   // hotter band right at the horizon line
  fog:         0x241c16,
  lawn:        0x22301c,
  lawnDry:     0x2c2e20,   // patchy variation; uniform green reads as felt
  path:        0x444038,
  asphalt:     0x141412,
  treeTrunk:   0x1a1512,
  treeCanopy:  0x14200f,
  distantMass: 0x0d1014,
  distantLit:  0xffd9a0,
};

export const LIGHT_RIG = {
  moonIntensity: 1.0,
  moonColor: 0xd0dcf0,
  moonAzimuth: 2.1,        // radians
  moonElevation: 0.62,
  hemiSky: 0x55647c,
  hemiGround: 0x322414,
  hemiIntensity: 1.02,
  ambient: 0.3,
  // Tuned so the distant campus ring at 150-320m reads as a horizon rather
  // than disappearing. At 0.0062 the ring was 79% fogged and invisible,
  // which defeated the whole point of having it.
  fogDensity: 0.0033,
};

// ---------------------------------------------------------------- sky

/**
 * Gradient sky dome. A three-stop vertical ramp with a tightened band at the
 * horizon, which is what makes light pollution read as light pollution rather
 * than as a lazy gradient.
 */
function buildSky(radius = 800) {
  const geo = new THREE.SphereGeometry(radius, 32, 20);
  const zenith = new THREE.Color(NIGHT.skyZenith);
  const horizon = new THREE.Color(NIGHT.skyHorizon);
  const glow = new THREE.Color(NIGHT.skyGlow);
  const fogCol = new THREE.Color(NIGHT.fog);
  const tmp = new THREE.Color();
  const colors = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / radius;
    const t = Math.pow(Math.max(h, 0), 0.42);
    tmp.copy(horizon).lerp(zenith, t);
    tmp.lerp(glow, Math.exp(-Math.abs(h) * 14) * 0.55);
    if (h < 0) tmp.lerp(fogCol, Math.min(-h * 3, 1));
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const sky = new THREE.Mesh(geo, material);
  sky.name = 'sky';
  sky.frustumCulled = false;
  return sky;
}

// ---------------------------------------------------------------- ground

/**
 * Ground plane with vertex-coloured patchiness.
 *
 * A single flat colour reads as felt. Mixing two lawn tones across a low
 * frequency noise costs nothing and immediately looks like real turf under
 * moonlight.
 */
function buildGround(siteData, staging, extent = 900, segments = 64) {
  const geo = new THREE.PlaneGeometry(extent, extent, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = [];
  const a = new THREE.Color(NIGHT.lawn);
  const b = new THREE.Color(NIGHT.lawnDry);
  const tmp = new THREE.Color();
  const opts = { staging };

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);

    // Cheap layered noise — enough to break up the plane, no texture needed.
    const n =
      Math.sin(x * 0.031) * Math.cos(z * 0.027) * 0.5 +
      Math.sin(x * 0.11 + 1.7) * Math.cos(z * 0.09 - 0.4) * 0.3 +
      Math.sin(x * 0.29 - 2.2) * Math.cos(z * 0.31) * 0.2;

    tmp.copy(a).lerp(b, THREE.MathUtils.clamp(n * 0.5 + 0.5, 0, 1));
    colors.push(tmp.r, tmp.g, tmp.b);

    pos.setY(i, heightAt(x, z, siteData, opts));
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.97,
      metalness: 0.0,
      emissive: 0x0c1408,
      emissiveIntensity: 0.28,
    })
  );
  mesh.receiveShadow = true;
  mesh.name = 'ground';
  return mesh;
}

/** Paved paths, laid as flat ribbons slightly above the lawn. */
function buildPaths(pathSpecs) {
  const geos = [];

  for (const spec of pathSpecs) {
    const { points, width } = spec;
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, z1] = points[i];
      const [x2, z2] = points[i + 1];
      const dx = x2 - x1, dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;

      const g = new THREE.PlaneGeometry(width, len);
      g.rotateX(-Math.PI / 2);
      g.rotateY(-Math.atan2(dz, dx) + Math.PI / 2);
      g.translate((x1 + x2) / 2, 0.08, (z1 + z2) / 2);
      geos.push(g);

      // Disc at each joint so corners don't show a notch.
      const j = new THREE.CircleGeometry(width / 2, 12);
      j.rotateX(-Math.PI / 2);
      j.translate(x2, 0.081, z2);
      geos.push(j);
    }
  }

  if (!geos.length) return null;

  const merged = mergeAll(geos);
  const mesh = new THREE.Mesh(
    merged,
    new THREE.MeshStandardMaterial({ color: NIGHT.path, roughness: 0.9 })
  );
  mesh.receiveShadow = true;
  mesh.name = 'paths';
  return mesh;
}

function buildTrousdale(siteData) {
  const ribbon = trousdaleRibbon(siteData);
  const [[x1, z1], [x2, z2]] = ribbon.points;
  const dx = x2 - x1;
  const dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const g = new THREE.PlaneGeometry(ribbon.width, len);
  g.rotateX(-Math.PI / 2);
  g.rotateY(-Math.atan2(dz, dx) + Math.PI / 2);
  g.translate((x1 + x2) / 2, 0.085, (z1 + z2) / 2);
  const mesh = new THREE.Mesh(
    g,
    new THREE.MeshStandardMaterial({ color: NIGHT.asphalt, roughness: 0.92 }),
  );
  mesh.receiveShadow = true;
  mesh.name = 'trousdaleParkway';
  mesh.userData.road = ribbon.name;
  return mesh;
}

function buildLightPoles(sites) {
  const pole = new THREE.CylinderGeometry(0.07, 0.1, 5.6, 6);
  pole.translate(0, 2.8, 0);
  const arm = new THREE.BoxGeometry(0.08, 0.08, 1.1);
  arm.translate(0, 5.45, 0.35);
  const lamp = new THREE.SphereGeometry(0.16, 8, 6);
  lamp.translate(0, 5.35, 0.78);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1c1a16, roughness: 0.7, metalness: 0.25 });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffe2a8,
    emissive: 0xffc56a,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  });
  const group = new THREE.Group();
  group.name = 'lightPoles';
  const poles = new THREE.InstancedMesh(pole, poleMat, sites.length);
  const arms = new THREE.InstancedMesh(arm, poleMat, sites.length);
  const lamps = new THREE.InstancedMesh(lamp, lampMat, sites.length);
  const m = new THREE.Matrix4();
  sites.forEach((p, i) => {
    m.makeTranslation(p.x, 0, p.z);
    poles.setMatrixAt(i, m);
    arms.setMatrixAt(i, m);
    lamps.setMatrixAt(i, m);
  });
  poles.instanceMatrix.needsUpdate = true;
  arms.instanceMatrix.needsUpdate = true;
  lamps.instanceMatrix.needsUpdate = true;
  group.add(poles, arms, lamps);
  group.userData.count = sites.length;
  return group;
}

// ---------------------------------------------------------------- trees

/**
 * Two tree archetypes. At night, canopy silhouette is the only thing that
 * survives — leaf detail is invisible, so it isn't modelled.
 */
function broadleafGeometry() {
  const trunk = new THREE.CylinderGeometry(0.22, 0.34, 4.2, 6);
  trunk.translate(0, 2.1, 0);

  // Three overlapping lumps read far better than one sphere.
  const canopy = [];
  const blobs = [
    [0, 6.4, 0, 3.1],
    [1.5, 5.6, 0.7, 2.2],
    [-1.2, 5.9, -0.9, 2.4],
  ];
  for (const [x, y, z, r] of blobs) {
    const s = new THREE.IcosahedronGeometry(r, 1);
    s.scale(1, 0.78, 1);
    s.translate(x, y, z);
    canopy.push(s);
  }
  return { trunk, canopy: mergeAll(canopy) };
}

function palmGeometry() {
  const trunk = new THREE.CylinderGeometry(0.20, 0.32, 11, 6);
  trunk.translate(0, 5.5, 0);

  const fronds = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const droop = 0.55 + (i % 3) * 0.12;
    const f = new THREE.ConeGeometry(0.62, 3.6, 4, 1, true);
    f.rotateX(Math.PI / 2 - droop);
    f.rotateY(angle);
    f.translate(Math.cos(angle) * 1.5, 11 - droop * 1.1, Math.sin(angle) * 1.5);
    fronds.push(f);
  }
  return { trunk, canopy: mergeAll(fronds) };
}

/**
 * Scatter trees on a jittered grid, rejecting anything inside the building
 * footprint, on a path, or too close to the staging area.
 */
function scatterTrees(siteData, opts) {
  const {
    extent = 190,
    // 15m spacing produced 600 trees — a forest, not a campus lawn. Alumni
    // Park is open turf with scattered mature specimens.
    spacing = 24,
    density = 0.5,        // drop half the grid so it doesn't read as planted rows
    jitter = 0.62,
    buildingClearance = 9,
    exclusions = [],
  } = opts;

  const footprint = siteData.building.footprint;
  const centre = siteData.building.orientedBounds.centre;
  const placements = [];

  // Deterministic PRNG so the scene is identical across reloads.
  let seed = 20260901;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let gx = -extent; gx <= extent; gx += spacing) {
    for (let gz = -extent; gz <= extent; gz += spacing) {
      const x = centre.x + gx + (rand() - 0.5) * spacing * jitter;
      const z = centre.z + gz + (rand() - 0.5) * spacing * jitter;

      if (rand() > density) continue;
      if (pointInPolygon(x, z, footprint)) continue;
      if (distanceToPolygon(x, z, footprint) < buildingClearance) continue;

      let blocked = false;
      for (const ex of exclusions) {
        if (Math.hypot(x - ex.x, z - ex.z) < ex.radius) { blocked = true; break; }
      }
      if (blocked) continue;

      // Thin out the ceremonial lawn south of the entrance so the approach
      // view of the main facade stays open.
      const southOfEntrance = z > centre.z + 20 && Math.abs(x - centre.x) < 40;
      if (southOfEntrance && rand() < 0.72) continue;

      placements.push({
        x, z,
        scale: 0.78 + rand() * 0.55,
        rotation: rand() * Math.PI * 2,
        palm: rand() < 0.22,
      });
    }
  }
  return placements;
}

function buildTrees(placements) {
  const broadleaf = broadleafGeometry();
  const palm = palmGeometry();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: NIGHT.treeTrunk, roughness: 0.95,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: NIGHT.treeCanopy, roughness: 1.0, flatShading: true,
  });

  const broad = placements.filter((p) => !p.palm);
  const palms = placements.filter((p) => p.palm);

  const group = new THREE.Group();
  group.name = 'trees';

  const addSet = (geo, list, mat) => {
    if (!list.length) return;
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();

    list.forEach((t, i) => {
      p.set(t.x, 0, t.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rotation);
      s.setScalar(t.scale);
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = false;
    group.add(inst);
  };

  addSet(broadleaf.trunk, broad, trunkMat);
  addSet(broadleaf.canopy, broad, canopyMat);
  addSet(palm.trunk, palms, trunkMat);
  addSet(palm.canopy, palms, canopyMat);

  return group;
}

// ---------------------------------------------------------------- horizon

/**
 * Distant campus masses. Untextured dark boxes with a scatter of lit windows,
 * placed in a ring at 150-320m. These never need detail — they exist purely
 * to give the eye a horizon line and stop the world reading as empty.
 */
function buildDistantCampus(siteData, count = 22) {
  const centre = siteData.building.orientedBounds.centre;
  const masses = [];
  const windows = [];

  let seed = 777;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.22;
    const dist = 150 + rand() * 170;
    const x = centre.x + Math.cos(angle) * dist;
    const z = centre.z + Math.sin(angle) * dist;

    const w = 22 + rand() * 40;
    const d = 20 + rand() * 34;
    const h = 12 + rand() * 26;

    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateY(rand() * Math.PI);
    g.translate(x, h / 2, z);
    masses.push(g);

    // A handful of lit windows per mass. Enough to imply occupancy.
    const litCount = Math.floor(rand() * 7);
    for (let j = 0; j < litCount; j++) {
      const wg = new THREE.PlaneGeometry(1.5, 2.2);
      const side = Math.floor(rand() * 4);
      const wy = 4 + rand() * (h - 8);
      const off = (rand() - 0.5);

      if (side === 0) { wg.translate(x + off * w, wy, z + d / 2 + 0.1); }
      else if (side === 1) { wg.rotateY(Math.PI); wg.translate(x + off * w, wy, z - d / 2 - 0.1); }
      else if (side === 2) { wg.rotateY(Math.PI / 2); wg.translate(x + w / 2 + 0.1, wy, z + off * d); }
      else { wg.rotateY(-Math.PI / 2); wg.translate(x - w / 2 - 0.1, wy, z + off * d); }

      windows.push(wg);
    }
  }

  const group = new THREE.Group();
  group.name = 'distantCampus';

  group.add(new THREE.Mesh(
    mergeAll(masses),
    new THREE.MeshStandardMaterial({ color: NIGHT.distantMass, roughness: 1.0 })
  ));

  if (windows.length) {
    group.add(new THREE.Mesh(
      mergeAll(windows),
      new THREE.MeshBasicMaterial({
        color: NIGHT.distantLit, side: THREE.DoubleSide, fog: true,
      })
    ));
  }

  return group;
}

// ---------------------------------------------------------------- lighting

function buildLights(siteData, rig = LIGHT_RIG) {
  const group = new THREE.Group();
  group.name = 'lights';
  const centre = siteData.building.orientedBounds.centre;

  const hemi = new THREE.HemisphereLight(rig.hemiSky, rig.hemiGround, rig.hemiIntensity);
  group.add(hemi);

  group.add(new THREE.AmbientLight(0x2a3a55, rig.ambient));

  // Moon. Low intensity, cool, and the only shadow caster — multiple shadow
  // casters at night is expensive and reads as confused.
  const moon = new THREE.DirectionalLight(rig.moonColor, rig.moonIntensity);
  const md = 120;
  moon.position.set(
    centre.x + Math.cos(rig.moonAzimuth) * 100,
    Math.sin(rig.moonElevation) * 140,
    centre.z + Math.sin(rig.moonAzimuth) * 100
  );
  moon.target.position.set(centre.x, 0, centre.z);
  moon.castShadow = false;
  moon.shadow.mapSize.set(512, 512);
  moon.shadow.camera.left = -md;
  moon.shadow.camera.right = md;
  moon.shadow.camera.top = md;
  moon.shadow.camera.bottom = -md;
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 400;
  moon.shadow.bias = -0.0006;
  group.add(moon, moon.target);

  return { group, moon, hemi };
}

/**
 * Emergency vehicle beacons on the staging engines. Two counter-phased strobes.
 * These do more for atmosphere than any amount of static scenery — moving
 * coloured light across a static facade is what sells "incident in progress".
 */
function buildEmergencyLights(redPos, bluePos) {
  const group = new THREE.Group();
  group.name = 'emergencyLights';

  const red = new THREE.PointLight(0xff2a18, 0, 65, 2);
  red.position.set(redPos.x, redPos.y, redPos.z);
  const blue = new THREE.PointLight(0x2a5cff, 0, 65, 2);
  blue.position.set(bluePos.x, bluePos.y, bluePos.z);

  group.add(red, blue);
  return { group, red, blue };
}

// ---------------------------------------------------------------- geometry utils

let _mergeFn = null;
function mergeAll(geos) {
  if (!_mergeFn) {
    throw new Error(
      'Call setMergeFunction(mergeGeometries) once at startup — see module notes.'
    );
  }
  return _mergeFn(geos, false);
}

/**
 * Inject BufferGeometryUtils.mergeGeometries. Kept as an injection rather
 * than a direct import so this module has no hard dependency on the examples
 * path, which moves between three.js versions.
 */
export function setMergeFunction(fn) {
  _mergeFn = fn;
}

function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    const hit = (zi > z) !== (zj > z) &&
      x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function distanceToPolygon(x, z, poly) {
  let min = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x, az = poly[j].z;
    const bx = poly[i].x, bz = poly[i].z;
    const dx = bx - ax, dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq > 0
      ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq))
      : 0;
    min = Math.min(min, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
  }
  return min;
}

// ---------------------------------------------------------------- assembly

export function buildEnvironment(scene, siteData, opts = {}) {
  const rig = { ...LIGHT_RIG, ...(opts.lightRig || {}) };
  const centre = siteData.building.orientedBounds.centre;
  const D = siteData.building.orientedBounds.depth;

  // Staging area on the lawn, south of the main entrance.
  const staging = opts.staging || { x: centre.x, z: centre.z + D / 2 + 34 };

  // Fog is the single most important line in this file.
  scene.fog = new THREE.FogExp2(NIGHT.fog, rig.fogDensity);
  scene.background = new THREE.Color(NIGHT.fog);

  const sky = buildSky(800);
  const ground = buildGround(siteData, staging, 900, 64);
  const distant = buildDistantCampus(siteData, 22);

  const pathSpecs = opts.paths || defaultPaths(centre, D, staging);
  const paths = buildPaths(pathSpecs);
  const road = buildTrousdale(siteData);
  const poles = buildLightPoles(lightPoleSites(siteData, staging));

  const placements = scatterTrees(siteData, {
    exclusions: [
      { x: staging.x, z: staging.z, radius: 26 },
      ...(opts.treeExclusions || []),
    ],
  });
  const trees = buildTrees(placements);

  const { group: lightGroup, moon } = buildLights(siteData, rig);
  const yard = buildStagingApparatus(staging, siteData.building.orientedBounds.angleRad);
  const { group: emGroup, red, blue } = buildEmergencyLights(yard.lights.red, yard.lights.blue);

  const root = new THREE.Group();
  root.name = 'environment';
  root.add(sky, ground, distant, trees, poles, road, lightGroup, emGroup, yard.group);
  if (paths) root.add(paths);

  let t = 0;
  return {
    root, sky, ground, trees, distant, moon, staging,
    treeCount: placements.length,
    poleCount: poles.userData.count,

    update(dt, state = {}) {
      t += dt;

      // Counter-phased beacons, roughly 1.4Hz.
      const phase = (t * 1.4) % 1;
      red.intensity = phase < 0.16 ? 5.2 : 0;
      blue.intensity = phase > 0.5 && phase < 0.66 ? 5.2 : 0;

      // As the fire grows, thicken the haze and push the sky glow warmer.
      // This is a slow, structural change over a run — the player should feel
      // the night getting worse without being able to point at what changed.
      const fire = THREE.MathUtils.clamp(state.fireIntensity || 0, 0, 1);
      if (scene.fog) scene.fog.density = rig.fogDensity * (1 + fire * 0.85);
      sky.material.color.setRGB(1 + fire * 0.25, 1 - fire * 0.12, 1 - fire * 0.22);

      // Keep the sky centred on the camera so it never clips.
      if (state.cameraPosition) {
        sky.position.copy(state.cameraPosition);
      }
    },
  };
}
