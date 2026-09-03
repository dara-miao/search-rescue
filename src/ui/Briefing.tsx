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
        <p>
          Fire is already in the stacks. Drive to a cyan opening, scan, then pull people out.
          When a room vents that opening dies.
        </p>
        <dl>
          <div>
            <dt>Drive</dt>
            <dd>W throttle · A / D steer. Follow the cyan pip.</dd>
          </div>
          <div>
            <dt>See</dt>
            <dd>T toggles thermal. Gold pip is Doheny. People wait at the glass.</dd>
          </div>
          <div>
            <dt>Act</dt>
            <dd>Hold Space to scan. Hold F to extract. Red ring is staging.</dd>
          </div>
        </dl>
        <p className="stage0-note">
          You cannot go inside. You cannot die. Below 20% the robot limps. Empty still crawls home.
        </p>
        <button type="button" className="debrief-go" onClick={go}>
          Roll out
        </button>
        <p className="stage0-license">{attribution()}</p>
      </div>
    </div>
  )
}
