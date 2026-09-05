import { useEffect, useState } from 'react'
import { attribution } from '../data/site'
import { useDrive } from '../drive/store'
import { unlockAudio } from '../run/audio'
import { useRun } from '../run/store'

const BEATS = [
  {
    title: 'Doheny is on fire.',
    body: null,
  },
  {
    title: 'Your job is the perimeter.',
    body: 'Drive to the marked openings, see who is waiting at the glass, and rescue anyone you can reach. They walk themselves to staging.',
  },
  {
    title: 'Assess to size up who is at the glass.',
    body: 'Thermal only shows heat. You will not know how many people are there, or how they are doing, until you stop and assess.',
  },
  {
    title: 'When a room vents, that opening dies.',
    body: 'You will see smoke first. Get off the lip before the heat dumps out.',
  },
  {
    title: 'The interior is closed.',
    body: 'Stay on the lawn. The red ring is staging, and you can charge there if the battery starts to limp.',
  },
] as const

export function Briefing() {
  const [step, setStep] = useState(0)
  const last = step >= BEATS.length - 1
  const beat = BEATS[step]

  const go = () => {
    unlockAudio()
    useDrive.getState().reset()
    useRun.getState().begin()
  }

  const advance = () => {
    if (last) go()
    else setStep((n) => n + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return
      if (e.repeat) return
      e.preventDefault()
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last])

  return (
    <div className="briefing">
      <div className="briefing-card">
        <p className="briefing-kicker">
          {step + 1}/{BEATS.length}
        </p>
        <div key={step} className="briefing-beat">
          <h1>{beat.title}</h1>
          {beat.body ? <p>{beat.body}</p> : null}
        </div>
        <div className="briefing-foot">
          <ol className="briefing-dots" aria-label={`Step ${step + 1} of ${BEATS.length}`}>
            {BEATS.map((_, i) => (
              <li key={i} className={i === step ? 'on' : i < step ? 'done' : undefined} />
            ))}
          </ol>
          <button type="button" className="debrief-go" autoFocus onClick={advance}>
            {last ? 'Deploy' : 'Next'}
          </button>
        </div>
      </div>
      <p className="osm-mark" title={attribution()}>
        © OSM
      </p>
    </div>
  )
}
