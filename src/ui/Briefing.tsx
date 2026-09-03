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
        <p className="stage0-kicker">Doheny · perimeter · seed {seed}</p>
        <h1>The interior is closed</h1>
        <p>Fire is already in the stacks. You work the glass from the lawn. Follow one job at a time.</p>
        <ol className="briefing-steps">
          <li>
            <span>1</span>
            Drive to the brightest cyan ring.
          </li>
          <li>
            <span>2</span>
            Stop. Hold Space to scan.
          </li>
          <li>
            <span>3</span>
            Hold F to extract. Carry to the red ring.
          </li>
        </ol>
        <p className="stage0-note">W throttle · A / D steer · T thermal. You cannot go inside. You cannot die.</p>
        <button type="button" className="debrief-go" onClick={go}>
          Roll out
        </button>
        <p className="stage0-license">{attribution()}</p>
      </div>
    </div>
  )
}
