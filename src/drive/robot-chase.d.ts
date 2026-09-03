import type { Camera, Object3D, Scene, SpotLight, Vector3 } from 'three'

export const CHASE_CONFIG: {
  radius: number
  maxSpeed: number
  maxReverseSpeed: number
  accel: number
  brakeAccel: number
  steering: {
    minTurnRadius: number
    pivotRate: number
    maxTurnRate: number
    invertInReverse: boolean
  }
  input: {
    deadzone: number
    throttleCurve: number
    steerCurve: number
  }
  camera: {
    distance: number
    height: number
    lookAhead: number
    lookHeight: number
    positionLerp: number
    yawLag: number
    maxVisualOffset: number
    roll: { enabled: boolean; maxRoll: number; lerp: number }
    fov: { base: number; atMaxSpeed: number; lerp: number }
  }
}

export function forwardVector(yaw: number, out?: Vector3): Vector3
export function shortestAngle(a: number): number
export function readStick(
  x: number,
  y: number,
  cfg?: typeof CHASE_CONFIG,
): { throttle: number; steer: number }
export function turnRateAtSpeed(speed: number, cfg?: typeof CHASE_CONFIG): number

export interface ChaseDriveState {
  position: { x: number; z: number }
  yaw: number
  speed: number
}

export function stepDrive(
  state: ChaseDriveState,
  stick: { x: number; y: number },
  dt: number,
  cfg?: typeof CHASE_CONFIG,
): { nextX: number; nextZ: number; yawRate: number; throttle: number; steer: number }

export interface ChaseCamState {
  yaw: number
  roll: number
  fov: number
  initialised: boolean
}

export function createChaseCamera(cfg?: typeof CHASE_CONFIG): ChaseCamState

export function stepChaseCamera(
  cam: ChaseCamState,
  robot: { position: { x: number; z: number }; yaw: number; speed: number; yawRate?: number },
  camera: Camera & { fov: number; updateProjectionMatrix: () => void },
  dt: number,
  cfg?: typeof CHASE_CONFIG,
): ChaseCamState

export function attachHeadlight(
  scene: Scene,
  robotMesh: Object3D,
  opts?: {
    angle?: number
    penumbra?: number
    intensity?: number
    distance?: number
    decay?: number
    mountHeight?: number
    mountForward?: number
    aimDistance?: number
    aimDrop?: number
  },
): {
  light: SpotLight
  target: Object3D
  update: (position: { x: number; z: number }, yaw: number) => void
}
