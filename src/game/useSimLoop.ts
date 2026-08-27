import { useEffect, useRef } from 'react'
import { createInput, type InputApi } from './input'
import { useGame } from './store'
import { CAMPUS, resolveCollision } from './world'

export function useSimLoop(active: boolean) {
  const api = useRef<InputApi | null>(null)
  if (!api.current || typeof api.current.setLookStick !== 'function') {
    api.current = createInput()
  }

  useEffect(() => {
    const input = api.current
    if (!input) return

    if (!active) {
      input.detach()
      return
    }

    input.attach()
    input.resetLook(CAMPUS.spawn.yaw, -0.08)

    let last = performance.now()
    let raf = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const store = useGame.getState()

      if (store.phase === 'playing') {
        const left = input.pressed('KeyA') || input.pressed('ArrowLeft')
        const right = input.pressed('KeyD') || input.pressed('ArrowRight')
        if (left || right) input.turn(((right ? 1 : 0) - (left ? 1 : 0)) * dt * 2.35)

        const axes = input.consume()
        if (axes.stickActive && Math.abs(axes.stickX) > 0.08) {
          input.turn(-axes.stickX * dt * 3.2)
        }
        if (axes.lookActive) {
          input.addLook(axes.lookX * 920 * dt, -axes.lookY * 680 * dt)
        }

        const pad = input.consume()
        const walk = pad.sprint ? 11.2 : 6.6
        const sin = Math.sin(pad.yaw)
        const cos = Math.cos(pad.yaw)
        const vx = (sin * pad.forward + cos * pad.strafe) * walk
        const vz = (-cos * pad.forward + sin * pad.strafe) * walk
        const next = resolveCollision(store.robot.x + vx * dt, store.robot.z + vz * dt)
        const moving = Math.hypot(vx, vz) > 0.15

        store.applyRobot({
          x: next.x,
          z: next.z,
          yaw: pad.yaw,
          pitch: pad.pitch,
          speed: Math.hypot(vx, vz),
          moving,
        })

        if (input.pressed('KeyQ')) store.setWorldOrbit(store.worldOrbit + dt * 0.9)
        if (input.pressed('KeyE')) store.setWorldOrbit(store.worldOrbit - dt * 0.9)

        if (input.consumeEdge('KeyF') || input.consumeEdge('Space')) {
          store.tryMark()
        }
        if (input.consumeEdge('KeyT')) {
          store.toggleThermal()
        }

        store.tick(dt)
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      input.detach()
    }
  }, [active])

  return api
}
