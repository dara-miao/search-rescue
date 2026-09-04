import { useEffect } from 'react'
import { useDrive } from '../drive/store'
import { batterySpeedScale } from './battery'
import { speedScaleAt } from './layout'
import { useRun } from './store'

function screenStickFromKeys(keys: Set<string>) {
  const x =
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
  const y =
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
    (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
  return { x, y }
}

export function useRunLoop() {
  useEffect(() => {
    const keys = new Set<string>()
    const driveKeys = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Space',
    ])

    const onDown = (e: KeyboardEvent) => {
      if (driveKeys.has(e.code) || e.code === 'KeyT' || e.code === 'KeyF') e.preventDefault()
      keys.add(e.code)
    }
    const onUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
    }
    const onBlur = () => keys.clear()

    window.addEventListener('keydown', onDown, { capture: true })
    window.addEventListener('keyup', onUp, { capture: true })
    window.addEventListener('blur', onBlur)

    let last = performance.now()
    let raf = 0
    let tLatch = false
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      try {
        const run = useRun.getState()
        const drive = useDrive.getState()
        if (keys.has('KeyT')) {
          if (!tLatch && run.phase === 'playing') {
            tLatch = true
            run.toggleThermal()
          }
        } else {
          tLatch = false
        }
        const thermal = useRun.getState().hudThermal
        const hold = keys.has('Space') || keys.has('KeyF') || run.hudHold || run.hudRescue
        const forceRescue = keys.has('KeyF') || run.hudRescue

        if (run.phase === 'playing') {
          const acting = run.hold.kind !== 'idle'
          const stick = acting
            ? { x: 0, y: 0 }
            : drive.stickOn
              ? { x: drive.stickX, y: -drive.stickY }
              : screenStickFromKeys(keys)
          const scale = speedScaleAt(drive.x, drive.z, run.cells) * batterySpeedScale(run.battery)
          drive.step(stick, dt, scale)
          const body = useDrive.getState()
          run.tick(
            {
              x: body.x,
              z: body.z,
              speed: body.speed,
              moving: body.moving,
              thermal,
              hold,
              forceRescue,
            },
            dt,
          )
        }
      } catch (err) {
        console.error(err)
      }
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onDown, { capture: true })
      window.removeEventListener('keyup', onUp, { capture: true })
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
