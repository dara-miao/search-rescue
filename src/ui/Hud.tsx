import type { ReactNode } from 'react'
import { CAMPUS } from '../game/world'
import { useGame } from '../game/store'
import { recentlyDetected } from '../sim/sensors'
import type { HeatZone, VictimSim } from '../sim/types'

function formatTime(seconds: number) {
  const left = Math.max(0, CAMPUS.timeLimit - seconds)
  const m = Math.floor(left / 60)
  const s = Math.floor(left % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function headingTo(fromX: number, fromZ: number, yaw: number, toX: number, toZ: number) {
  const want = Math.atan2(toX - fromX, -(toZ - fromZ))
  let delta = want - yaw
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

function shortName(name: string) {
  return name.replace(/^Victim\s+/i, 'V')
}

function zoneLabel(zone: HeatZone) {
  if (zone === 'nogo') return 'NO GO'
  if (zone === 'hot') return 'HOT'
  if (zone === 'warm') return 'WARM'
  return 'SAFE'
}

function rosterLine(p: VictimSim, elapsed: number) {
  if (p.status === 'marked') return 'marked'
  if (p.status === 'lost') return 'lost'
  if (!p.lastKnown) return 'unseen'
  const stale = elapsed - p.lastKnown.t > 25
  return `${zoneLabel(p.lastKnown.zone)}${stale ? ' STALE' : ''}`
}

export function WorldChrome() {
  const phase = useGame((s) => s.phase)
  const orbit = useGame((s) => s.worldOrbit)
  const setWorldOrbit = useGame((s) => s.setWorldOrbit)
  const tilesReady = useGame((s) => s.tilesReady)
  const googleFeeds = useGame((s) => s.googleFeeds)
  const zone = useGame((s) => s.sim.robot.zone)
  const evac = useGame((s) => s.sim.robot.onEvac)
  const playing = phase === 'playing'

  return (
    <div className="world-chrome">
      <span className="chip">
        {playing && !tilesReady ? 'Loading map' : tilesReady ? 'Map live' : 'World'}
        {playing && googleFeeds === 'live' ? ' · Places' : ''}
      </span>
      {playing && evac && <span className="chip evac">EVAC</span>}
      {playing && (zone === 'hot' || zone === 'nogo') && (
        <span className={`chip ${zone === 'nogo' ? 'nogo' : 'hot'}`}>{zoneLabel(zone)}</span>
      )}
      {playing && (
        <div className="orbit" role="group" aria-label="Orbit the map">
          <button type="button" onClick={() => setWorldOrbit(orbit + 0.45)} title="Orbit left (Q)">
            Q
          </button>
          <button type="button" onClick={() => setWorldOrbit(orbit - 0.45)} title="Orbit right (E)">
            E
          </button>
        </div>
      )}
    </div>
  )
}

export function MastHud({
  onMark,
  onThermal,
  drive,
}: {
  onMark: () => void
  onThermal: () => void
  drive: ReactNode
}) {
  const thermal = useGame((s) => s.thermal)
  const elapsed = useGame((s) => s.elapsed)
  const survivors = useGame((s) => s.survivors)
  const nearestId = useGame((s) => s.nearestId)
  const nearestDist = useGame((s) => s.nearestDist)
  const lastMarked = useGame((s) => s.lastMarked)
  const markFlash = useGame((s) => s.markFlash)
  const robot = useGame((s) => s.robot)
  const zone = useGame((s) => s.sim.robot.zone)
  const hull = useGame((s) => s.sim.robot.hull)
  const evac = useGame((s) => s.sim.robot.onEvac)

  const found = survivors.filter((p) => p.found).length
  const near = survivors.find((p) => p.id === nearestId)
  const canMark = Boolean(near && recentlyDetected(near, elapsed) && nearestDist <= CAMPUS.markRange)
  const marked = survivors.find((p) => p.id === lastMarked)
  const aim = canMark
    ? near
    : survivors.find((p) => p.status === 'detected' && recentlyDetected(p, elapsed)) ??
      survivors.find((p) => p.lastKnown && p.status !== 'marked')
  const aimX = aim?.lastKnown?.x ?? aim?.x
  const aimZ = aim?.lastKnown?.z ?? aim?.z
  const known = Boolean(aim && (aim.status !== 'unseen' || aim.lastKnown))
  const turn = known && aim && aimX !== undefined && aimZ !== undefined ? headingTo(robot.x, robot.z, robot.yaw, aimX, aimZ) : 0
  const aimDist = known && aim && aimX !== undefined && aimZ !== undefined ? Math.hypot(robot.x - aimX, robot.z - aimZ) : 999
  const rangeT = known ? Math.max(0, Math.min(1, 1 - aimDist / 80)) : 0
  const timeLeft = CAMPUS.timeLimit - elapsed
  const timeT = Math.max(0, timeLeft / CAMPUS.timeLimit)
  const staleAim = Boolean(aim?.lastKnown && elapsed - aim.lastKnown.t > 25)

  return (
    <div className={`mast ${thermal ? 'is-thermal' : ''}`}>
      <header className="mast-top">
        <div className="clock">
          <b className={timeLeft < 60 || zone === 'nogo' ? 'danger' : ''}>{formatTime(elapsed)}</b>
          <i className="bar" style={{ width: `${timeT * 100}%` }} />
          <span>
            {found}/{survivors.length} marked
          </span>
        </div>
        <div className={`zone-chip ${zone}${evac ? ' on-evac' : ''}`}>
          {evac ? 'EVAC · ' : ''}
          {zoneLabel(zone)}
          {hull > 0.35 && <i className="hull" style={{ width: `${hull * 100}%` }} />}
        </div>
        <ol className="roster" aria-label="Victims">
          {survivors.map((p, i) => (
            <li
              key={p.id}
              className={
                p.found ? 'found' : p.status === 'lost' ? 'lost' : p.id === aim?.id ? 'next' : p.status === 'unseen' ? 'unseen' : ''
              }
              title={rosterLine(p, elapsed)}
            >
              <em>{i + 1}</em>
              {shortName(p.name)}
              <small>{rosterLine(p, elapsed)}</small>
            </li>
          ))}
        </ol>
      </header>

      {markFlash > 0 && marked && (
        <div className="toast" role="status">
          {marked.name} marked
          {found < survivors.length ? ` · ${survivors.length - found} left` : ''}
        </div>
      )}

      <div className="console">
        <div className="console-readout">
          <p className="console-kicker">{thermal ? 'Thermal mast' : 'Mast cam'}</p>
          <div className="objective">
            <i className="needle" style={{ transform: `rotate(${(turn * 180) / Math.PI}deg)` }} />
            <div>
              <strong>{known && aim ? aim.name : 'Sweep'}</strong>
              <span>
                {!known && 'No last-known — search the door'}
                {known && aim && staleAim && `${aim.note} · STALE`}
                {known && aim && !staleAim && `${aim.note} · ${aimDist < 99 ? `${aimDist.toFixed(0)} m` : 'far'}`}
              </span>
            </div>
          </div>
          <div className="range" aria-hidden="true">
            <i style={{ width: `${rangeT * 100}%` }} />
          </div>
          <p className="console-hint">
            {canMark
              ? 'In range — mark now'
              : zone === 'nogo'
                ? 'NO GO — turn back'
                : 'Detect, then mark inside 7 m'}
          </p>
        </div>

        <div className="console-drive">{drive}</div>

        <div className="console-actions">
          <button
            type="button"
            className={canMark ? 'mark-go' : 'mark-wait'}
            disabled={!canMark}
            onClick={onMark}
          >
            {canMark && near ? `Mark ${near.name}` : known ? 'Get closer' : 'Find them'}
          </button>
          <button
            type="button"
            className={`heat ${thermal ? 'on' : ''}`}
            onClick={onThermal}
            aria-pressed={thermal}
          >
            <i />
            {thermal ? 'Thermal on' : 'Thermal'}
          </button>
          <ul className="keys">
            <li>
              <kbd>W</kbd> walk
            </li>
            <li>
              <kbd>F</kbd> mark
            </li>
            <li>
              <kbd>T</kbd> heat
            </li>
            <li>
              <kbd>⇧</kbd> sprint
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
