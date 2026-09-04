import { playIntent } from '../run/intent'
import { holdFrac } from '../run/hold'
import { useDrive } from '../drive/store'
import { useRun } from '../run/store'

export function Objective() {
  const x = useDrive((s) => s.x)
  const z = useDrive((s) => s.z)
  const moving = useDrive((s) => s.moving || Math.abs(s.speed) > 0.25)
  const run = useRun()
  const intent = playIntent(run, x, z)
  const frac = holdFrac(run.hold)
  const holding = run.hold.kind !== 'idle'
  const stopFirst = Boolean(intent.hold && moving && !holding)
  const title = stopFirst ? 'Stop first' : intent.title
  const showDist = intent.dist != null && !/\d+\s*m/.test(title)

  if (holding) {
    return (
      <div className="hold-banner" aria-live="polite">
        <b style={{ width: `${frac * 100}%` }} />
        <span>{intent.title}</span>
      </div>
    )
  }

  return (
    <div className={`obj-pill ${intent.inRange ? 'ready' : ''} ${intent.kind}`}>
      <h2>{title}</h2>
      {showDist ? <span>{Math.round(intent.dist!)} m</span> : null}
    </div>
  )
}
