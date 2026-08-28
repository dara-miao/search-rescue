import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useGame } from '../game/store'
import { DOHENY } from '../game/world'
import { insideDoheny } from './TimesMirror'

const _target = new Vector3()
const _desired = new Vector3()

export function WorldRig({ cinematic = false }: { cinematic?: boolean }) {
  const orbit = useRef(0.55)

  useFrame((state, dt) => {
    const { robot, worldOrbit, phase } = useGame.getState()
    if (cinematic || phase === 'briefing') {
      orbit.current += dt * 0.08
      const r = 92
      state.camera.position.set(
        DOHENY.cx + Math.sin(orbit.current) * r,
        48,
        DOHENY.cz + Math.cos(orbit.current) * r,
      )
      state.camera.lookAt(DOHENY.cx, 10, DOHENY.cz)
      return
    }

    const inside = insideDoheny(robot.x, robot.z)
    const fx = Math.sin(robot.yaw)
    const fz = -Math.cos(robot.yaw)
    const ox = Math.sin(worldOrbit) * (inside ? 3 : 8)
    const oz = Math.cos(worldOrbit) * (inside ? 3 : 8)
    _desired.set(
      robot.x - fx * (inside ? 8 : 18) + ox,
      inside ? 7.5 : 16,
      robot.z - fz * (inside ? 8 : 18) + oz,
    )
    state.camera.position.lerp(_desired, 0.06)
    _target.set(robot.x, inside ? 3.2 : 2.2, robot.z)
    state.camera.lookAt(_target)
  })

  return null
}

export function MastRig() {
  useFrame((state) => {
    const { robot } = useGame.getState()
    const fx = Math.sin(robot.yaw)
    const fz = -Math.cos(robot.yaw)
    const pitch = robot.pitch
    const eyeY = robot.y + 1.08
    const eyeX = robot.x + fx * 0.48
    const eyeZ = robot.z + fz * 0.48
    state.camera.position.set(eyeX, eyeY, eyeZ)
    const lookDist = Math.cos(pitch) * 12
    state.camera.lookAt(eyeX + fx * lookDist, eyeY + Math.sin(pitch) * 12, eyeZ + fz * lookDist)
    if (state.camera.type === 'PerspectiveCamera') {
      const cam = state.camera
      if ('fov' in cam && cam.fov !== 64) {
        cam.fov = 64
        cam.updateProjectionMatrix()
      }
    }
  })

  return null
}
