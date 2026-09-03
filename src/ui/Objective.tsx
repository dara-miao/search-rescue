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
  const title = intent.hold && moving && run.hold.kind === 'idle' ? 'Stop, then hold' : intent.title

  return (
    <>
      <div className={`objective ${intent.inRange ? 'ready' : ''} ${intent.kind}`}>
        <p className="objective-kicker">
          {intent.kind === 'coach' ? 'Go' : intent.inRange ? 'Now' : 'Next'}
        </p>
        <h2>{title}</h2>
        <p>{intent.detail}</p>
      </div>
      {intent.hold && run.hold.kind !== 'idle' ? (
        <div className="hold-banner" aria-live="polite">
          <b style={{ width: `${frac * 100}%` }} />
          <span>{intent.title}</span>
        </div>
      ) : intent.inRange && intent.hold ? (
        <div className="hold-banner hint">
          <span>{title}</span>
        </div>
      ) : null}
    </>
  )
}
