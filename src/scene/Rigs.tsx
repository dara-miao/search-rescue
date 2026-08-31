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
  { r: 72, y: 96, lookY: 2, speed: 0.05 },
  { r: 88, y: 48, lookY: 5, speed: 0.04 },
  { r: 118, y: 82, lookY: 2, speed: 0.035 },
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
  let best = { x: x - 7, z: z + 13, d: 0 }
  for (const [ox, oz] of CHASE) {
    const rawX = x + ox
    const rawZ = z + oz
    if (insideSolid(rawX, rawZ)) continue
    const c = keepOut(rawX, rawZ, 2.6)
    const d = Math.hypot(c.x - x, c.z - z)
    if (d > best.d) best = { x: c.x, z: c.z, d }
  }
  if (insideSolid(best.x, best.z) || best.d < 6) {
    const fallback = keepOut(x - 7, z + 13, 3.2)
    return { x: fallback.x, z: fallback.z, d: Math.hypot(fallback.x - x, fallback.z - z) }
  }
  return best
}

/** High 3/4 that stays outside OSM hulls so the lens never sits in a wall. */
export function MastRig() {
  useFrame((state) => {
    const { robot } = useGame.getState()
    const cam = chaseXZ(robot.x, robot.z)
    const lift = cam.d < 9 ? 12 : 8.4
    state.camera.position.set(cam.x, robot.y + lift, cam.z)
    state.camera.lookAt(robot.x, robot.y + 0.4, robot.z)
    if (state.camera.type === 'PerspectiveCamera' && 'fov' in state.camera && state.camera.fov !== 46) {
      state.camera.fov = 46
      state.camera.updateProjectionMatrix()
    }
    state.camera.updateMatrixWorld()
  })

  return null
}
