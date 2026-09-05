import { coachCopy } from '../run/coach'
import { playIntent } from '../run/intent'
import { nearestPlayOpening, thermalRead } from '../run/opening'
import { useDrive } from '../drive/store'
import { useRun } from '../run/store'

export function Objective() {
  const x = useDrive((s) => s.x)
  const z = useDrive((s) => s.z)
  const moving = useDrive((s) => s.moving || Math.abs(s.speed) > 0.25)
  const run = useRun()
  const intent = playIntent(run, x, z)
  const holding = run.hold.kind !== 'idle'
  const stopFirst = Boolean(intent.hold && moving && !holding)
  const title = stopFirst ? 'Stop first' : intent.title
  const showDist = intent.dist != null && !/\d+\s*m/.test(title) && !holding
  const near = nearestPlayOpening(x, z, run)
  const teach = run.coach !== 'off' && !holding ? coachCopy(run.coach, near?.dist ?? null) : null
  const lastVent = run.vents.filter((v) => v.kind === 'vent').at(-1)
  const venting = lastVent != null && run.t - lastVent.t < 6 && !holding
  const fresh = run.lastReveal && run.t - run.lastReveal.at < 7 ? run.lastReveal : null
  const detail = holding
    ? intent.detail
    : fresh && fresh.kind === 'scan'
      ? `Thermal showed them ${thermalRead(fresh.signature)}`
      : intent.detail

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

  if (venting && !teach) {
    return (
      <div className="obj-pill vented" aria-live="polite">
        <p className="obj-kicker">Vented</p>
        <h2>{lastVent.roomName}</h2>
        <p>That opening is dead</p>
      </div>
    )
  }

  return (
    <div className={`obj-pill ${intent.inRange ? 'ready' : ''} ${intent.kind}`}>
      <div>
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
      {showDist ? <span>{Math.round(intent.dist!)} m</span> : null}
    </div>
  )
}
