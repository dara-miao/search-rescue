import { useEffect } from 'react'
import { SCENARIOS } from '../game/scenarios'
import { useGame } from '../game/store'

export function ScenarioPick({ onPick }: { onPick: (id: string) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.target instanceof HTMLElement && e.target.closest('button')) return
      const n = Number(e.key)
      if (n >= 1 && n <= SCENARIOS.length) {
        e.preventDefault()
        onPick(SCENARIOS[n - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onPick])

  return (
    <div className="pick">
      <div className="pick-card">
        <p className="eyebrow">Search and rescue</p>
        <h1>Pick the emergency.</h1>
        <p className="lede">WORLD is the campus. ROBOT is the mast. You watch the outdoor sweep.</p>
        <ul className="pick-list">
          {SCENARIOS.map((sc, i) => (
            <li key={sc.id}>
              <button type="button" onClick={() => onPick(sc.id)}>
                <span className="pick-kicker">
                  {i + 1} · {sc.kicker}
                </span>
                <strong>{sc.title}</strong>
                <span>{sc.lede}</span>
                <em>
                  {sc.people} people · {sc.why}
                </em>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function EndCard() {
  const phase = useGame((s) => s.phase)
  const survivors = useGame((s) => s.survivors)
  const elapsed = useGame((s) => s.elapsed)
  const failNote = useGame((s) => s.failNote)
  const scenarioId = useGame((s) => s.scenarioId)
  const reset = useGame((s) => s.reset)
  const start = useGame((s) => s.start)

  useEffect(() => {
    if (phase !== 'complete' && phase !== 'failed') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        start(scenarioId)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start, scenarioId])

  if (phase !== 'complete' && phase !== 'failed') return null

  const found = survivors.filter((p) => p.found).length
  const win = phase === 'complete'

  return (
    <div className="overlay dim">
      <div className="overlay-card short">
        <p className="eyebrow">{win ? 'Clear' : 'Failed'}</p>
        <h1>{win ? 'The robot marked everyone it was sent for.' : failNote || 'The run failed.'}</h1>
        <p className="lede">
          {found} of {survivors.length} · {Math.floor(elapsed)}s
        </p>
        <div className="row">
          <button type="button" className="deploy" autoFocus onClick={() => start(scenarioId)}>
            Watch again
          </button>
          <button type="button" className="ghost" onClick={reset}>
            Scenarios
          </button>
        </div>
      </div>
    </div>
  )
}
