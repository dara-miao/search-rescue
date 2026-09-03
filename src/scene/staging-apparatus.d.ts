export const APPARATUS_CONFIG: {
  engineLength: number
  engineWidth: number
  utilityLength: number
  utilityWidth: number
  along: number
  back: number
}

export function stagingAxes(angleRad: number): {
  south: { x: number; z: number }
  east: { x: number; z: number }
}

export type ApparatusSlot = { x: number; z: number; yaw: number; kind: 'engine' | 'utility' }

export function apparatusLayout(
  staging: { x: number; z: number },
  angleRad: number,
): {
  westEngine: ApparatusSlot
  eastEngine: ApparatusSlot
  utility: ApparatusSlot
}

export function apparatusBlockers(
  staging: { x: number; z: number },
  angleRad: number,
): Array<Array<{ x: number; z: number }>>

export function buildStagingApparatus(
  staging: { x: number; z: number },
  angleRad: number,
): {
  group: import('three').Group
  layout: ReturnType<typeof apparatusLayout>
  lights: { red: { x: number; y: number; z: number }; blue: { x: number; y: number; z: number } }
}
