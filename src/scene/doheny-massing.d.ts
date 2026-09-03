import type { Group, MeshStandardMaterial } from 'three'
import type { SiteData } from '../data/site'

export const MASSING_CONFIG: {
  storeyHeight: number
  baseCourse: { height: number; projection: number }
  stringCourse: { height: number; projection: number }
  cornice: { height: number; projection: number }
  roof: {
    pitch: number
    eaveOverhang: number
    fasciaDepth: number
    maxHeight: number
    pavilionMaxHeight: number
  }
  pavilion: {
    width: number
    projection: number
    extraHeight: number
    bayClearance: number
    portalWidth: number
    portalHeight: number
    portalRecess: number
  }
  endPavilion: { width: number; projection: number }
  bay: { targetSpacing: number; pilasterWidth: number; pilasterProjection: number }
  window: {
    reveal: number
    surroundDepth: number
    surroundWidth: number
    groundFloor: { width: number; height: number; arched: boolean }
    mainFloor: { width: number; height: number; arched: boolean }
    upperFloor: { width: number; height: number; arched: boolean }
  }
}

export function createMaterials(): {
  brick: MeshStandardMaterial
  limestone: MeshStandardMaterial
  roofTile: MeshStandardMaterial
  recess: MeshStandardMaterial
  glass: MeshStandardMaterial
}

export function buildMassing(siteData: SiteData, cfg?: typeof MASSING_CONFIG): Group

export function updateWindowGlow(
  group: Group,
  lookupHeat: (meta: { floor: number; facade: string; bayIndex: number }) => number,
  lookupStatus?: (meta: { floor: number; facade: string; bayIndex: number }) =>
    | 'AVAILABLE'
    | 'ACTIVE'
    | 'DEAD'
    | null,
  t?: number,
): void
