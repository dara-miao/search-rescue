/**
 * robot-chase.js
 *
 * Vehicle-style drive with a locked chase camera: the robot is always drawn
 * pointing up-screen, and the world rotates around it when you turn.
 *
 * ============================================================
 * WHY THIS IS A PACKAGE, NOT TWO CHOICES
 * ============================================================
 *
 * "The robot is always straight ahead on screen" means, precisely:
 *
 *     cameraYaw == robotYaw
 *
 * Once those are equal, camera-relative and robot-relative are the same
 * frame of reference. There is no longer any such thing as camera-relative
 * input here — asking for the locked chase camera IS asking for vehicle
 * controls. The two cannot be mixed and matched.
 *
 * So: stick Y is throttle, stick X is STEERING (a rate). That is the same
 * family as the model that spun. It does not spin here, for one reason.
 *
 * ============================================================
 * THE FIX: STEERING AUTHORITY IS A FUNCTION OF SPEED
 * ============================================================
 *
 * The old bug was not "tank controls". It was full turn rate at zero speed.
 * Holding a touch stick right while stationary rotated the robot forever at
 * 126 deg/s — a pirouette, which is what "it spins" means.
 *
 * Real vehicles cannot do that. Angular velocity follows from forward speed
 * and turn radius:
 *
 *     omega = v / turnRadius
 *
 * so at v = 0, omega = 0. Steering while stopped does nothing. Steering
 * while moving traces an arc. This is what every racing game does, and it is
 * the entire reason their chase cameras feel fine.
 *
 * A tracked robot CAN pivot in place, and that is genuinely useful for lining
 * up on a window, so a small floor (`pivotRate`) is allowed. It is slow and
 * deliberate — about 31 deg/s, roughly 11 seconds for a full turn. Fast
 * enough to aim, far too slow to feel like spinning.
 *
 * ============================================================
 * THE COST OF A LOCKED CAMERA, AND HOW TO PAY IT
 * ============================================================
 *
 * If the robot never visually rotates, you have deleted your primary cue
 * that a turn is happening. The world sliding sideways is a weak signal and
 * reads as drift rather than steering. Mario Kart, Forza and Rocket League
 * all replace that cue with the same three things:
 *
 *   1. Camera yaw LAG. The camera converges on robot yaw over ~0.2s rather
 *      than matching it exactly, so mid-turn you see the robot angled a few
 *      degrees off centre. Small enough to still read as "straight ahead",
 *      large enough to feel the turn. Set `yawLag` to 0 for a perfectly
 *      rigid camera and the turn becomes almost invisible.
 *   2. ROLL into the turn. A couple of degrees of camera bank. Reads as
 *      cornering force.
 *   3. FOV widening with speed. Wider FOV makes a game feel faster.
 *
 * These are not decoration. Without them a locked chase camera feels inert.
 */

import * as THREE from 'three';
import { resolveCollision } from './robot-controller.js';

export const CHASE_CONFIG = {
  radius: 0.85,

  maxSpeed: 6.0,
  maxReverseSpeed: 2.2,
  accel: 9.0,
  brakeAccel: 15.0,

  steering: {
    // Tightest arc the robot can hold at speed. Smaller = twitchier.
    minTurnRadius: 3.6,
    // Angular rate floor so it can still pivot when stopped. Deliberately
    // slow: this is for aiming, not for turning.
    pivotRate: 0.55,          // rad/s ~ 31 deg/s
    maxTurnRate: 1.9,         // hard cap, rad/s
    // Reverse steering is inverted in world terms but should feel the same
    // to the player, matching how reversing a real vehicle behaves.
    invertInReverse: true,
  },

  input: {
    deadzone: 0.15,
    throttleCurve: 1.5,
    steerCurve: 1.7,          // steering wants finer control near centre
  },

  camera: {
    distance: 11,
    height: 5.4,
    lookAhead: 5.0,
    lookHeight: 1.4,
    positionLerp: 7.0,

    // Rotational lag. See notes above — 0 gives a rigid camera and kills
    // the sense of turning.
    // Higher = tighter lock. At 5.0 the camera took 0.87s to fully settle
    // after a turn, which reads as sloppy when the brief is "always straight
    // ahead". At 7.0 it is 90% settled in 0.33s and fully settled in 0.54s.
    yawLag: 7.0,
    maxVisualOffset: 0.22,    // rad, ~12.6 deg; clamps how far the robot
                              // can visually swing off centre

    roll: {
      enabled: true,
      maxRoll: 0.055,         // rad, ~3.2 deg
      lerp: 3.5,
    },

    fov: {
      base: 60,
      atMaxSpeed: 71,
      lerp: 2.5,
    },
  },
};

// ---------------------------------------------------------------- basis

export function forwardVector(yaw, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}

export function shortestAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// ---------------------------------------------------------------- input

/**
 * Radial deadzone, then separate curves for the two axes.
 *
 * The deadzone is applied to the vector magnitude, not per-axis. A per-axis
 * deadzone carves a plus-shaped dead region out of the stick, so shallow
 * diagonals snap to a cardinal — you push slightly forward-and-right and get
 * pure forward, or pure right.
 */
export function readStick(x, y, cfg = CHASE_CONFIG) {
  const mag = Math.hypot(x, y);
  if (mag < cfg.input.deadzone) return { throttle: 0, steer: 0 };

  const scale = Math.min((mag - cfg.input.deadzone) / (1 - cfg.input.deadzone), 1) / mag;
  const nx = x * scale;
  const ny = y * scale;

  const curve = (v, k) => Math.sign(v) * Math.pow(Math.min(Math.abs(v), 1), k);

  return {
    throttle: curve(-ny, cfg.input.throttleCurve),   // screen up = forward
    steer: curve(nx, cfg.input.steerCurve),
  };
}

// ---------------------------------------------------------------- steering

/**
 * Maximum angular rate available at a given speed.
 *
 * This single function is the difference between "drives like a vehicle" and
 * "spins like a top". Everything else in this file is presentation.
 */
export function turnRateAtSpeed(speed, cfg = CHASE_CONFIG) {
  const s = cfg.steering;
  const fromRadius = Math.abs(speed) / s.minTurnRadius;
  return Math.min(Math.max(fromRadius, s.pivotRate), s.maxTurnRate);
}

// ---------------------------------------------------------------- drive

/**
 * One movement step. `state` carries { position, yaw, speed }.
 *
 * Note what is absent: camera yaw. This function never reads it, which is
 * the structural reason a locked chase camera cannot create a feedback loop
 * here. The earlier spiral needed input to depend on camera orientation.
 */
export function stepDrive(state, stick, dt, cfg = CHASE_CONFIG) {
  const { throttle, steer } = readStick(stick.x, stick.y, cfg);

  // --- speed -----------------------------------------------------------
  const targetSpeed = throttle >= 0
    ? throttle * cfg.maxSpeed
    : throttle * cfg.maxReverseSpeed;

  const accel = Math.abs(targetSpeed) > Math.abs(state.speed)
    ? cfg.accel
    : cfg.brakeAccel;

  const dv = targetSpeed - state.speed;
  state.speed += Math.sign(dv) * Math.min(Math.abs(dv), accel * dt);

  // --- heading ---------------------------------------------------------
  const rate = turnRateAtSpeed(state.speed, cfg);

  // Reversing: invert so that pushing the stick right still swings the rear
  // of the robot the way the player expects, as in a real vehicle.
  const dir = (cfg.steering.invertInReverse && state.speed < -0.05) ? -1 : 1;

  const yawDelta = -steer * rate * dt * dir;
  state.yaw = shortestAngle(state.yaw + yawDelta);

  // --- integrate -------------------------------------------------------
  const fwd = forwardVector(state.yaw);
  return {
    nextX: state.position.x + fwd.x * state.speed * dt,
    nextZ: state.position.z + fwd.z * state.speed * dt,
    yawRate: dt > 0 ? yawDelta / dt : 0,
    throttle,
    steer,
  };
}

// ---------------------------------------------------------------- camera

export function createChaseCamera(cfg = CHASE_CONFIG) {
  return { yaw: 0, roll: 0, fov: cfg.camera.fov.base, initialised: false };
}

/** Lens radius. Bigger than `near` so a wall cannot sit inside the clip plane. */
export const CHASE_CAM_SKIN = 1.2;

/**
 * Shorten the chase boom until the lens is outside every blocker.
 * A lateral push would slide the camera off-axis and break the locked chase.
 * Walking t from the robot to the desired point keeps the robot up-screen.
 */
export function keepChaseCameraOut(from, to, blockers, radius = CHASE_CAM_SKIN) {
  if (!blockers || !blockers.length) return { x: to.x, z: to.z };
  if (!resolveCollision({ x: to.x, z: to.z }, radius, blockers).hit) {
    return { x: to.x, z: to.z };
  }

  let lo = 0;
  let hi = 1;
  let best = { x: from.x, z: from.z };
  for (let i = 0; i < 14; i++) {
    const t = (lo + hi) * 0.5;
    const p = {
      x: from.x + (to.x - from.x) * t,
      z: from.z + (to.z - from.z) * t,
    };
    if (resolveCollision(p, radius, blockers).hit) hi = t;
    else {
      lo = t;
      best = p;
    }
  }
  return best;
}

/** Settled chase pose: behind the robot, looking past it up-screen. */
export function desiredChaseShot(robot, cfg = CHASE_CONFIG, blockers) {
  const c = cfg.camera;
  const camFwd = forwardVector(robot.yaw);
  const groundY = robot.position.y || 0;
  const raw = {
    x: robot.position.x - camFwd.x * c.distance,
    y: groundY + c.height,
    z: robot.position.z - camFwd.z * c.distance,
  };
  const held = keepChaseCameraOut(robot.position, raw, blockers, CHASE_CAM_SKIN);
  const robotFwd = forwardVector(robot.yaw);
  return {
    position: { x: held.x, y: raw.y, z: held.z },
    look: {
      x: robot.position.x + robotFwd.x * c.lookAhead,
      y: groundY + c.lookHeight,
      z: robot.position.z + robotFwd.z * c.lookAhead,
    },
    fov: c.fov.base,
  };
}

/**
 * Locked chase camera.
 *
 * Sits directly behind the robot so it is always drawn pointing up-screen.
 * The lag and clamp keep it "straight ahead" while still letting a turn be
 * visible — with yawLag high and maxVisualOffset at 0 you get a perfectly
 * rigid camera, which reads as the world spinning rather than the robot
 * turning.
 */
export function stepChaseCamera(cam, robot, camera, dt, cfg = CHASE_CONFIG, blockers) {
  const c = cfg.camera;

  if (!cam.initialised) {
    cam.yaw = robot.yaw;
    cam.initialised = true;
  }

  // Lagged convergence on robot yaw.
  const delta = shortestAngle(robot.yaw - cam.yaw);
  cam.yaw = shortestAngle(cam.yaw + delta * Math.min(1, c.yawLag * dt));

  // Clamp how far the robot can visually swing off centre, so the lag never
  // grows into a genuinely off-axis view during a long sustained turn.
  const offset = shortestAngle(robot.yaw - cam.yaw);
  if (Math.abs(offset) > c.maxVisualOffset) {
    cam.yaw = shortestAngle(
      robot.yaw - Math.sign(offset) * c.maxVisualOffset
    );
  }

  // --- position --------------------------------------------------------
  const camFwd = forwardVector(cam.yaw);
  const groundY = robot.position.y || 0;
  const desired = new THREE.Vector3(
    robot.position.x - camFwd.x * c.distance,
    groundY + c.height,
    robot.position.z - camFwd.z * c.distance
  );
  const held = keepChaseCameraOut(
    robot.position,
    desired,
    blockers,
    CHASE_CAM_SKIN,
  );
  desired.x = held.x;
  desired.z = held.z;

  if (dt > 0) {
    camera.position.lerp(desired, Math.min(1, c.positionLerp * dt));
  } else {
    camera.position.copy(desired);
  }

  // Lerp can still sit inside for a frame if the boom just became illegal.
  const now = keepChaseCameraOut(
    robot.position,
    camera.position,
    blockers,
    CHASE_CAM_SKIN,
  );
  camera.position.x = now.x;
  camera.position.z = now.z;

  // --- look target -----------------------------------------------------
  const robotFwd = forwardVector(robot.yaw);
  camera.lookAt(
    robot.position.x + robotFwd.x * c.lookAhead,
    groundY + c.lookHeight,
    robot.position.z + robotFwd.z * c.lookAhead
  );

  // --- roll ------------------------------------------------------------
  // Banks into the turn. With the robot locked straight ahead this is one of
  // the only cues left that cornering is happening.
  if (c.roll.enabled) {
    const speedFrac = Math.min(Math.abs(robot.speed) / cfg.maxSpeed, 1);
    const targetRoll = -(robot.yawRate || 0) / cfg.steering.maxTurnRate
      * c.roll.maxRoll * speedFrac;
    cam.roll += (targetRoll - cam.roll) * Math.min(1, c.roll.lerp * dt);
    camera.rotateZ(cam.roll);
  }

  // --- fov -------------------------------------------------------------
  const speedFrac = Math.min(Math.max(robot.speed, 0) / cfg.maxSpeed, 1);
  const targetFov = THREE.MathUtils.lerp(c.fov.base, c.fov.atMaxSpeed, speedFrac);
  cam.fov += (targetFov - cam.fov) * Math.min(1, c.fov.lerp * dt);

  if (Math.abs(camera.fov - cam.fov) > 0.01) {
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();
  }

  return cam;
}

// ---------------------------------------------------------------- headlight

/**
 * Headlight aimed straight down the robot's forward axis.
 *
 * With the locked chase camera this means the beam always points up-screen,
 * which is what makes the light read as "attached to the robot" rather than
 * swinging around independently.
 *
 * The target MUST be a child of the scene, not the robot. A SpotLight's
 * default target sits at the world origin; parenting the light to the robot
 * moves the light but leaves the target behind, so the beam aims at (0,0,0)
 * — which looks like a flashlight pointing off to one side and swinging as
 * you drive.
 */
export function attachHeadlight(scene, robotMesh, opts = {}) {
  const {
    angle = 0.5, penumbra = 0.35, intensity = 45, distance = 42, decay = 1.4,
    mountHeight = 1.1, mountForward = 0.7, aimDistance = 18, aimDrop = 1.0,
  } = opts;

  const light = new THREE.SpotLight(0xfff2d8, intensity, distance, angle, penumbra, decay);
  light.position.set(0, mountHeight, -mountForward);   // -Z is forward
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = distance;
  light.shadow.bias = -0.0008;
  robotMesh.add(light);

  const target = new THREE.Object3D();
  target.name = 'headlightTarget';
  scene.add(target);
  light.target = target;

  return {
    light,
    target,
    update(position, yaw) {
      const fwd = forwardVector(yaw);
      target.position.set(
        position.x + fwd.x * aimDistance,
        mountHeight - aimDrop,
        position.z + fwd.z * aimDistance
      );
      target.updateMatrixWorld();
    },
  };
}
