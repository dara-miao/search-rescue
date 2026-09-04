import { useState } from 'react'
import { useDrive } from '../drive/store'
import { isMuted, setMuted, unlockAudio } from '../run/audio'
import { batteryBand } from '../run/battery'
import { playIntent } from '../run/intent'
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
  const intent = playIntent(run, x, z)
  const assessReady = intent.hold === 'scan' || intent.hold === 'mark'
  const rescueReady = intent.hold === 'rescue'

  const replay = () => {
    useDrive.getState().reset()
    useRun.getState().replay()
  }

  const alert =
    band === 'empty' ? 'Crawl to the red ring' : band === 'limp' ? 'Limp · charge at staging' : run.inHeat ? 'Heat' : null

  return (
    <>
      <Compass />
      <Objective />
      {run.thermal ? <div className={`thermal-cast ${run.inHeat ? 'hot' : ''}`} aria-hidden="true" /> : null}
      <aside className="run-strip">
        <time>{clock(run.t)}</time>
        <span className={`batt ${band}`} title={`Battery ${run.battery.toFixed(0)}`}>
          <i style={{ width: `${run.battery}%` }} />
        </span>
        <em title="Still inside">{waiting}</em>
        {alert ? <p className="run-toast">{alert}</p> : null}
      </aside>
      <div className="drive-dock run-dock">
        <div className="run-actions">
          <button
            type="button"
            className={`${run.hold.kind === 'scan' || run.hold.kind === 'mark' ? 'on' : ''} ${assessReady ? 'ready' : 'dim'}`}
            onPointerDown={(e) => {
              e.preventDefault()
              setHud({ hold: true })
            }}
            onPointerUp={() => setHud({ hold: false })}
            onPointerLeave={() => setHud({ hold: false })}
          >
            Assess
          </button>
          <button
            type="button"
            className={`${run.hold.kind === 'rescue' ? 'on' : ''} ${rescueReady ? 'ready' : 'dim'}`}
            onPointerDown={(e) => {
              e.preventDefault()
              setHud({ rescue: true })
            }}
            onPointerUp={() => setHud({ rescue: false })}
            onPointerLeave={() => setHud({ rescue: false })}
          >
            Rescue
          </button>
        </div>
        <div className="run-tools">
          <button type="button" className={run.thermal ? 'on' : ''} onClick={() => useRun.getState().toggleThermal()}>
            Thermal
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
            {mute ? 'Mute' : 'Sound'}
          </button>
          <button type="button" onClick={replay}>
            Again
          </button>
        </div>
        <AnalogKnob onVector={(x, y, on) => setStick(x, y, on)} />
      </div>
    </>
  )
}
