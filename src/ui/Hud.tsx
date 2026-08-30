import type { ReactNode } from 'react'
import { CAMPUS } from '../game/world'
import { useGame } from '../game/store'

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

export function WorldChrome() {
  const phase = useGame((s) => s.phase)
  const orbit = useGame((s) => s.worldOrbit)
  const setWorldOrbit = useGame((s) => s.setWorldOrbit)
  const tilesReady = useGame((s) => s.tilesReady)
  const googleFeeds = useGame((s) => s.googleFeeds)
  const playing = phase === 'playing'

  return (
    <div className="world-chrome">
      <span className="chip">
        {playing && !tilesReady ? 'Loading map' : tilesReady ? 'Map live' : 'World'}
        {playing && googleFeeds === 'live' ? ' · Places' : ''}
      </span>
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

  const found = survivors.filter((p) => p.found).length
  const near = survivors.find((p) => p.id === nearestId)
  const objective = survivors.find((p) => !p.found) ?? near
  const canMark = Boolean(near && !near.found && nearestDist <= CAMPUS.markRange)
  const marked = survivors.find((p) => p.id === lastMarked)
  const aim = canMark ? near : objective
  const turn = aim ? headingTo(robot.x, robot.z, robot.yaw, aim.x, aim.z) : 0
  const aimDist = aim ? Math.hypot(robot.x - aim.x, robot.z - aim.z) : nearestDist
  const rangeT = Math.max(0, Math.min(1, 1 - aimDist / 80))
  const timeLeft = CAMPUS.timeLimit - elapsed
  const timeT = Math.max(0, timeLeft / CAMPUS.timeLimit)

  return (
    <div className={`mast ${thermal ? 'is-thermal' : ''}`}>
      <header className="mast-top">
        <div className="clock">
          <b className={timeLeft < 60 ? 'danger' : ''}>{formatTime(elapsed)}</b>
          <i className="bar" style={{ width: `${timeT * 100}%` }} />
          <span>
            {found}/{survivors.length} marked
          </span>
        </div>
        <ol className="roster" aria-label="Victims">
          {survivors.map((p, i) => (
            <li
              key={p.id}
              className={p.found ? 'found' : p.id === objective?.id ? 'next' : ''}
              title={p.note}
            >
              <em>{i + 1}</em>
              {shortName(p.name)}
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
              <strong>{aim ? aim.name : 'Sweep'}</strong>
              <span>
                {aim
                  ? `${aim.note} · ${aimDist < 99 ? `${aimDist.toFixed(0)} m` : 'far'}`
                  : 'Quad is clear'}
              </span>
            </div>
          </div>
          <div className="range" aria-hidden="true">
            <i style={{ width: `${rangeT * 100}%` }} />
          </div>
          <p className="console-hint">
            {canMark ? 'In range — mark now' : `Mark inside ${CAMPUS.markRange.toFixed(0)} m`}
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
            {canMark && near ? `Mark ${near.name}` : 'Get closer'}
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
