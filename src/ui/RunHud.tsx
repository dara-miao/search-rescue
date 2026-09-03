import { useState } from 'react'
import { attribution } from '../data/site'
import { useDrive } from '../drive/store'
import { isMuted, setMuted, unlockAudio } from '../run/audio'
import { batteryBand } from '../run/battery'
import { holdFrac } from '../run/hold'
import { conditionLabel, nearestLiveOpening, revealLine, typeLabel } from '../run/opening'
import { useRun } from '../run/store'
import { AnalogKnob } from './AnalogKnob'
import { Compass } from './Compass'

function clock(t: number) {
  const s = Math.max(0, Math.floor(t))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function holdLabel(kind: string) {
  if (kind === 'scan') return 'Scanning'
  if (kind === 'rescue') return 'Extracting'
  if (kind === 'mark') return 'Marking'
  return null
}

export function RunHud() {
  const t = useRun((s) => s.t)
  const battery = useRun((s) => s.battery)
  const thermal = useRun((s) => s.thermal)
  const hold = useRun((s) => s.hold)
  const carriedId = useRun((s) => s.carriedId)
  const vents = useRun((s) => s.vents)
  const victims = useRun((s) => s.victims)
  const setHud = useRun((s) => s.setHud)
  const setStick = useDrive((s) => s.setStick)
  const speed = useDrive((s) => s.speed)
  const inHeat = useRun((s) => s.inHeat)
  const waiting = victims.filter((v) => v.state === 'WAITING' || v.state === 'CARRIED').length
  const marked = victims.filter((v) => v.state === 'MARKED').length
  const lastVent = vents[vents.length - 1]
  const cells = useRun((s) => s.cells)
  const seed = useRun((s) => s.seed)
  const action = holdLabel(hold.kind)
  const carried = victims.find((v) => v.id === carriedId)
  const telegraph = cells.find((c) => c.preVent && !c.vented)
  const lastReveal = useRun((s) => s.lastReveal)
  const extractions = useRun((s) => s.extractions)
  const x = useDrive((s) => s.x)
  const z = useDrive((s) => s.z)
  const [mute, setMute] = useState(() => isMuted())
  const band = batteryBand(battery)
  const near = nearestLiveOpening(x, z, { cells, extractions, victims })

  return (
    <>
      <Compass />
      <aside className="stage0 drive-hud run-hud">
        <p className="stage0-kicker">Doheny · perimeter · seed {seed}</p>
        <h1>{clock(t)}</h1>
        <dl>
          <div>
            <dt>Battery</dt>
            <dd>
              <span className={`batt ${band}`}>
                <i style={{ width: `${battery}%` }} />
              </span>
              {battery.toFixed(0)}
              {band === 'limp' ? ' · limp' : band === 'empty' ? ' · crawl' : ''}
            </dd>
          </div>
          <div>
            <dt>Thermal</dt>
            <dd>
              {thermal
                ? inHeat
                  ? 'On · noisy in the heat'
                  : 'On · signatures only'
                : 'Hold T'}
            </dd>
          </div>
          <div>
            <dt>Action</dt>
            <dd>
              {action
                ? `${action} ${(holdFrac(hold) * 100).toFixed(0)}%`
                : carried
                  ? `Carrying · return to staging`
                  : 'Space scan · F extract · T thermal'}
            </dd>
          </div>
          <div>
            <dt>Opening</dt>
            <dd>
              {near
                ? near.dist <= 4
                  ? `${near.ext.opening} · in range`
                  : `${near.ext.facade} · ${near.dist.toFixed(0)} m`
                : 'None live'}
            </dd>
          </div>
          <div>
            <dt>Still in</dt>
            <dd>
              {waiting} waiting · {marked} marked
            </dd>
          </div>
          {lastReveal ? (
            <div>
              <dt>{lastReveal.kind === 'scan' ? 'Scanned' : lastReveal.kind === 'mark' ? 'Marked' : 'Extract'}</dt>
              <dd>
                {revealLine(lastReveal)}
                {lastReveal.kind === 'scan' ? ` · ${lastReveal.opening}` : ''}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Drive</dt>
            <dd>
              W/S throttle · A/D steer · {Math.abs(speed).toFixed(1)} m/s
              {band === 'limp' ? ' · limp' : band === 'empty' ? ' · crawl home' : ''}
            </dd>
          </div>
        </dl>
        {band === 'empty' ? (
          <p className="stage0-hint vent-line">Battery empty · crawl to the red ring</p>
        ) : band === 'limp' ? (
          <p className="stage0-hint vent-line">Battery limp · charge at staging</p>
        ) : inHeat ? (
          <p className="stage0-hint vent-line">Heat · battery 2.5× · thermal breaks up</p>
        ) : telegraph ? (
          <p className="stage0-hint vent-line">Smoke thickening at the {telegraph.roomName}</p>
        ) : lastVent ? (
          <p className="stage0-hint vent-line">Fire reached the {lastVent.roomName}</p>
        ) : lastReveal ? (
          <p className="stage0-hint">
            {conditionLabel(lastReveal.condition)} · {typeLabel(lastReveal.type)} · {lastReveal.count} — clock stays hidden
          </p>
        ) : (
          <p className="stage0-note">
            You cannot go inside. Cyan marks a live opening. Thermal shows heat through the walls. Scan
            before you commit a carry.
          </p>
        )}
        <p className="stage0-license">{attribution()}</p>
      </aside>
      <div className="drive-dock run-dock">
        <div className="run-actions">
          <button
            type="button"
            className={thermal ? 'on' : ''}
            onPointerDown={(e) => {
              e.preventDefault()
              setHud({ thermal: true })
            }}
            onPointerUp={() => setHud({ thermal: false })}
            onPointerLeave={() => setHud({ thermal: false })}
          >
            Thermal
          </button>
          <button
            type="button"
            className={hold.kind === 'scan' || hold.kind === 'mark' ? 'on' : ''}
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
          <button
            type="button"
            className={hold.kind === 'rescue' ? 'on' : ''}
            onPointerDown={(e) => {
              e.preventDefault()
              setHud({ rescue: true })
            }}
            onPointerUp={() => setHud({ rescue: false })}
            onPointerLeave={() => setHud({ rescue: false })}
          >
            Extract
          </button>
        </div>
        <AnalogKnob onVector={(x, y, on) => setStick(x, y, on)} />
      </div>
      {thermal && inHeat ? <div className="heat-noise" aria-hidden="true" /> : null}
    </>
  )
}
