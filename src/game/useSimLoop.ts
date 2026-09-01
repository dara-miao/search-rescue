import { useEffect, useRef } from 'react'
import { heightAt } from './ground'
import { createInput, type InputApi } from './input'
import { stepBody, type Body } from './motion'
import { stickWish } from './steer'
import { DEPLOY, useGame } from './store'
import { wishScale } from '../sim/robot'
import { SIM_DT } from '../sim/step'

const TURN_RATE = 1.55
const NOD_RATE = 1.15

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
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.focus()
    const spawn = useGame.getState().robot
    body.current = { x: spawn.x, y: spawn.y, z: spawn.z, vx: 0, vy: 0, vz: 0 }

    let last = performance.now()
    let raf = 0
    let acc = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const store = useGame.getState()

      if (store.phase === 'playing') {
        const left = input.pressed('KeyA') || input.pressed('ArrowLeft')
        const right = input.pressed('KeyD') || input.pressed('ArrowRight')
        if (left || right) input.turn(((right ? 1 : 0) - (left ? 1 : 0)) * dt * TURN_RATE)

        const pad = input.consume()
        let forward = pad.forward
        const leaning = pad.stickActive && Math.hypot(pad.stickX, pad.stickY) > 0.12
        if (leaning) {
          const wish = stickWish('drive', pad.stickX, pad.stickY)
          input.turn(wish.turn * dt * TURN_RATE)
          input.nod(wish.nod * dt * NOD_RATE)
          if (Math.abs(wish.forward) > 0.04) forward = wish.forward
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
