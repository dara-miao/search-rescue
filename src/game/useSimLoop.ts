import { useEffect, useRef } from 'react'
import { heightAt } from './ground'
import { createInput, type InputApi } from './input'
import { stepBody, type Body } from './motion'
import { DEPLOY, useGame } from './store'
import { wishScale } from '../sim/robot'
import { SIM_DT } from '../sim/step'

export function useSimLoop(active: boolean) {
  const api = useRef<InputApi | null>(null)
  const body = useRef<Body>({
    x: DEPLOY.x,
    y: heightAt(DEPLOY.x, DEPLOY.z) + 0.52,
    z: DEPLOY.z,
    vx: 0,
    vy: 0,
    vz: 0,
  })
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
    input.resetLook(DEPLOY.yaw, 0.16)
    const spawn = useGame.getState().robot
    body.current = { x: spawn.x, y: spawn.y, z: spawn.z, vx: 0, vy: 0, vz: 0 }

    let last = performance.now()
    let raf = 0
    let stickYaw0: number | null = null
    let acc = 0

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
        const cap = wishScale(store.sim.robot.zone, store.sim.robot.noGoTime)
        const sprint = aimed.sprint && cap.sprint
        const sin = Math.sin(aimed.yaw)
        const cos = Math.cos(aimed.yaw)
        const wishX = (sin * forward + cos * aimed.strafe) * (sprint ? 11.2 : 6.6) * cap.scale
        const wishZ = (-cos * forward + sin * aimed.strafe) * (sprint ? 11.2 : 6.6) * cap.scale
        const next = stepBody(body.current, wishX, wishZ, sprint, dt)
        body.current = next
        const speed = Math.hypot(next.vx, next.vz)

        store.applyRobot({
          x: next.x,
          y: next.y,
          z: next.z,
          yaw: aimed.yaw,
          pitch: aimed.pitch,
          speed,
          moving: speed > 0.15,
        })

        if (input.pressed('KeyQ')) store.setWorldOrbit(store.worldOrbit + dt * 0.9)
        if (input.pressed('KeyE')) store.setWorldOrbit(store.worldOrbit - dt * 0.9)

        if (input.consumeEdge('KeyF') || input.consumeEdge('Space')) {
          store.tryMark()
        }
        if (input.consumeEdge('KeyT')) {
          store.toggleThermal()
        }

        acc += dt
        while (acc >= SIM_DT) {
          useGame.getState().tick(SIM_DT)
          acc -= SIM_DT
        }
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
