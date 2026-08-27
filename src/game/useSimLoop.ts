import { useEffect, useRef } from 'react'
import { createInput, type InputApi } from './input'
import { useGame } from './store'
import { CAMPUS, resolveCollision } from './world'

export function useSimLoop(active: boolean) {
  const api = useRef<InputApi | null>(null)
  if (!api.current || typeof api.current.setYaw !== 'function') {
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
    let stickYaw0: number | null = null

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const store = useGame.getState()

      if (store.phase === 'playing') {
        const left = input.pressed('KeyA') || input.pressed('ArrowLeft')
        const right = input.pressed('KeyD') || input.pressed('ArrowRight')
        if (left || right) input.turn(((right ? 1 : 0) - (left ? 1 : 0)) * dt * 2.35)

        const pad = input.consume()
        const mag = Math.hypot(pad.stickX, pad.stickY)
        let forward = pad.forward

        if (pad.stickActive && mag > 0.12) {
          if (stickYaw0 === null) stickYaw0 = pad.yaw
          input.setYaw(stickYaw0 + Math.atan2(pad.stickX, pad.stickY))
          forward = mag
        } else if (!pad.stickActive) {
          stickYaw0 = null
        }

        if (pad.lookActive) {
          input.addLook(pad.lookX * 920 * dt, -pad.lookY * 680 * dt)
        }

        const aimed = input.consume()
        const walk = aimed.sprint ? 11.2 : 6.6
        const sin = Math.sin(aimed.yaw)
        const cos = Math.cos(aimed.yaw)
        const vx = (sin * forward + cos * aimed.strafe) * walk
        const vz = (-cos * forward + sin * aimed.strafe) * walk
        const next = resolveCollision(store.robot.x + vx * dt, store.robot.z + vz * dt)
        const moving = Math.hypot(vx, vz) > 0.15

        store.applyRobot({
          x: next.x,
          z: next.z,
          yaw: aimed.yaw,
          pitch: aimed.pitch,
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
