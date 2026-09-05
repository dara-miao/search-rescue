export type Signature = 'STRONG' | 'WEAK' | 'FAINT'
export type Condition = 'STABLE' | 'DETERIORATING' | 'CRITICAL'
export type RescueType = 'SELF_EXTRACT' | 'ASSISTED' | 'GROUP' | 'UNREACHABLE'
export type VictimState = 'WAITING' | 'CARRIED' | 'RESCUED' | 'LOST' | 'MARKED'
export type HoldKind = 'idle' | 'scan' | 'rescue' | 'mark'
export type LostReason = 'clock' | 'vent' | null

export type FireCell = {
  id: string
  floor: number
  col: number
  row: number
  isCore: boolean
  facades: Array<'north' | 'south' | 'east' | 'west'>
  centre: { x: number; z: number }
  size: { x: number; z: number }
  roomName: string
  heat: number
  vented: boolean
  preVent: boolean
}

export type Extraction = {
  id: string
  cellId: string
  floor: number
  col: number
  row: number
  facade: 'north' | 'south' | 'east' | 'west'
  opening: string
  fast: boolean
  x: number
  z: number
}

export type Victim = {
  id: string
  cellId: string
  floor: number
  col: number
  row: number
  roomName: string
  x: number
  z: number
  signature: Signature
  condition: Condition
  type: RescueType
  count: number
  clock: number
  clock0: number
  rescueTime: number
  scanned: boolean
  state: VictimState
  seenAt: number | null
  action: 'none' | 'scanned' | 'rescued' | 'marked' | 'skipped' | 'never'
  scanLost: boolean
  lostReason: LostReason
}

export type Encounter = { id: string; at: number }

export type RunPhase = 'briefing' | 'playing' | 'debrief' | 'credits'

export type Evacuee = {
  id: string
  victimId: string
  startX: number
  startZ: number
  destX: number
  destZ: number
  path: Array<{ x: number; z: number; y?: number }>
  born: number
  duration: number
  lane: number
}

export type FireEvent = {
  t: number
  cellId: string
  roomName: string
  kind: 'vent' | 'pre'
}

export type HoldState = {
  kind: HoldKind
  targetId: string | null
  progress: number
  need: number
}

/** What the player just learned. Never includes clock. */
export type Reveal = {
  victimId: string
  kind: 'scan' | 'rescue' | 'mark'
  at: number
  roomName: string
  opening: string
  signature: Signature
  condition: Condition
  type: RescueType
  count: number
}

export type RunState = {
  phase: RunPhase
  t: number
  seed: number
  ignitionCellId: string
  ignitionRoom: string
  cells: FireCell[]
  extractions: Extraction[]
  victims: Victim[]
  encounters: Encounter[]
  vents: FireEvent[]
  battery: number
  thermal: boolean
  hold: HoldState
  carriedId: string | null
  fireAcc: number
  fireIntensity: number
  inHeat: boolean
  lastReveal: Reveal | null
  evacuees: Evacuee[]
}

export type RunInput = {
  x: number
  z: number
  speed: number
  moving: boolean
  thermal: boolean
  hold: boolean
  forceRescue: boolean
}
