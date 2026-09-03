/**
 * extraction-markers.js
 *
 * Visual affordance for extraction points — the second of the two channels
 * described in doheny-massing.js's updateWindowGlow.
 *
 * DESIGN RULES
 *
 * 1. Cool against warm. Fire is orange; every affordance is cyan. The two
 *    channels must never be confusable at a glance, and hue separation does
 *    that more reliably than shape or motion. This is the single most
 *    important decision in this file.
 *
 * 2. Steady means available. AVAILABLE never blinks — blinking is what
 *    interfaces use to mean disabled, so a flashing "you can use this" reads
 *    as exactly the opposite. Only ACTIVE animates, and it pulses smoothly
 *    rather than blinking on and off.
 *
 * 3. Dead is gone, not greyed. A vented extraction point removes its marker
 *    entirely. A dimmed marker invites the player to keep trying it.
 *
 * 4. The ground ring is the rescue radius. It isn't decoration — its radius
 *    equals the distance at which the rescue action becomes available, so
 *    the marker tells you exactly where to park. Keep them in sync.
 *
 * MARKER STRUCTURE
 *
 * Each marker is a Group whose children all share ONE material instance,
 * exposed as `marker.material`. updateWindowGlow sets `marker.visible` and
 * `marker.material.opacity`, so a shared material means one write drives the
 * whole marker. Do not give the children separate materials.
 *
 * Usage:
 *   import { attachExtractionMarkers } from './extraction-markers.js';
 *
 *   const report = attachExtractionMarkers(massingGroup, extractionPoints);
 *   console.log(report);   // check for unmatched points during development
 *
 *   // in the frame loop, unchanged from before:
 *   updateWindowGlow(massingGroup, lookupHeat, lookupStatus, elapsed);
 */

import * as THREE from 'three';

export const MARKER_CONFIG = {
  // Must equal the rescue action's range. See design rule 4.
  rescueRadius: 4.0,

  color: 0x3fe0ff,          // cyan — maximally separated from fire orange
  colorSelfExtract: 0x5effc4, // green-cyan for openings that need clearing,
                              // not carrying: a different action, so a
                              // different shade. Still cool, still not fire.

  outline: {
    thickness: 0.18,
    inflate: 0.28,          // sits just outside the window surround
    depth: 0.05,
    offset: 0.12,           // proud of the wall face
  },

  groundRing: {
    thickness: 0.22,
    y: 0.08,
    segments: 48,
  },

  beacon: {
    enabled: true,
    height: 10.5,
    radius: 0.22,
    // Fades out with height so it reads as a shaft of light rather than a
    // solid post. Visible across the lawn, which is the point — the player
    // needs to spot available points from the far side of a perimeter run.
    topOpacity: 0.18,
    bottomOpacity: 0.95,
  },

  opacity: {
    available: 0.85,
    activeMin: 0.25,
    activeMax: 0.95,
  },
};

// ---------------------------------------------------------------- shapes

/**
 * Round-arched profile. Duplicated from the massing module rather than
 * imported so this file has no cross-dependency — they are the same curve
 * but they are allowed to diverge (marker outlines may want a squarer arch).
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

  const springLine = Math.max(height - hw, 0.01);
  s.moveTo(-hw, 0);
  s.lineTo(hw, 0);
  s.lineTo(hw, springLine);
  s.absarc(0, springLine, hw, 0, Math.PI, false);
  s.lineTo(-hw, 0);
  s.closePath();
  return s;
}

/** Thin arched outline: an arched shape with a slightly smaller hole. */
function outlineGeometry(width, height, arched, cfg) {
  const t = cfg.outline.thickness;
  const w = width + cfg.outline.inflate * 2;
  const h = height + cfg.outline.inflate * 2;

  const outer = archedShape(w, h, arched);
  outer.holes.push(archedShape(w - t * 2, h - t * 2, arched));

  return new THREE.ExtrudeGeometry(outer, {
    depth: cfg.outline.depth,
    bevelEnabled: false,
  });
}

/**
 * Ground zone marker: a SEMICIRCLE, not a full ring.
 *
 * The rescue radius is measured from the opening, which sits in the wall, so
 * a full circle would bury half of itself inside the building — geometrically
 * correct but visually broken. The outward half is the only part the robot
 * can actually occupy, so that is the only part drawn.
 *
 * RingGeometry sweeps theta from +X toward +Y; after rotateX(-90°) that maps
 * to +X through -Z to -X, which is exactly the outward hemisphere in facade
 * local space (where -Z is outward).
 */
function groundRingGeometry(cfg) {
  const r = cfg.rescueRadius;
  const g = new THREE.RingGeometry(
    r - cfg.groundRing.thickness, r,
    cfg.groundRing.segments, 1,
    0, Math.PI
  );
  g.rotateX(-Math.PI / 2);
  g.translate(0, cfg.groundRing.y, 0);
  return g;
}

/**
 * Vertical shaft, faded toward the top via vertex alpha.
 *
 * Vertex colours are used rather than a gradient texture so the whole marker
 * can stay on one material. The material's own opacity multiplies this, so
 * the status animation still drives it.
 */
function beaconGeometry(cfg) {
  const b = cfg.beacon;
  const g = new THREE.CylinderGeometry(
    b.radius * 0.4, b.radius, b.height, 8, 1, true
  );
  g.translate(0, b.height / 2, 0);

  const pos = g.attributes.position;
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / b.height, 0, 1);
    const a = THREE.MathUtils.lerp(b.bottomOpacity, b.topOpacity, t);
    colors.push(a, a, a);   // greyscale ramp, multiplied by material colour
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

// ---------------------------------------------------------------- build

function buildMarker(spec, cfg) {
  const group = new THREE.Group();
  group.name = `extraction-${spec.facade}-${spec.bayIndex}`;

  // One material for the whole marker — see MARKER STRUCTURE above.
  const material = new THREE.MeshBasicMaterial({
    color: spec.selfExtract ? cfg.colorSelfExtract : cfg.color,
    transparent: true,
    opacity: cfg.opacity.available,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    fog: false,         // must read from the far lawn; fog ate the shafts
  });

  // In facade local space -Z is outward (see buildFacade in doheny-massing).
  // Every marker offset is negative for that reason — a positive offset
  // buries the marker inside the wall, where it is invisible.
  const OUT = -1;

  // Outline needs white vertex colours so vertexColors doesn't darken it.
  const outline = outlineGeometry(spec.width, spec.height, spec.arched, cfg);
  whiten(outline);
  outline.translate(0, spec.sillY, OUT * cfg.outline.offset);

  // Centred on the wall, because the rescue radius is measured from the
  // opening. The semicircle already restricts it to the outward side.
  const ring = groundRingGeometry(cfg);
  whiten(ring);

  const meshes = [
    new THREE.Mesh(outline, material),
    new THREE.Mesh(ring, material),
  ];

  if (cfg.beacon.enabled) {
    const beacon = beaconGeometry(cfg);
    beacon.translate(0, 0, OUT * 1.0);   // just clear of the facade
    meshes.push(new THREE.Mesh(beacon, material));
  }

  for (const m of meshes) {
    m.renderOrder = 3;      // draw after opaque geometry
    group.add(m);
  }

  // Exposed so updateWindowGlow can drive the whole marker with one write.
  group.material = material;
  group.userData = { ...spec };
  return group;
}

function whiten(geo) {
  const n = geo.attributes.position.count;
  const colors = new Float32Array(n * 3).fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// ---------------------------------------------------------------- attach

/**
 * Attach a marker to each extraction point.
 *
 * extractionPoints: array of
 *   { cellId, facade, bayIndex, floor, openingType, selfExtract? }
 *
 * Markers are parented to the same facade holder as their window, so they
 * inherit the facade's rotation and position automatically. Do not place
 * them in world space — the facades are rotated by the building's oriented
 * bounding box angle and hand-placing markers will drift.
 *
 * Returns a report. Check `unmatched` during development: a non-empty list
 * means your extraction point definitions disagree with the generated bay
 * indices, which is silent otherwise.
 */
export function attachExtractionMarkers(massingGroup, extractionPoints, cfg = MARKER_CONFIG) {
  const windows = massingGroup.userData.windows || [];
  const byKey = new Map();

  for (const win of windows) {
    const { floor, facade, bayIndex } = win.userData;
    byKey.set(`${facade}:${floor}:${bayIndex}`, win);
  }

  const attached = [];
  const unmatched = [];

  for (const point of extractionPoints) {
    const floor = point.floor ?? 0;
    const key = `${point.facade}:${floor}:${point.bayIndex}`;
    const win = byKey.get(key);

    if (!win) {
      unmatched.push(key);
      continue;
    }

    // Recover the opening's dimensions from the window mesh's own geometry
    // rather than re-deriving them from config, so the outline always hugs
    // the actual opening even if the massing config changes.
    win.geometry.computeBoundingBox();
    const bb = win.geometry.boundingBox;
    const width = bb.max.x - bb.min.x;
    const height = bb.max.y - bb.min.y;

    const marker = buildMarker({
      ...point,
      floor,
      width,
      height,
      arched: floor !== 0,
      sillY: win.position.y,
      selfExtract: point.selfExtract === true,
    }, cfg);

    // Same parent as the window, and the same x offset along the facade.
    marker.position.set(win.position.x, 0, 0);
    win.parent.add(marker);

    win.userData.marker = marker;
    attached.push(key);
  }

  if (unmatched.length) {
    console.warn(
      `[extraction-markers] ${unmatched.length} point(s) matched no window:`,
      unmatched
    );
  }

  return {
    attached: attached.length,
    unmatched,
    totalWindows: windows.length,
  };
}

/**
 * Ground-floor extraction points for the twelve perimeter cells.
 *
 * bayIndex values must match what solveBays produced for each facade. The
 * south facade skips its centre for the entrance pavilion, so its indices
 * are NOT symmetric about the middle — read them off the generated windows
 * rather than assuming.
 */
export function defaultExtractionPoints(massingGroup) {
  const windows = massingGroup.userData.windows || [];
  const groundByFacade = {};

  for (const win of windows) {
    const { floor, facade, bayIndex } = win.userData;
    if (floor !== 0) continue;
    (groundByFacade[facade] ||= []).push(bayIndex);
  }

  const points = [];
  const pick = (facade, count, opts = {}) => {
    const bays = (groundByFacade[facade] || []).sort((a, b) => a - b);
    if (!bays.length) return;

    // Spread across the FULL facade. Stepping from index 0 biases every
    // facade toward one end and leaves the far corner with no extraction
    // point at all — which matters, because route denial by fire is supposed
    // to threaten the whole perimeter evenly.
    const n_ = Math.min(count, bays.length);
    for (let i = 0; i < n_; i++) {
      const idx = Math.floor((i + 0.5) * bays.length / n_);
      points.push({
        facade,
        bayIndex: bays[idx],
        floor: 0,
        cellId: `${facade}-${bays[idx]}`,
        openingType: opts.openingType || 'window',
        selfExtract: opts.selfExtract === true,
      });
    }
  };

  // Four faces, twelve points, weighted toward the accessible south front.
  pick('south', 4, { openingType: 'door', selfExtract: true });
  pick('east', 3);
  pick('north', 3, { openingType: 'service' });
  pick('west', 2);

  return points;
}
