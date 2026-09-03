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
  const stopFirst = Boolean(intent.hold && moving && run.hold.kind === 'idle')
  const title = stopFirst ? 'Stop, then hold' : intent.title
  const kicker = stopFirst ? 'Stop first' : intent.step

  return (
    <>
      <div className={`objective ${intent.inRange ? 'ready' : ''} ${intent.kind}`}>
        <p className="objective-kicker">{kicker}</p>
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
