import { useEffect, useState } from 'react'
import { coachCopy } from '../run/coach'
import { playIntent } from '../run/intent'
import { nearestPlayOpening, thermalRead } from '../run/opening'
import { useDrive } from '../drive/store'
import { useRun } from '../run/store'

function Crossfade({
  text,
  as: Tag,
  className,
}: {
  text: string
  as: 'h2' | 'p'
  className?: string
}) {
  const [cur, setCur] = useState(text)
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (text === cur) return
    setOn(false)
    const id = window.setTimeout(() => {
      setCur(text)
      setOn(true)
    }, 120)
    return () => window.clearTimeout(id)
  }, [text, cur])

  return (
    <Tag className={`${className ?? ''} obj-fade${on ? ' on' : ''}`.trim()}>{cur || '\u00a0'}</Tag>
  )
}

export function Objective() {
  const x = useDrive((s) => s.x)
  const z = useDrive((s) => s.z)
  const moving = useDrive((s) => s.moving || Math.abs(s.speed) > 0.25)
  const run = useRun()
  const intent = playIntent(run, x, z)
  const holding = run.hold.kind !== 'idle'
  const stopFirst = Boolean(intent.hold && moving && !holding)
  const near = nearestPlayOpening(x, z, run)
  const teach = run.coach !== 'off' && !holding ? coachCopy(run.coach, near?.dist ?? null) : null
  const lastVent = run.vents.filter((v) => v.kind === 'vent').at(-1)
  const venting = lastVent != null && run.t - lastVent.t < 6 && !holding && !teach
  const fresh = run.lastReveal && run.t - run.lastReveal.at < 7 ? run.lastReveal : null

  const mode = teach ? 'coach' : venting ? 'vent' : 'play'
  const title = teach ? teach.title : venting ? lastVent.roomName : intent.title
  const detail = teach
    ? teach.hint
    : venting
      ? 'That opening is dead'
      : holding
        ? intent.detail
        : stopFirst
          ? 'Stop on the lawn first'
          : fresh && fresh.kind === 'scan'
            ? `Thermal showed them ${thermalRead(fresh.signature)}`
            : intent.detail
  const kicker = teach ? `${teach.n} of 4` : venting ? 'Vented' : '\u00a0'
  const meters = mode === 'play' && intent.dist != null && !holding ? `${Math.round(intent.dist)} m` : ''

  return (
    <div
      className={`obj-card ${mode} ${!teach && !venting && intent.inRange ? 'ready' : ''} ${!teach && !venting ? intent.kind : ''}`}
    >
      <p className={`obj-kicker${teach || venting ? '' : ' idle'}`}>{kicker}</p>
      <div className="obj-row">
        <div className="obj-copy">
          <Crossfade as="h2" text={title} />
          <Crossfade as="p" text={detail} />
        </div>
        <span className={meters ? '' : 'idle'}>{meters || '\u00a0'}</span>
      </div>
      <div className="obj-coach" aria-hidden={!teach}>
        <div className="obj-coach-in">
          <ol className="coach-dots">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className={n === teach?.n ? 'on' : teach && n < teach.n ? 'done' : ''} />
            ))}
          </ol>
          <button type="button" className="coach-skip" onClick={() => useRun.getState().skipCoach()}>
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
