import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { useGame } from '../game/store'
import { DOHENY } from '../game/world'

const _target = new Vector3()
const _desired = new Vector3()

export function WorldRig({ cinematic = false }: { cinematic?: boolean }) {
  const orbit = useRef(0.55)

  useFrame((state, dt) => {
    const { robot, worldOrbit, phase } = useGame.getState()
    const hero = cinematic || phase === 'briefing'
    if (state.camera.type === 'PerspectiveCamera' && 'fov' in state.camera && state.camera.fov !== 46) {
      state.camera.fov = 46
      state.camera.updateProjectionMatrix()
    }

    if (hero) {
      orbit.current += dt * 0.05
      const r = 72
      state.camera.position.set(
        DOHENY.cx + Math.sin(orbit.current) * r,
        96,
        DOHENY.cz + Math.cos(orbit.current) * r,
      )
      state.camera.lookAt(DOHENY.cx, 2, DOHENY.cz)
      return
    }

    const ox = Math.sin(worldOrbit) * 24
    const oz = Math.cos(worldOrbit) * 24
    _desired.set(robot.x + ox, 86, robot.z + oz)
    state.camera.position.lerp(_desired, 0.08)
    _target.set(robot.x, 1.4, robot.z)
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
    const eyeX = robot.x + fx * 0.04
    const eyeZ = robot.z + fz * 0.04
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
