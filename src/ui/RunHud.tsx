import { useState } from 'react'
import { attribution } from '../data/site'
import { useDrive } from '../drive/store'
import { isMuted, setMuted, unlockAudio } from '../run/audio'
import { batteryBand } from '../run/battery'
import { playIntent } from '../run/intent'
import { conditionLabel, revealLine, typeLabel } from '../run/opening'
import { useRun } from '../run/store'
import { AnalogKnob } from './AnalogKnob'
import { Compass } from './Compass'
import { Objective } from './Objective'

function clock(t: number) {
  const s = Math.max(0, Math.floor(t))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export function RunHud() {
  const run = useRun()
  const setHud = useRun((s) => s.setHud)
  const setStick = useDrive((s) => s.setStick)
  const x = useDrive((s) => s.x)
  const z = useDrive((s) => s.z)
  const [mute, setMute] = useState(() => isMuted())
  const band = batteryBand(run.battery)
  const waiting = run.victims.filter((v) => v.state === 'WAITING' || v.state === 'CARRIED').length
  const marked = run.victims.filter((v) => v.state === 'MARKED').length
  const lastVent = run.vents[run.vents.length - 1]
  const telegraph = run.cells.find((c) => c.preVent && !c.vented)
  const intent = playIntent(run, x, z)
  const scanReady = intent.hold === 'scan' || intent.hold === 'mark'
  const extractReady = intent.hold === 'rescue'

  const replay = () => {
    useDrive.getState().reset()
    useRun.getState().replay()
  }

  const event =
    band === 'empty'
      ? 'Battery empty · crawl to the red ring'
      : band === 'limp'
        ? 'Battery limp · charge at staging'
        : run.inHeat
          ? 'Heat · battery drains faster · thermal breaks up'
          : telegraph
            ? `Smoke thickening at the ${telegraph.roomName}`
            : lastVent
              ? `Fire reached the ${lastVent.roomName}`
              : run.lastReveal
                ? `${conditionLabel(run.lastReveal.condition)} · ${typeLabel(run.lastReveal.type)} · ${run.lastReveal.count}`
                : null

  return (
    <>
      <Compass />
      <Objective />
      {run.thermal ? <div className={`thermal-cast ${run.inHeat ? 'hot' : ''}`} aria-hidden="true" /> : null}
      <aside className="stage0 drive-hud run-hud">
        <p className="stage0-kicker">Doheny · seed {run.seed}</p>
        <h1>{clock(run.t)}</h1>
        <dl>
          <div>
            <dt>Battery</dt>
            <dd>
              <span className={`batt ${band}`}>
                <i style={{ width: `${run.battery}%` }} />
              </span>
              {run.battery.toFixed(0)}
              {band === 'limp' ? ' · limp' : band === 'empty' ? ' · crawl' : ''}
            </dd>
          </div>
          <div>
            <dt>Still in</dt>
            <dd>
              {waiting} waiting{marked ? ` · ${marked} marked` : ''}
            </dd>
          </div>
          {run.lastReveal ? (
            <div>
              <dt>{run.lastReveal.kind === 'scan' ? 'Last scan' : run.lastReveal.kind === 'mark' ? 'Marked' : 'Extract'}</dt>
              <dd>{revealLine(run.lastReveal)}</dd>
            </div>
          ) : null}
        </dl>
        {event ? <p className="stage0-hint vent-line">{event}</p> : null}
        <p className="stage0-license">{attribution()}</p>
      </aside>
      <div className="drive-dock run-dock">
        <div className="run-actions">
          <button
            type="button"
            className={run.thermal ? 'on' : ''}
            onClick={() => useRun.getState().toggleThermal()}
          >
            {run.thermal ? 'Thermal on' : 'Thermal'}
          </button>
          <button
            type="button"
            className={`${run.hold.kind === 'scan' || run.hold.kind === 'mark' ? 'on' : ''} ${scanReady ? 'ready' : 'dim'}`}
            onPointerDown={(e) => {
              e.preventDefault()
              setHud({ hold: true })
            }}
            onPointerUp={() => setHud({ hold: false })}
            onPointerLeave={() => setHud({ hold: false })}
          >
            Scan
          </button>
          <button
            type="button"
            className={`${run.hold.kind === 'rescue' ? 'on' : ''} ${extractReady ? 'ready' : 'dim'}`}
            onPointerDown={(e) => {
              e.preventDefault()
              setHud({ rescue: true })
            }}
            onPointerUp={() => setHud({ rescue: false })}
            onPointerLeave={() => setHud({ rescue: false })}
          >
            Extract
          </button>
          <button
            type="button"
            className={mute ? 'on' : ''}
            onClick={() => {
              unlockAudio()
              const next = !isMuted()
              setMuted(next)
              setMute(next)
            }}
          >
            {mute ? 'Muted' : 'Audio'}
          </button>
          <button type="button" onClick={replay}>
            Restart
          </button>
        </div>
        <AnalogKnob onVector={(x, y, on) => setStick(x, y, on)} />
      </div>
    </>
  )
}
