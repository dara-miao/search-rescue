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
    <div className="overlay">
      <div className="overlay-card brief">
        <p className="eyebrow">Search rescue</p>
        <h1>Doheny is on fire.</h1>
        <p className="lede">
          Deploy west of the library. Detect on the mast, then mark. Heat is spreading from the west
          door.
        </p>
        <ul className="mission-list">
          <li>
            <b>1</b> West door
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
        </ul>
        <p className="fineprint">Stick: up walks, left/right turns. Look pans without walking. C switches.</p>
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
