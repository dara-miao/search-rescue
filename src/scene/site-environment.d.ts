import type { Group, Light, Mesh, Scene, Vector3 } from 'three'
import type { SiteData } from '../data/site'

export const NIGHT: Record<string, number>
export const LIGHT_RIG: {
  moonIntensity: number
  moonColor: number
  moonAzimuth: number
  moonElevation: number
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  ambient: number
  fogDensity: number
}

export function setMergeFunction(fn: (geos: unknown[], useGroups?: boolean) => unknown): void

export type EnvironmentHandle = {
  root: Group
  sky: Mesh
  ground: Mesh
  trees: Group
  distant: Group
  moon: Light
  staging: { x: number; z: number }
  treeCount: number
  update: (
    dt: number,
    state?: {
      fireIntensity?: number
      robotPosition?: { x: number; z: number }
      cameraPosition?: Vector3
    },
  ) => void
}

export function buildEnvironment(
  scene: Scene,
  siteData: SiteData,
  opts?: {
    lightRig?: Partial<typeof LIGHT_RIG>
    staging?: { x: number; z: number }
    paths?: Array<{ width: number; points: Array<[number, number]> }>
    treeExclusions?: Array<{ x: number; z: number; radius: number }>
  },
): EnvironmentHandle
