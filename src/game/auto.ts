import { CAMPUS } from './world'
import type { SimState } from '../sim/types'

export type AutoGoto = {
  kind: 'goto'
  x: number
  z: number
  line: string
}

export type AutoMark = {
  kind: 'mark'
  id: string
  line: string
}

export type AutoBeat = AutoGoto | AutoMark

/** Outdoor sweep the mast already walks: door, steps, Tommy, Bovard. */
export const RUN: AutoBeat[] = [
  { kind: 'goto', x: 104, z: 50, line: 'West door. Someone is still on the apron.' },
  { kind: 'mark', id: 'v1', line: 'Contact at the west door.' },
  { kind: 'goto', x: 106, z: 43, line: 'West steps next.' },
  { kind: 'mark', id: 'v2', line: 'Second contact on the steps.' },
  { kind: 'goto', x: 72, z: 42, line: 'Leaving the fire. Sweeping west.' },
  { kind: 'goto', x: 40, z: 28, line: 'Quad toward Tommy Trojan.' },
  { kind: 'goto', x: 12, z: 14, line: 'Behind Tommy.' },
  { kind: 'mark', id: 'v3', line: 'Third contact behind Tommy.' },
  { kind: 'goto', x: -22, z: -2, line: 'West toward Bovard.' },
  { kind: 'goto', x: -38, z: -12, line: 'Lawn west of Bovard.' },
  { kind: 'mark', id: 'v4', line: 'Fourth contact. Lawn is clear.' },
]

const ARRIVE = 2.6
const STANDOFF = 5.2
const WALK = 5.4
const CREEP = 3.1
const TURN = 2.2
const SCAN = 0.28
const STUCK_MOVE = 0.18

export type AutoState = {
  i: number
  dwell: number
  stuck: number
  lastX: number
  lastZ: number
  watch: number
  slide: number
  slideA: number
  line: string
  targetX: number
  targetZ: number
  thermal: boolean
  done: boolean
  run: AutoBeat[]
}

export type AutoCommand = {
  wishX: number
  wishZ: number
  yaw: number
  pitch: number
  mark: boolean
  thermal: boolean
  line: string
  targetX: number
  targetZ: number
}

export function createAuto(x: number, z: number, run: AutoBeat[] = RUN): AutoState {
  const first = run[0]
  const tx = first && first.kind === 'goto' ? first.x : x
  const tz = first && first.kind === 'goto' ? first.z : z
  return {
    i: 0,
    dwell: 0,
    stuck: 0,
    lastX: x,
    lastZ: z,
    watch: 0,
    slide: 0,
    slideA: 0,
    line: first?.line ?? '',
    targetX: tx,
    targetZ: tz,
    thermal: false,
    done: false,
    run,
  }
}

export function wrapAngle(a: number) {
  let d = a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export function headingTo(fromX: number, fromZ: number, toX: number, toZ: number) {
  return Math.atan2(toX - fromX, -(toZ - fromZ))
}

function standoff(fromX: number, fromZ: number, toX: number, toZ: number, range = STANDOFF) {
  const dx = fromX - toX
  const dz = fromZ - toZ
  const d = Math.hypot(dx, dz)
  if (d < 0.2) return { x: toX - range, z: toZ }
  const u = range / d
  return { x: toX + dx * u, z: toZ + dz * u }
}

function victimOf(sim: SimState, id: string) {
  return sim.victims.find((v) => v.id === id) ?? null
}

function skipFinished(auto: AutoState, sim: SimState) {
  while (auto.i < auto.run.length) {
    const beat = auto.run[auto.i]
    if (beat.kind === 'mark') {
      const v = victimOf(sim, beat.id)
      if (!v || v.status === 'marked' || v.status === 'lost') {
        auto.i += 1
        auto.dwell = 0
        auto.stuck = 0
        auto.thermal = false
        continue
      }
    }
    break
  }
  if (auto.i >= auto.run.length) {
    auto.done = true
    auto.line = 'Sweep complete.'
    auto.thermal = false
  }
}

function aimYaw(yaw: number, want: number, dt: number) {
  const delta = wrapAngle(want - yaw)
  const step = Math.max(-TURN * dt, Math.min(TURN * dt, delta))
  return yaw + step
}

export function routeAhead(auto: AutoState, sim: SimState, x: number, z: number): Array<[number, number]> {
  const pts: Array<[number, number]> = [[x, z]]
  for (let i = auto.i; i < auto.run.length; i++) {
    const beat = auto.run[i]
    if (beat.kind === 'goto') pts.push([beat.x, beat.z])
    else {
      const v = victimOf(sim, beat.id)
      if (v && v.status !== 'marked' && v.status !== 'lost') pts.push([v.x, v.z])
    }
  }
  return pts
}

export function stepAuto(
  auto: AutoState,
  pose: { x: number; z: number; yaw: number },
  sim: SimState,
  dt: number,
): AutoCommand {
  skipFinished(auto, sim)
  if (auto.done) {
    return {
      wishX: 0,
      wishZ: 0,
      yaw: pose.yaw,
      pitch: 0.12,
      mark: false,
      thermal: false,
      line: auto.line,
      targetX: pose.x,
      targetZ: pose.z,
    }
  }

  const beat = auto.run[auto.i]
  let goalX = pose.x
  let goalZ = pose.z
  let lookX = pose.x
  let lookZ = pose.z
  let arrive = ARRIVE
  let markReady = false

  if (beat.kind === 'goto') {
    goalX = beat.x
    goalZ = beat.z
    lookX = beat.x
    lookZ = beat.z
    auto.thermal = false
  } else {
    const v = victimOf(sim, beat.id)
    if (!v) {
      auto.i += 1
      return stepAuto(auto, pose, sim, dt)
    }
    const hold = standoff(pose.x, pose.z, v.x, v.z)
    goalX = hold.x
    goalZ = hold.z
    lookX = v.x
    lookZ = v.z
    arrive = 0.85
    const dist = Math.hypot(pose.x - v.x, pose.z - v.z)
    markReady = dist <= CAMPUS.markRange - 0.35
  }

  if (sim.robot.zone === 'nogo' && !(beat.kind === 'mark' && markReady)) {
    goalX = pose.x - 14
    goalZ = pose.z
    lookX = goalX
    lookZ = goalZ
    arrive = 0.8
    auto.line = 'Heat. Backing off the apron.'
  }

  auto.targetX = lookX
  auto.targetZ = lookZ
  if (sim.robot.zone !== 'nogo' || (beat.kind === 'mark' && markReady)) auto.line = beat.line

  const dx = goalX - pose.x
  const dz = goalZ - pose.z
  const dist = Math.hypot(dx, dz)
  const want = headingTo(pose.x, pose.z, lookX, lookZ)
  const yaw = aimYaw(pose.yaw, want, dt)
  const facing = Math.abs(wrapAngle(want - yaw)) < 0.28

  auto.watch += dt
  if (auto.watch >= 0.45) {
    const moved = Math.hypot(pose.x - auto.lastX, pose.z - auto.lastZ)
    if (dist > arrive + 0.4 && moved < STUCK_MOVE) {
      auto.stuck += 1
      auto.slide = 0.55
      auto.slideA = headingTo(pose.x, pose.z, goalX, goalZ) + (auto.stuck % 2 === 0 ? 1.15 : -1.15)
    } else {
      auto.stuck = Math.max(0, auto.stuck - 1)
    }
    auto.lastX = pose.x
    auto.lastZ = pose.z
    auto.watch = 0
  }

  if (auto.stuck >= 6 && beat.kind === 'goto' && dist < 14) {
    auto.i += 1
    auto.stuck = 0
    auto.dwell = 0
    auto.slide = 0
    return stepAuto(auto, pose, sim, dt)
  }

  if (dist <= arrive) {
    if (beat.kind === 'goto') {
      auto.i += 1
      auto.dwell = 0
      auto.stuck = 0
      return stepAuto(auto, pose, sim, dt)
    }
    auto.thermal = true
    auto.dwell += dt
    const canMark = markReady && (facing || auto.dwell > SCAN * 0.6)
    if (auto.dwell >= SCAN && canMark) {
      auto.i += 1
      auto.dwell = 0
      auto.stuck = 0
      auto.thermal = false
      auto.line = beat.line
      return {
        wishX: 0,
        wishZ: 0,
        yaw,
        pitch: 0.14,
        mark: true,
        thermal: false,
        line: beat.line,
        targetX: lookX,
        targetZ: lookZ,
      }
    }
    return {
      wishX: 0,
      wishZ: 0,
      yaw,
      pitch: 0.14,
      mark: false,
      thermal: true,
      line: beat.line,
      targetX: lookX,
      targetZ: lookZ,
    }
  }

  auto.dwell = 0
  const cap = markReady || dist < 10 ? CREEP : WALK
  let hx = dx / (dist || 1)
  let hz = dz / (dist || 1)
  if (auto.slide > 0) {
    auto.slide -= dt
    hx = Math.sin(auto.slideA)
    hz = -Math.cos(auto.slideA)
  }

  return {
    wishX: hx * cap,
    wishZ: hz * cap,
    yaw,
    pitch: 0.12,
    mark: false,
    thermal: auto.thermal,
    line: auto.line,
    targetX: lookX,
    targetZ: lookZ,
  }
}
