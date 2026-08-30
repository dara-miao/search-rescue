export type HeatZone = 'safe' | 'warm' | 'hot' | 'nogo'

export type VictimStatus = 'unseen' | 'detected' | 'marked' | 'lost'

export type FailCode = 'TIME' | 'LOST' | 'HULL' | 'PACK' | 'FRONT'

export type LastKnown = {
  x: number
  z: number
  t: number
  zone: HeatZone
}

export type VictimSim = {
  id: string
  name: string
  role: string
  note: string
  x: number
  z: number
  status: VictimStatus
  exposure: number
  mobility: number
  lastKnown: LastKnown | null
  visibleOptical: boolean
  visibleThermal: boolean
  detectUntil: number
}

export type SimRobot = {
  hull: number
  noGoTime: number
  zone: HeatZone
  onEvac: boolean
}

export type HotCell = {
  x: number
  z: number
  heat: number
  smoke: number
}

export type Field = {
  originX: number
  originZ: number
  step: number
  width: number
  height: number
  heat: Float32Array
  smoke: Float32Array
  fuel: Float32Array
  nextHeat: Float32Array
  nextSmoke: Float32Array
  conduct: Float32Array
  blocked: Uint8Array
  hot: HotCell[]
}

export type SimState = {
  elapsed: number
  field: Field
  victims: VictimSim[]
  robot: SimRobot
  fail: FailCode | null
  failNote: string
  complete: boolean
}

export type Pose = {
  x: number
  z: number
  yaw: number
}
