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
        <p className="eyebrow">Search Rescue · USC</p>
        <h1>Doheny is on fire.</h1>
        <p className="lede">
          The fire is inside the library. You cannot go in.
        </p>
        <p className="lede">
          Four people are still outside. Walk to each one and mark them before heat from the west
          door makes that ground too dangerous.
        </p>
        <p className="where">West door · West steps · Tommy Trojan · Bovard lawn</p>
        <p className="fineprint">
          Start opens a map of campus on the left and your walk on the right. Stick up walks. C looks
          around.
        </p>
        <button type="button" className="deploy" autoFocus onClick={onDeploy}>
          Start
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
