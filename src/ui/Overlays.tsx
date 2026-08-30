import { useEffect, useState } from 'react'
import { useGame } from '../game/store'

const BEATS = [
  {
    h1: 'Doheny is on fire.',
  },
  {
    h1: 'The fire is inside the library.',
    lede: 'You cannot go in.',
  },
  {
    h1: 'Four people are still outside.',
    lede: 'Walk to each one and mark them before the heat makes the rest of the ground too dangerous.',
  },
] as const

export function Briefing({ onDeploy }: { onDeploy: () => void }) {
  const [step, setStep] = useState(0)
  const last = step >= BEATS.length - 1
  const beat = BEATS[step]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return
      e.preventDefault()
      if (last) onDeploy()
      else setStep((n) => n + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, onDeploy])

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div key={step} className="onboard-beat">
          <h1>{beat.h1}</h1>
          {'lede' in beat && beat.lede ? <p className="lede">{beat.lede}</p> : null}
        </div>
        <ol className="onboard-dots" aria-label={`Step ${step + 1} of ${BEATS.length}`}>
          {BEATS.map((_, i) => (
            <li key={i} className={i === step ? 'on' : i < step ? 'done' : undefined} />
          ))}
        </ol>
        <button
          type="button"
          className="deploy"
          autoFocus
          key={step}
          onClick={() => (last ? onDeploy() : setStep((n) => n + 1))}
        >
          {last ? 'Start' : 'Next'}
        </button>
      </div>
    </div>
  )
}

export function EndCard() {
  const phase = useGame((s) => s.phase)
  const survivors = useGame((s) => s.survivors)
  const elapsed = useGame((s) => s.elapsed)
  const failNote = useGame((s) => s.failNote)
  const reset = useGame((s) => s.reset)
  const start = useGame((s) => s.start)

  useEffect(() => {
    if (phase !== 'complete' && phase !== 'failed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start])

  if (phase !== 'complete' && phase !== 'failed') return null

  const found = survivors.filter((p) => p.found).length
  const win = phase === 'complete'

  return (
    <div className="overlay dim">
      <div className="overlay-card short">
        <p className="eyebrow">{win ? 'Clear' : 'Failed'}</p>
        <h1>{win ? 'All four marked.' : failNote || 'Time ran out.'}</h1>
        <p className="lede">
          {found} of {survivors.length} · {Math.floor(elapsed)}s
        </p>
        <div className="row">
          <button type="button" className="deploy" autoFocus onClick={start}>
            Go again
          </button>
          <button type="button" className="ghost" onClick={reset}>
            Briefing
          </button>
        </div>
      </div>
    </div>
  )
}
