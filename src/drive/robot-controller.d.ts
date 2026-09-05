import type { Object3D, Scene, Vector3 } from 'three'
import type { SiteData } from '../data/site'

export const ROBOT_CONFIG: {
  radius: number
  maxSpeed: number
  maxReverseSpeed: number
  accel: number
  brakeAccel: number
  maxTurnRate: number
  turnRateAtMaxSpeed: number
  input: { deadzone: number; curve: number }
  camera: {
    distance: number
    height: number
    lookAhead: number
    positionLerp: number
    yawLerp: number
    pitch: number
  }
  headlight: {
    angle: number
    penumbra: number
    intensity: number
    distance: number
    decay: number
    mountHeight: number
    mountForward: number
    aimDistance: number
    aimDrop: number
  }
}

export function forwardVector(yaw: number, out?: Vector3): Vector3
export function rightVector(yaw: number, out?: Vector3): Vector3
export function readInput(
  raw: {
    stick?: { x: number; y: number }
    keys?: { forward?: boolean; back?: boolean; left?: boolean; right?: boolean }
  },
  cfg?: typeof ROBOT_CONFIG,
): { throttle: number; steer: number }

export function resolveCollision(
  pos: { x: number; z: number },
  radius: number,
  blockers: Array<Array<{ x: number; z: number }>>,
  iterations?: number,
): { x: number; z: number; hit: boolean }

export function buildBlockers(
  siteData: SiteData,
  massingConfig?: {
    pavilion: {
      width: number
      projection: number
      portalWidth?: number
      portalRecess?: number
    }
    endPavilion: { width: number; projection: number }
  },
): Array<Array<{ x: number; z: number }>>

export function attachHeadlight(
  scene: Scene,
  robotMesh: Object3D,
  cfg?: typeof ROBOT_CONFIG,
): { light: Object3D; target: Object3D }

export function createRobotController(
  scene: Scene,
  robotMesh: Object3D,
  siteData: SiteData,
  opts?: Record<string, unknown>,
): {
  state: { position: Vector3; yaw: number; speed: number; collided: boolean }
  update: (dt: number, raw: unknown, camera?: Object3D) => unknown
}
