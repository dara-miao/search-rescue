import { useEffect } from 'react'
import { attribution } from '../data/site'
import { useDrive } from '../drive/store'
import { unlockAudio } from '../run/audio'
import { useRun } from '../run/store'

export function Briefing() {
  const seed = useRun((s) => s.seed)
  const go = () => {
    unlockAudio()
    useDrive.getState().reset()
    useRun.getState().begin()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        go()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="briefing">
      <div className="briefing-card">
        <p className="stage0-kicker">Perimeter · seed {seed}</p>
        <h1>The interior is closed</h1>
        <p>Fire is already in the stacks. You work the glass from the lawn. Staging is the red ring behind you.</p>
        <button type="button" className="debrief-go" onClick={go}>
          Deploy
        </button>
        <p className="stage0-license">{attribution()}</p>
      </div>
    </div>
  )
}
