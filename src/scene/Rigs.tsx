import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { insideSolid, keepOut } from '../game/collide'
import { useGame } from '../game/store'
import { DOHENY } from '../game/world'

const _target = new Vector3()
const _desired = new Vector3()
const _look = new Vector3()

const BRIEFING_SHOTS = [
  { r: 112, y: 88, lookY: 12, speed: 0.045 },
  { r: 128, y: 56, lookY: 14, speed: 0.038 },
  { r: 152, y: 78, lookY: 10, speed: 0.032 },
] as const

export function WorldRig({ cinematic = false }: { cinematic?: boolean }) {
  const orbit = useRef(0.55)
  const lookY = useRef(2)

  useFrame((state, dt) => {
    const { robot, worldOrbit, phase, briefingStep } = useGame.getState()
    const hero = cinematic || phase === 'briefing'
    if (state.camera.type === 'PerspectiveCamera' && 'fov' in state.camera && state.camera.fov !== 46) {
      state.camera.fov = 46
      state.camera.updateProjectionMatrix()
    }

    if (hero) {
      const shot = BRIEFING_SHOTS[Math.min(briefingStep, BRIEFING_SHOTS.length - 1)]
      orbit.current += dt * shot.speed
      lookY.current += (shot.lookY - lookY.current) * 0.06
      _desired.set(
        DOHENY.cx + Math.sin(orbit.current) * shot.r,
        shot.y,
        DOHENY.cz + Math.cos(orbit.current) * shot.r,
      )
      state.camera.position.lerp(_desired, 0.055)
      _look.set(DOHENY.cx, lookY.current, DOHENY.cz)
      state.camera.lookAt(_look)
      return
    }

    const ox = Math.sin(worldOrbit) * 42
    const oz = Math.cos(worldOrbit) * 42
    _desired.set(robot.x + ox, 96, robot.z + oz)
    state.camera.position.lerp(_desired, 0.08)
    _target.set(robot.x, 2, robot.z)
    state.camera.lookAt(_target)
  })

  return null
}

const CHASE: Array<[number, number]> = [
  [-7, 13],
  [-12, 8],
  [8, 12],
  [-14, 2],
  [2, 14],
  [12, 6],
]

function chaseXZ(x: number, z: number) {
  const preferred = keepOut(x - 7, z + 13, 2.6)
  const pd = Math.hypot(preferred.x - x, preferred.z - z)
  if (!insideSolid(preferred.x, preferred.z) && pd > 8) {
    return { x: preferred.x, z: preferred.z, d: pd }
  }
  let best = { x: preferred.x, z: preferred.z, d: pd }
  for (const [ox, oz] of CHASE) {
    const rawX = x + ox
    const rawZ = z + oz
    if (insideSolid(rawX, rawZ)) continue
    const c = keepOut(rawX, rawZ, 2.6)
    const d = Math.hypot(c.x - x, c.z - z)
    if (d > best.d) best = { x: c.x, z: c.z, d }
  }
  return best
}

/** High SW 3/4 toward Doheny. Holds one offset and lerps so the lens does not snap. */
export function MastRig() {
  const held = useRef({ ox: -7, oz: 13 })
  const booted = useRef(false)

  useFrame((state, dt) => {
    const { robot } = useGame.getState()
    let wx = robot.x + held.current.ox
    let wz = robot.z + held.current.oz
    let cleared = keepOut(wx, wz, 2.6)
    let dist = Math.hypot(cleared.x - robot.x, cleared.z - robot.z)
    if (insideSolid(cleared.x, cleared.z) || dist < 8) {
      const next = chaseXZ(robot.x, robot.z)
      held.current = { ox: next.x - robot.x, oz: next.z - robot.z }
      cleared = { x: next.x, z: next.z }
      dist = next.d
    }

    const tight = dist < 9
    _desired.set(cleared.x, robot.y + (tight ? 12 : 8.4), cleared.z)
    if (tight) _look.set(robot.x, robot.y + 0.4, robot.z)
    else _look.set(robot.x + 6, robot.y + 0.5, robot.z - 3)

    const k = 1 - Math.exp(-5.4 * dt)
    if (!booted.current) {
      _target.copy(_desired)
      state.camera.position.copy(_desired)
      booted.current = true
    } else {
      state.camera.position.lerp(_desired, k)
    }
    _target.lerp(_look, booted.current ? k : 1)
    state.camera.lookAt(_target)
    if (state.camera.type === 'PerspectiveCamera' && 'fov' in state.camera && state.camera.fov !== 46) {
      state.camera.fov = 46
      state.camera.updateProjectionMatrix()
    }
    state.camera.updateMatrixWorld()
  })

  return null
}
