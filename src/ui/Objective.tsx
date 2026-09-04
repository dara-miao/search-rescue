import { coachCopy } from '../run/coach'
import { playIntent } from '../run/intent'
import { holdFrac } from '../run/hold'
import { nearestPlayOpening } from '../run/opening'
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
  const near = nearestPlayOpening(x, z, run)
  const teach = run.coach !== 'off' ? coachCopy(run.coach, near?.dist ?? null) : null

  if (holding) {
    return (
      <div className="hold-banner" aria-live="polite">
        <b style={{ width: `${frac * 100}%` }} />
        <span>{intent.title}</span>
      </div>
    )
  }

  if (teach) {
    return (
      <div className={`coach-card ${run.coach}`}>
        <p className="coach-kicker">{teach.n} of 4</p>
        <h2>{teach.title}</h2>
        <p>{teach.hint}</p>
        <ol className="coach-dots" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <li key={n} className={n === teach.n ? 'on' : n < teach.n ? 'done' : ''} />
          ))}
        </ol>
        <button type="button" className="coach-skip" onClick={() => useRun.getState().skipCoach()}>
          Skip
        </button>
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
