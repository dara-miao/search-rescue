import { useEffect, useRef } from 'react'
import { createAuto, stepAuto } from './auto'
import { heightAt } from './ground'
import { createInput, type InputApi } from './input'
import { stepBody, type Body } from './motion'
import { stickWish } from './steer'
import { DEPLOY, useGame } from './store'
import { CAMPUS } from './world'
import { wishScale } from '../sim/robot'
import { SIM_DT } from '../sim/step'

const TURN_RATE = 1.55
const NOD_RATE = 1.15

export function useSimLoop(active: boolean) {
  const boot = useGame((s) => s.boot)
  const api = useRef<InputApi | null>(null)
  const body = useRef<Body>({
    x: DEPLOY.x,
    y: heightAt(DEPLOY.x, DEPLOY.z) + 0.52,
    z: DEPLOY.z,
    vx: 0,
    vy: 0,
    vz: 0,
  })
  const auto = useRef(createAuto(DEPLOY.x, DEPLOY.z))
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
    input.setLatch(true)
    input.setHold(false)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    window.focus()
    const spawn = useGame.getState().robot
    body.current = { x: spawn.x, y: spawn.y, z: spawn.z, vx: 0, vy: 0, vz: 0 }
    auto.current = createAuto(spawn.x, spawn.z)

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
        const stickMag = Math.hypot(pad.stickX, pad.stickY)
        const leaning = pad.stickActive && stickMag > 0.08
        if (leaning) {
          const wish = stickWish('drive', pad.stickX, pad.stickY)
          input.turn((Math.abs(wish.turn) > 0.02 ? wish.turn : pad.stickX) * dt * TURN_RATE)
          input.nod(wish.nod * dt * NOD_RATE)
          // Any lean walks. Back-stick reverses; sideways still creeps forward.
          if (pad.stickY < -0.2) forward = Math.min(wish.forward, -stickMag)
          else forward = Math.max(0.55, wish.forward, stickMag)
        }

        const walking = forward > 0.08
        const cmd = walking
          ? stepAuto(auto.current, { x: body.current.x, z: body.current.z, yaw: pad.yaw }, store.sim, dt)
          : null
        if (cmd && !left && !right && !leaning) input.setYaw(cmd.yaw)

        const aimed = input.consume()
        const cap = wishScale(store.sim.robot.zone, store.sim.robot.noGoTime)
        const sprint = aimed.sprint && cap.sprint
        let wishX = 0
        let wishZ = 0
        if (walking && cmd && !left && !right && !leaning) {
          wishX = cmd.wishX * cap.scale
          wishZ = cmd.wishZ * cap.scale
        } else if (walking) {
          const speed = (sprint ? 11.2 : 6.6) * cap.scale
          wishX = Math.sin(aimed.yaw) * speed
          wishZ = -Math.cos(aimed.yaw) * speed
        }
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

        if (input.consumeEdge('KeyF') || input.consumeEdge('Space') || cmd?.mark || store.nearestDist <= CAMPUS.markRange) {
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
  }, [active, boot])

  return api
}
