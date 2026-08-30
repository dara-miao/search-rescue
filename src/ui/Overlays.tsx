import { useEffect } from 'react'
import { useGame } from '../game/store'

export function Briefing({ onDeploy }: { onDeploy: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        onDeploy()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDeploy])

  return (
    <div className="onboard">
      <div className="onboard-card">
        <p className="eyebrow">Search Rescue · University Park</p>
        <h1>The fire is inside. You work the door.</h1>
        <p className="lede">
          Doheny is burning. You cannot go in. Four people are still outside — west door, west steps,
          Tommy, Bovard lawn. Heat is coming out that door. Find them, get close, mark them before the
          apron goes NO GO.
        </p>
        <ol className="mission-list">
          <li>
            <b>1</b> West door — first. Already hot.
          </li>
          <li>
            <b>2</b> West steps
          </li>
          <li>
            <b>3</b> Tommy
          </li>
          <li>
            <b>4</b> Bovard lawn
          </li>
        </ol>
        <p className="fineprint">
          Deploy opens two views: WORLD is the campus from above. ROBOT is your walk. Stick up walks,
          left/right turns. C switches to Look.
        </p>
        <button type="button" className="deploy" autoFocus onClick={onDeploy}>
          Deploy
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
