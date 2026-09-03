/**
 * robot-drive.js
 *
 * Camera-relative movement for the rescue robot, replacing the tank-drive
 * model in robot-controller.js.
 *
 * ============================================================
 * WHY THE OLD ONE SPUN
 * ============================================================
 *
 * Tank drive treats stick X as a TURN RATE:
 *
 *     yaw += stick.x * turnRate * dt;        // <- accumulates forever
 *
 * There is no target and no fixed point. Hold a virtual stick anywhere off
 * centre and the robot rotates without end. A physical gamepad hides this
 * because it springs back to exactly zero; a touch stick does not.
 *
 * It got worse because the camera followed robot yaw while input was
 * interpreted relative to the camera. That is a closed loop:
 *
 *     robot turns -> camera turns -> "forward" now means a new world
 *     direction -> robot turns further -> ...
 *
 * A control system whose output feeds its own input with gain >= 1 does not
 * settle. It spins.
 *
 * ============================================================
 * THE MODEL THAT REPLACES IT
 * ============================================================
 *
 * Camera-relative steer-toward, which is what essentially every modern
 * third-person game uses:
 *
 *   1. The stick vector is a DIRECTION in camera space, not a turn rate.
 *      Push up-left, the robot goes up-left on screen. Release, it stops.
 *   2. Convert that to a world direction, take its angle: that is the
 *      DESIRED yaw. Absolute, not incremental.
 *   3. Rotate toward the desired yaw at a capped rate. The cap is what
 *      preserves the vehicle feel — the robot still cannot pivot instantly,
 *      it just always has somewhere specific to be pointing.
 *   4. Scale speed by alignment, so it slows to pivot rather than driving
 *      in a wide arc when you reverse direction.
 *
 * Because yaw converges on a target instead of accumulating, it CANNOT spin.
 * Steady stick input produces a steady heading — that is the whole fix.
 *
 * And camera yaw is now independent state. It never derives from robot yaw
 * while input is active, which breaks the feedback loop at the source.
 */

import * as THREE from 'three';

export const DRIVE_CONFIG = {
  radius: 0.85,

  maxSpeed: 6.0,
  accel: 10.0,
  brakeAccel: 16.0,

  // Turn rate is now a rate LIMIT on convergence, not an input gain.
  // Higher than the old tank value because the robot must be able to swing
  // to a new heading promptly — it is chasing a target, not free-spinning.
  maxTurnRate: 3.6,          // rad/s, ~206 deg/s
  turnRateAtMaxSpeed: 1.5,   // still falls off with speed

  // Speed is gated by how well the robot is aligned with where it wants to
  // go. Without this the robot drives in a big arc every time you reverse
  // direction instead of pivoting on the spot.
  alignment: {
    // Below this dot product, do not drive at all — pivot first.
    driveThreshold: 0.25,
    // Exponent on the alignment falloff. Higher = more insistent on facing
    // the right way before committing speed.
    exponent: 1.5,
  },

  input: {
    deadzone: 0.15,   // larger than a gamepad's: touch sticks drift
    curve: 1.6,
  },

  camera: {
    distance: 11,
    height: 5.2,
    lookAhead: 4.0,
    positionLerp: 6.5,

    // Camera yaw is INDEPENDENT. It is driven by drag / right stick, and
    // optionally recentres behind the robot — but only after the player has
    // stopped steering for a while, and slowly. Any faster or any sooner
    // reintroduces the feedback loop.
    autoRecenter: true,
    recenterDelay: 1.2,       // seconds of no turn input before it starts
    recenterRate: 1.1,        // rad/s, deliberately slow
    recenterDeadzone: 0.35,   // rad; do not chase small heading differences
    manualYawRate: 2.4,       // rad/s from drag input
    // Stick magnitude above which recentring is suspended entirely.
    recenterInputThreshold: 0.05,
  },
};

// ---------------------------------------------------------------- basis

export function forwardVector(yaw, out = new THREE.Vector3()) {
  return out.set(-Math.sin(yaw), 0, -Math.cos(yaw));
}

export function rightVector(yaw, out = new THREE.Vector3()) {
  return out.set(Math.cos(yaw), 0, -Math.sin(yaw));
}

/** Inverse of forwardVector: the yaw that points along (dx, dz). */
export function yawFromDirection(dx, dz) {
  return Math.atan2(-dx, -dz);
}

export function shortestAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

// ---------------------------------------------------------------- input

/**
 * Radial deadzone.
 *
 * Applied to the VECTOR's magnitude, not to each axis separately. Per-axis
 * deadzones carve a plus-shaped dead region out of the stick, which makes
 * shallow diagonals snap to a cardinal direction and is a large part of why
 * touch sticks feel "weird".
 */
export function processStick(x, y, cfg = DRIVE_CONFIG) {
  const mag = Math.hypot(x, y);
  const { deadzone, curve } = cfg.input;

  if (mag < deadzone) return { x: 0, y: 0, magnitude: 0 };

  // Rescale so the deadzone edge maps to 0 and the rim maps to 1, then
  // curve. Without the rescale the stick jumps to `deadzone` output the
  // instant it crosses the threshold.
  const scaled = Math.min((mag - deadzone) / (1 - deadzone), 1);
  const curved = Math.pow(scaled, curve);

  return { x: (x / mag) * curved, y: (y / mag) * curved, magnitude: curved };
}

/**
 * Touch stick with correct release behaviour.
 *
 * The failure that produces endless spin: a stick that never returns to zero
 * because pointerup fired outside the element, or the pointer was lost to a
 * gesture. Pointer capture plus handling cancel/leave/blur fixes it.
 */
export function createTouchStick(element, { radius = 60 } = {}) {
  const state = { x: 0, y: 0, active: false, pointerId: null };
  let originX = 0, originY = 0;

  const reset = () => {
    state.x = 0; state.y = 0; state.active = false; state.pointerId = null;
  };

  element.addEventListener('pointerdown', (e) => {
    state.active = true;
    state.pointerId = e.pointerId;
    originX = e.clientX;
    originY = e.clientY;
    element.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  element.addEventListener('pointermove', (e) => {
    if (!state.active || e.pointerId !== state.pointerId) return;
    let dx = e.clientX - originX;
    let dy = e.clientY - originY;

    // Clamp to the stick radius, then normalize to -1..1.
    const d = Math.hypot(dx, dy);
    if (d > radius) { dx = (dx / d) * radius; dy = (dy / d) * radius; }

    state.x = dx / radius;
    state.y = dy / radius;
    e.preventDefault();
  });

  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
    element.addEventListener(ev, (e) => {
      if (e.pointerId !== state.pointerId) return;
      reset();
    });
  }
  // A backstop: losing window focus mid-drag otherwise leaves the stick held.
  window.addEventListener('blur', reset);

  return state;
}

// ---------------------------------------------------------------- drive

/**
 * One movement step.
 *
 * `state` carries { position, yaw, speed }. `cameraYaw` is passed in rather
 * than read from the robot, which is the structural reason this cannot form
 * a feedback loop.
 */
export function stepDrive(state, stick, cameraYaw, dt, cfg = DRIVE_CONFIG) {
  const input = processStick(stick.x, stick.y, cfg);

  let desiredYaw = state.yaw;
  let alignment = 1;
  let targetSpeed = 0;

  if (input.magnitude > 0) {
    // Stick -> world direction, through the camera's basis.
    // Screen up is -y, and screen up should mean "away from the camera",
    // which is the camera's forward.
    const camF = forwardVector(cameraYaw);
    const camR = rightVector(cameraYaw);

    const dx = camF.x * -input.y + camR.x * input.x;
    const dz = camF.z * -input.y + camR.z * input.x;

    desiredYaw = yawFromDirection(dx, dz);

    const delta = shortestAngle(desiredYaw - state.yaw);
    alignment = Math.cos(delta);

    // Gate speed on alignment: pivot before committing to a direction.
    const gate = alignment < cfg.alignment.driveThreshold
      ? 0
      : Math.pow(
          (alignment - cfg.alignment.driveThreshold) /
          (1 - cfg.alignment.driveThreshold),
          cfg.alignment.exponent
        );

    targetSpeed = cfg.maxSpeed * input.magnitude * gate;
  }

  // --- heading: converge on desiredYaw, rate-limited -------------------
  const speedFrac = Math.min(Math.abs(state.speed) / cfg.maxSpeed, 1);
  const turnRate = THREE.MathUtils.lerp(
    cfg.maxTurnRate, cfg.turnRateAtMaxSpeed, speedFrac
  );

  if (input.magnitude > 0) {
    const delta = shortestAngle(desiredYaw - state.yaw);
    const maxStep = turnRate * dt;
    state.yaw += Math.sign(delta) * Math.min(Math.abs(delta), maxStep);
    state.yaw = shortestAngle(state.yaw);
  }

  // --- speed -----------------------------------------------------------
  const accel = targetSpeed > state.speed ? cfg.accel : cfg.brakeAccel;
  const dv = targetSpeed - state.speed;
  state.speed += Math.sign(dv) * Math.min(Math.abs(dv), accel * dt);

  return { desiredYaw, alignment, targetSpeed, inputMagnitude: input.magnitude };
}

// ---------------------------------------------------------------- camera

/**
 * Independent camera yaw.
 *
 * Manual drag always wins. Auto-recentre only engages after the player has
 * left the camera alone for `recenterDelay`, ignores small offsets, and runs
 * slowly. Those three conditions together are what keep it from becoming an
 * input-output loop again.
 */
export function stepCameraYaw(camState, robotYaw, lookInput, dt, cfg = DRIVE_CONFIG, driveInput = 0) {
  const c = cfg.camera;

  if (Math.abs(lookInput) > 0.01) {
    camState.yaw -= lookInput * c.manualYawRate * dt;
    camState.yaw = shortestAngle(camState.yaw);
    camState.idleTime = 0;
    return camState.yaw;
  }

  // Auto-recentre is SUSPENDED while the player is driving.
  //
  // This is not a nicety. Recentring toward robot yaw while input is
  // interpreted relative to camera yaw rebuilds the same feedback loop the
  // whole rewrite exists to kill — just slowly enough to look like drift
  // rather than a spin. Testing a held diagonal for 10s: the heading walked
  // 118 degrees off target instead of converging.
  //
  // With the stick at rest, camera yaw is the only thing moving and no loop
  // can form, so recentring is safe exactly when the player is not driving.
  if (Math.abs(driveInput) > c.recenterInputThreshold) {
    camState.idleTime = 0;
    return camState.yaw;
  }

  camState.idleTime += dt;

  if (!c.autoRecenter || camState.idleTime < c.recenterDelay) {
    return camState.yaw;
  }

  const delta = shortestAngle(robotYaw - camState.yaw);
  if (Math.abs(delta) < c.recenterDeadzone) return camState.yaw;

  // Ease out of the deadzone so recentring starts gently rather than
  // snapping the moment the threshold is crossed.
  const excess = Math.abs(delta) - c.recenterDeadzone;
  const rate = c.recenterRate * Math.min(excess / 1.0, 1);
  camState.yaw += Math.sign(delta) * Math.min(Math.abs(delta), rate * dt);
  camState.yaw = shortestAngle(camState.yaw);

  return camState.yaw;
}
