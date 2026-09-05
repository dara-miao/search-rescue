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
    body: 'Drive to the marked openings and get people out. They walk to staging.',
  },
  {
    title: 'Thermal only shows heat.',
    body: 'Assess to learn who is at the glass.',
  },
  {
    title: 'When a room vents, that opening dies.',
    body: 'Smoke comes first. Stay off the lip.',
  },
  {
    title: 'Stay on the lawn.',
    body: 'Charge at the red ring if you limp.',
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
