import type { Vector3 } from 'three'

export const DRIVE_CONFIG: {
  radius: number
  maxSpeed: number
  accel: number
  brakeAccel: number
  maxTurnRate: number
  turnRateAtMaxSpeed: number
  alignment: {
    driveThreshold: number
    exponent: number
  }
  input: {
    deadzone: number
    curve: number
  }
  camera: {
    distance: number
    height: number
    lookAhead: number
    positionLerp: number
    autoRecenter: boolean
    recenterDelay: number
    recenterRate: number
    recenterDeadzone: number
    manualYawRate: number
    recenterInputThreshold: number
  }
}

export function forwardVector(yaw: number, out?: Vector3): Vector3
export function rightVector(yaw: number, out?: Vector3): Vector3
export function yawFromDirection(dx: number, dz: number): number
export function shortestAngle(a: number): number

export function processStick(
  x: number,
  y: number,
  cfg?: typeof DRIVE_CONFIG,
): { x: number; y: number; magnitude: number }

export function createTouchStick(
  element: HTMLElement,
  opts?: { radius?: number },
): { x: number; y: number; active: boolean; pointerId: number | null }

export interface DriveKinematics {
  yaw: number
  speed: number
}

export interface CameraYawState {
  yaw: number
  idleTime: number
}

/**
 * Stick is screen-space: +x right, +y down. Only yaw and speed are written.
 * Camera yaw is an argument so heading cannot feed back into the stick frame.
 */
export function stepDrive(
  state: DriveKinematics,
  stick: { x: number; y: number },
  cameraYaw: number,
  dt: number,
  cfg?: typeof DRIVE_CONFIG,
): { desiredYaw: number; alignment: number; targetSpeed: number; inputMagnitude: number }

/** lookInput is a scalar axis: +look turns the camera right. driveInput is stick magnitude. */
export function stepCameraYaw(
  camState: CameraYawState,
  robotYaw: number,
  lookInput: number,
  dt: number,
  cfg?: typeof DRIVE_CONFIG,
  driveInput?: number,
): number
