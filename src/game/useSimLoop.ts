import { useEffect, useRef } from 'react'
import { createAuto, stepAuto } from './auto'
import { stepBody, type Body } from './motion'
import { scenarioById } from './scenarios'
import { useGame } from './store'
import { SIM_DT } from '../sim/step'

const TRAIL_GAP = 0.55
const TRAIL_MAX = 90

export function useSimLoop(active: boolean) {
  const auto = useRef(createAuto(0, 0))
  const body = useRef<Body>({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
  })

  useEffect(() => {
    if (!active) return

    const spawn = useGame.getState().robot
    const run = scenarioById(useGame.getState().scenarioId).run
    auto.current = createAuto(spawn.x, spawn.z, run)
    body.current = { x: spawn.x, y: spawn.y, z: spawn.z, vx: 0, vy: 0, vz: 0 }

    let last = performance.now()
    let raf = 0
    let acc = 0
    let trailWait = 0
    const crumbs: Array<[number, number]> = [[spawn.x, spawn.z]]

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const store = useGame.getState()

      if (store.phase === 'playing') {
        const cmd = stepAuto(auto.current, store.robot, store.sim, dt)
        const next = stepBody(body.current, cmd.wishX, cmd.wishZ, false, dt)
        body.current = next
        const speed = Math.hypot(next.vx, next.vz)

        if (store.thermal !== cmd.thermal) store.toggleThermal()
        if (cmd.mark) store.tryMark()

        store.applyRobot({
          x: next.x,
          y: next.y,
          z: next.z,
          yaw: cmd.yaw,
          pitch: cmd.pitch,
          speed,
          moving: speed > 0.15,
        })

        trailWait += dt
        let trailDirty = false
        if (trailWait >= TRAIL_GAP) {
          trailWait = 0
          const prev = crumbs[crumbs.length - 1]
          if (!prev || Math.hypot(next.x - prev[0], next.z - prev[1]) > 0.8) {
            crumbs.push([next.x, next.z])
            if (crumbs.length > TRAIL_MAX) crumbs.shift()
            trailDirty = true
          }
        }

        const sameLine = store.narration === cmd.line
        const aim = store.autoTarget
        const sameAim = Boolean(aim && Math.abs(aim.x - cmd.targetX) < 0.15 && Math.abs(aim.z - cmd.targetZ) < 0.15)
        if (!sameLine || !sameAim || trailDirty) {
          store.setWatch({
            narration: cmd.line,
            autoTarget: { x: cmd.targetX, z: cmd.targetZ },
            ...(trailDirty ? { trail: crumbs.slice() } : {}),
          })
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
    return () => cancelAnimationFrame(raf)
  }, [active])
}
