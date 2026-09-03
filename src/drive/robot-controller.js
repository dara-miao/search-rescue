/**
 * robot-controller.js
 *
 * Movement, collision, camera, and headlight for the rescue robot.
 *
 * ============================================================
 * CONVENTIONS — every system in the project must use these
 * ============================================================
 *
 * World axes (matching site-data.json):
 *     +X = east        +Y = up        +Z = south
 *
 * Heading is a single scalar `yaw` in radians, applied as mesh.rotation.y.
 * It is the ONLY source of truth for which way the robot faces. Nothing
 * else stores a direction.
 *
 * yaw = 0 means facing -Z (north, into the building's rear).
 * This matches three.js's default object forward, which is -Z. Do not
 * redefine it: if the robot mesh was authored pointing +X, rotate the mesh
 * geometry once at load, do not compensate in the controller.
 *
 *     forward = ( -sin(yaw), 0, -cos(yaw) )
 *     right   = (  cos(yaw), 0, -sin(yaw) )
 *
 * Derive every direction from these two functions. The flashlight pointing
 * 90° off is exactly what happens when one system uses +X as forward and
 * another uses -Z.
 *
 * ============================================================
 * DRIVE MODEL — differential drive, not a direction vector
 * ============================================================
 *
 * The stick is NOT "move toward this direction". It is two independent
 * scalars, like a tank:
 *
 *     stick.y  ->  throttle   (forward / reverse along `forward`)
 *     stick.x  ->  steer      (rate of change of yaw)
 *
 * Feeding a stick vector in as a world-space or camera-space heading is what
 * makes the controls feel like they are fighting you: the chassis has its own
 * heading, and a world-space target constantly disagrees with it.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------- config

export const ROBOT_CONFIG = {
  radius: 0.85,             // collision circle
  maxSpeed: 6.0,            // m/s
  maxReverseSpeed: 2.5,
  accel: 9.0,               // m/s^2 — ramps over ~0.65s
  brakeAccel: 14.0,
  maxTurnRate: 2.2,         // rad/s at standstill

  // Turn rate falls off with speed. Full turn authority at speed makes the
  // chassis spin like a top and is a large part of why the camera feels bad.
  turnRateAtMaxSpeed: 0.9,

  input: {
    deadzone: 0.12,
    // Response curve: fine control near centre, full authority at the rim.
    // Linear feels twitchy on a touch control; a full square feels dead —
    // at 2.0 a half-deflected stick gave only 19% output. 1.6 is the
    // compromise that still lets you creep.
    curve: 1.6,
  },

  camera: {
    distance: 11,
    height: 5.2,
    lookAhead: 4.0,
    // Position tracks quickly; rotation tracks slowly. This split is the
    // whole trick — a camera rigidly locked to chassis yaw is nauseating
    // the moment the robot turns.
    positionLerp: 6.5,
    yawLerp: 2.2,
    pitch: -0.28,
  },

  headlight: {
    angle: 0.52,            // radians, half-angle of the cone
    penumbra: 0.35,
    intensity: 45,
    distance: 42,
    decay: 1.4,
    mountHeight: 1.1,
    mountForward: 0.7,
    // How far ahead of the robot the light aims. Must be positive and along
    // `forward` — see attachHeadlight for why the target is a scene child.
    aimDistance: 18,
    aimDrop: 0.55,          // aim slightly downward, at the ground ahead
  },
};

// ---------------------------------------------------------------- basis

export function forwardVector(yaw, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}

export function rightVector(yaw, out = new THREE.Vector3()) {
  return out.set(Math.cos(yaw), 0, -Math.sin(yaw));
}

// ---------------------------------------------------------------- input

function applyDeadzone(v, deadzone, curve) {
  const mag = Math.abs(v);
  if (mag < deadzone) return 0;
  const scaled = (mag - deadzone) / (1 - deadzone);
  return Math.sign(v) * Math.pow(scaled, curve);
}

/**
 * Normalize raw input from either a touch stick or the keyboard into the
 * same { throttle, steer } pair. Both paths must produce the same shape or
 * the two control schemes will feel different.
 */
export function readInput(raw, cfg = ROBOT_CONFIG) {
  const { deadzone, curve } = cfg.input;

  if (raw.stick) {
    // Stick y is conventionally +down on screen; forward is up.
    return {
      throttle: applyDeadzone(-raw.stick.y, deadzone, curve),
      steer: applyDeadzone(raw.stick.x, deadzone, curve),
    };
  }

  const k = raw.keys || {};
  return {
    throttle: (k.forward ? 1 : 0) - (k.back ? 1 : 0),
    steer: (k.right ? 1 : 0) - (k.left ? 1 : 0),
  };
}

// ---------------------------------------------------------------- collision

/**
 * Closest point on a polygon boundary, plus whether the query point is
 * inside. Polygons are arrays of { x, z }.
 */
function closestOnPolygon(x, z, poly) {
  let bestDist = Infinity;
  let bx = x, bz = z;
  let nx = 1, nz = 0;
  let inside = false;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j].x, az = poly[j].z;
    const cx = poly[i].x, cz = poly[i].z;

    // Winding test for containment.
    if ((cz > z) !== (az > z) && x < ((ax - cx) * (z - cz)) / (az - cz) + cx) {
      inside = !inside;
    }

    const dx = cx - ax, dz = cz - az;
    const lenSq = dx * dx + dz * dz;
    const t = lenSq > 0
      ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq))
      : 0;
    const px = ax + t * dx, pz = az + t * dz;
    const d = Math.hypot(x - px, z - pz);

    if (d < bestDist) {
      bestDist = d; bx = px; bz = pz;
      // Edge normal, used when the robot sits exactly on the boundary and
      // the point-to-point vector is degenerate.
      const el = Math.hypot(dx, dz) || 1;
      nx = dz / el; nz = -dx / el;
    }
  }

  return { x: bx, z: bz, dist: bestDist, inside, nx, nz };
}

function pointInPolygon(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Kinematic circle-vs-polygon collision.
 *
 * Resolves by push-out rather than by blocking: the robot slides along walls
 * instead of sticking, which matters a lot when driving is meant to be
 * forgiving. Iterated so that corners (two edges at once) settle.
 *
 * `blockers` is an array of polygons the robot must stay OUTSIDE of.
 */
export function resolveCollision(pos, radius, blockers, iterations = 3) {
  let x = pos.x, z = pos.z;
  let hit = false;

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;

    for (const poly of blockers) {
      const near = closestOnPolygon(x, z, poly);

      if (near.dist >= radius && !near.inside) continue;

      let dx = x - near.x, dz = z - near.z;
      let len = Math.hypot(dx, dz);

      if (len < 1e-6) {
        // Sitting exactly on the boundary: the point-to-point vector carries
        // no direction, so fall back to the edge normal. Probe a short step
        // along it to work out which way is outward — this stays correct for
        // concave footprints, where "away from the centroid" does not.
        const eps = 1e-3;
        const outward = pointInPolygon(
          near.x + near.nx * eps, near.z + near.nz * eps, poly
        ) ? -1 : 1;
        dx = near.nx * outward;
        dz = near.nz * outward;
        len = 1;
      } else if (near.inside) {
        // Inside the mass — reverse, so the push exits rather than digs in.
        dx = -dx; dz = -dz;
      }

      x = near.x + (dx / len) * radius;
      z = near.z + (dz / len) * radius;
      moved = true;
      hit = true;
    }

    if (!moved) break;
  }

  return { x, z, hit };
}

/**
 * Build the blocker set from site data.
 *
 * The OSM footprint alone is not enough: the entrance pavilion and end
 * pavilions project past it, and the player will drive straight through them
 * otherwise. Each projecting volume needs its own polygon.
 */
export function buildBlockers(siteData, massingConfig) {
  const blockers = [siteData.building.footprint];

  const ob = siteData.building.orientedBounds;
  const cos = Math.cos(-ob.angleRad), sin = Math.sin(-ob.angleRad);

  const toWorld = (lx, lz) => ({
    x: ob.centre.x + lx * cos - lz * sin,
    z: ob.centre.z + lx * sin + lz * cos,
  });

  const rectBlocker = (cx, cz, w, d) => [
    toWorld(cx - w / 2, cz - d / 2),
    toWorld(cx + w / 2, cz - d / 2),
    toWorld(cx + w / 2, cz + d / 2),
    toWorld(cx - w / 2, cz + d / 2),
  ];

  if (massingConfig) {
    const pv = massingConfig.pavilion;
    const ep = massingConfig.endPavilion;
    const D = ob.depth, W = ob.width;

    blockers.push(rectBlocker(0, D / 2 + pv.projection / 2, pv.width, pv.projection));
    blockers.push(rectBlocker(-(W / 2 - ep.width / 2), D / 2 + ep.projection / 2, ep.width, ep.projection));
    blockers.push(rectBlocker(+(W / 2 - ep.width / 2), D / 2 + ep.projection / 2, ep.width, ep.projection));
  }

  return blockers;
}

// ---------------------------------------------------------------- headlight

/**
 * Mount the headlight.
 *
 * The classic bug: a SpotLight's `target` defaults to an Object3D at the
 * world origin. Parenting the light to the robot moves the light but NOT the
 * target, so the cone keeps pointing at (0,0,0) — which, from anywhere on the
 * site, looks like the beam is aimed off to one side and swings as you drive.
 *
 * The fix is that the target must be a child of the SCENE (not the robot),
 * and its position must be recomputed every frame from the robot's yaw.
 */
export function attachHeadlight(scene, robotMesh, cfg = ROBOT_CONFIG) {
  const h = cfg.headlight;

  const light = new THREE.SpotLight(
    0xfff2d8, h.intensity, h.distance, h.angle, h.penumbra, h.decay
  );
  light.position.set(0, h.mountHeight, -h.mountForward);  // -Z is forward
  light.castShadow = false;
  light.shadow.mapSize.set(512, 512);
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = h.distance;
  light.shadow.bias = -0.0008;

  robotMesh.add(light);

  // Target lives in the scene, NOT on the robot.
  const target = new THREE.Object3D();
  target.name = 'headlightTarget';
  scene.add(target);
  light.target = target;

  return { light, target };
}

function updateHeadlight(headlight, position, yaw, cfg = ROBOT_CONFIG) {
  const h = cfg.headlight;
  const fwd = forwardVector(yaw);
  headlight.target.position.set(
    position.x + fwd.x * h.aimDistance,
    h.mountHeight - h.aimDrop * (h.aimDistance / 10),
    position.z + fwd.z * h.aimDistance
  );
  headlight.target.updateMatrixWorld();
}

// ---------------------------------------------------------------- controller

export function createRobotController(scene, robotMesh, siteData, opts = {}) {
  const cfg = { ...ROBOT_CONFIG, ...(opts.config || {}) };
  const blockers = opts.blockers || buildBlockers(siteData, opts.massingConfig);

  const state = {
    position: new THREE.Vector3(
      opts.start?.x ?? siteData.building.orientedBounds.centre.x,
      0,
      opts.start?.z ?? siteData.building.orientedBounds.centre.z + siteData.building.orientedBounds.depth / 2 + 34
    ),
    yaw: opts.startYaw ?? Math.PI,   // facing +Z (south) at the staging area
    speed: 0,
    collided: false,
  };

  const headlight = attachHeadlight(scene, robotMesh, cfg);

  // Camera yaw is tracked separately from chassis yaw and lags it.
  let camYaw = state.yaw;
  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  let camInit = false;

  const _fwd = new THREE.Vector3();

  return {
    state,
    headlight,
    blockers,

    update(dt, raw, camera) {
      const { throttle, steer } = readInput(raw, cfg);

      // --- speed ------------------------------------------------------
      const targetSpeed = throttle >= 0
        ? throttle * cfg.maxSpeed
        : throttle * cfg.maxReverseSpeed;

      const accel = Math.abs(targetSpeed) > Math.abs(state.speed)
        ? cfg.accel
        : cfg.brakeAccel;

      const dv = targetSpeed - state.speed;
      state.speed += Math.sign(dv) * Math.min(Math.abs(dv), accel * dt);

      // --- heading ----------------------------------------------------
      // Turn authority falls off with speed. Also allow turning in place:
      // at zero speed a differential-drive robot pivots, which is a large
      // part of why it reads as a robot and not a car.
      const speedFrac = Math.min(Math.abs(state.speed) / cfg.maxSpeed, 1);
      const turnRate = THREE.MathUtils.lerp(
        cfg.maxTurnRate, cfg.turnRateAtMaxSpeed, speedFrac
      );
      state.yaw -= steer * turnRate * dt;

      // --- integrate --------------------------------------------------
      // Substep if the frame's travel exceeds half the collision radius.
      // Push-out alone handles normal frames, but a lag spike (or a browser
      // tab regaining focus with a huge dt) can step clean through a wall.
      forwardVector(state.yaw, _fwd);
      const travel = Math.abs(state.speed) * dt;
      const steps = Math.max(1, Math.ceil(travel / (cfg.radius * 0.5)));
      const stepDt = dt / steps;

      let hitAny = false;
      for (let i = 0; i < steps; i++) {
        const nextX = state.position.x + _fwd.x * state.speed * stepDt;
        const nextZ = state.position.z + _fwd.z * state.speed * stepDt;

        const resolved = resolveCollision(
          { x: nextX, z: nextZ }, cfg.radius, blockers
        );
        state.position.x = resolved.x;
        state.position.z = resolved.z;
        if (resolved.hit) hitAny = true;
      }

      state.collided = hitAny;

      // Bleed speed on contact so grinding along a wall doesn't feel free.
      if (hitAny) state.speed *= 0.55;

      robotMesh.position.copy(state.position);
      robotMesh.rotation.y = state.yaw;

      updateHeadlight(headlight, state.position, state.yaw, cfg);

      // --- camera -----------------------------------------------------
      if (camera) {
        const c = cfg.camera;

        // Shortest-arc interpolation toward chassis yaw, deliberately slow.
        let delta = state.yaw - camYaw;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        camYaw += delta * Math.min(1, c.yawLerp * dt);

        const camFwd = forwardVector(camYaw);
        camPos.set(
          state.position.x - camFwd.x * c.distance,
          c.height,
          state.position.z - camFwd.z * c.distance
        );

        if (!camInit) { camera.position.copy(camPos); camInit = true; }
        else { camera.position.lerp(camPos, Math.min(1, c.positionLerp * dt)); }

        camTarget.set(
          state.position.x + camFwd.x * c.lookAhead,
          1.2,
          state.position.z + camFwd.z * c.lookAhead
        );
        camera.lookAt(camTarget);
      }

      return state;
    },
  };
}
