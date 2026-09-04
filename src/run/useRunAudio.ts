import { useEffect } from 'react'
import { useDrive } from '../drive/store'
import { tickRunAudio, unlockAudio } from './audio'
import { holdFrac } from './hold'
import { useRun } from './store'

export function useRunAudio() {
  useEffect(() => {
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let acc = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      acc += dt
      if (acc < 0.08) return
      acc = 0
      const run = useRun.getState()
      tickRunAudio({
        cells: run.cells,
        holdKind: run.hold.kind,
        holdFrac: holdFrac(run.hold),
        speed: useDrive.getState().speed,
        playing: run.phase === 'playing',
        lastReveal: run.lastReveal,
      })
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
}
