import { useEffect } from 'react'
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
    lede: 'The robot will find them. You watch.',
  },
] as const

export function Briefing({ onDeploy }: { onDeploy: () => void }) {
  const step = useGame((s) => s.briefingStep)
  const setBriefingStep = useGame((s) => s.setBriefingStep)
  const last = step >= BEATS.length - 1
  const beat = BEATS[Math.min(step, BEATS.length - 1)]

  const advance = () => {
    if (last) onDeploy()
    else setBriefingStep(step + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return
      if (e.repeat) return
      if (e.target instanceof HTMLElement && e.target.closest('button')) return
      e.preventDefault()
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [last, step, onDeploy, setBriefingStep])

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="onboard-slot">
          <div key={step} className="onboard-beat">
            <h1>{beat.h1}</h1>
            {'lede' in beat && beat.lede ? <p className="lede">{beat.lede}</p> : null}
          </div>
        </div>
        <ol className="onboard-dots" aria-label={`Step ${step + 1} of ${BEATS.length}`}>
          {BEATS.map((_, i) => (
            <li key={i} className={i === step ? 'on' : i < step ? 'done' : undefined} />
          ))}
        </ol>
        <button type="button" className="deploy" autoFocus key={step} onClick={advance}>
          {last ? 'Watch' : 'Next'}
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
        <h1>{win ? 'The robot marked all four.' : failNote || 'The run failed.'}</h1>
        <p className="lede">
          {found} of {survivors.length} · {Math.floor(elapsed)}s
        </p>
        <div className="row">
          <button type="button" className="deploy" autoFocus onClick={start}>
            Watch again
          </button>
          <button type="button" className="ghost" onClick={reset}>
            Briefing
          </button>
        </div>
      </div>
    </div>
  )
}
