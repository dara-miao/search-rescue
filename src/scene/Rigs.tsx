import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
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

/** Close south 3/4 aimed at the chassis, looking a few meters toward Doheny. */
export function MastRig() {
  useFrame((state) => {
    const { robot } = useGame.getState()
    state.camera.position.set(robot.x - 2, robot.y + 3.4, robot.z + 7)
    state.camera.lookAt(robot.x + 8, robot.y + 1.2, robot.z - 2)
    if (state.camera.type === 'PerspectiveCamera' && 'fov' in state.camera && state.camera.fov !== 55) {
      state.camera.fov = 55
      state.camera.updateProjectionMatrix()
    }
    state.camera.updateMatrixWorld()
  })

  return null
}
