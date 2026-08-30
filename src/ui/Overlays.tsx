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
        <div className="brief-copy">
          <p className="eyebrow">Search rescue</p>
          <h1>Doheny is on fire.</h1>
          <p className="lede">
            Deploy on the walk west of the library. WORLD is the real campus from Google Maps.
            ROBOT walks the reconstruct. Mark all four victims before the clock runs out.
          </p>
          <ul className="mission-list">
            <li>
              <b>1</b> Doheny west door
            </li>
            <li>
              <b>2</b> West steps
            </li>
            <li>
              <b>3</b> Tommy Trojan
            </li>
            <li>
              <b>4</b> West of Bovard
            </li>
          </ul>
        </div>
        <div className="brief-panel">
          <p className="eyebrow">Mast console</p>
          <ul className="legend">
            <li>
              <kbd>Stick</kbd>
              <span>Point it the way you want to walk</span>
            </li>
            <li>
              <kbd>F</kbd>
              <span>Mark a victim when the button lights</span>
            </li>
            <li>
              <kbd>T</kbd>
              <span>Thermal on the mast only</span>
            </li>
            <li>
              <kbd>Q E</kbd>
              <span>Orbit the WORLD map</span>
            </li>
          </ul>
          <button type="button" className="deploy" autoFocus onClick={onDeploy}>
            Deploy
          </button>
          <p className="fineprint">Enter deploys. Shift sprints.</p>
        </div>
      </div>
    </div>
  )
}

export function EndCard() {
  const phase = useGame((s) => s.phase)
  const survivors = useGame((s) => s.survivors)
  const elapsed = useGame((s) => s.elapsed)
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
        <h1>{win ? 'All four marked.' : 'Time ran out.'}</h1>
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
