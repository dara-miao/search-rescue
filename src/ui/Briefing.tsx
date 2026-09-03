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
          Fire is already in the stacks. You stay on the lawn. Every rescue is from a window or
          door — cyan marks a live opening. When a room vents, that opening dies.
        </p>
        <dl>
          <div>
            <dt>Drive</dt>
            <dd>W / S throttle · A / D steer. The camera stays behind you.</dd>
          </div>
          <div>
            <dt>See</dt>
            <dd>Hold T for thermal. Gold pip is the building. Cyan pip is the nearest live opening.</dd>
          </div>
          <div>
            <dt>Act</dt>
            <dd>Space scan · F extract or mark. Engines and the red ring are staging — charge there.</dd>
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
