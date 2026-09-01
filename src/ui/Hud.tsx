import { CAMPUS } from '../game/world'
import { useGame } from '../game/store'
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

function zoneLabel(zone: HeatZone) {
  if (zone === 'nogo') return 'NO GO'
  if (zone === 'hot') return 'HOT'
  if (zone === 'warm') return 'WARM'
  return 'SAFE'
}

function rosterTitle(p: VictimSim, elapsed: number) {
  if (p.status === 'marked') return 'marked'
  if (p.status === 'lost') return 'lost'
  if (!p.lastKnown) return 'unseen'
  const stale = elapsed - p.lastKnown.t > 25
  return `${zoneLabel(p.lastKnown.zone)}${stale ? ' STALE' : ''}`
}

export function WorldChrome() {
  const phase = useGame((s) => s.phase)
  const tilesReady = useGame((s) => s.tilesReady)
  const zone = useGame((s) => s.sim.robot.zone)
  const playing = phase === 'playing'

  if (!playing) return null
  if (tilesReady && zone !== 'hot' && zone !== 'nogo') return null

  return (
    <div className="world-chrome">
      {!tilesReady && <span className="chip">Loading map</span>}
      {(zone === 'hot' || zone === 'nogo') && (
        <span className={`chip ${zone === 'nogo' ? 'nogo' : 'hot'}`}>{zoneLabel(zone)}</span>
      )}
    </div>
  )
}

export function MastHud({ onMark }: { onMark: () => void }) {
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

  const found = survivors.filter((p) => p.found).length
  const near = survivors.find((p) => p.id === nearestId)
  const canMark = Boolean(near && nearestDist <= CAMPUS.markRange)
  const marked = survivors.find((p) => p.id === lastMarked)
  const aim = near ?? survivors.find((p) => p.status !== 'marked' && p.status !== 'lost')
  const aimX = aim?.x
  const aimZ = aim?.z
  const known = Boolean(aim && aimX !== undefined && aimZ !== undefined)
  const turn = known && aim && aimX !== undefined && aimZ !== undefined ? headingTo(robot.x, robot.z, robot.yaw, aimX, aimZ) : 0
  const aimDist = known && aim && aimX !== undefined && aimZ !== undefined ? Math.hypot(robot.x - aimX, robot.z - aimZ) : 999
  const timeLeft = CAMPUS.timeLimit - elapsed
  const showZone = zone === 'hot' || zone === 'nogo' || hull > 0.35

  return (
    <div className={`mast ${thermal ? 'is-thermal' : ''}`}>
      <header className="mast-top">
        <div className="clock">
          <b className={timeLeft < 60 || zone === 'nogo' ? 'danger' : ''}>{formatTime(elapsed)}</b>
          <span>
            {found}/{survivors.length}
          </span>
        </div>
        {showZone && (
          <div className={`zone-chip ${zone}`}>
            {zoneLabel(zone)}
            {hull > 0.35 && <i className="hull" style={{ width: `${hull * 100}%` }} />}
          </div>
        )}
        <ol className="roster" aria-label="Victims">
          {survivors.map((p, i) => (
            <li
              key={p.id}
              className={p.found ? 'found' : p.status === 'lost' ? 'lost' : p.id === aim?.id ? 'next' : p.status === 'unseen' ? 'unseen' : ''}
              title={`${p.name} · ${rosterTitle(p, elapsed)}`}
            >
              {i + 1}
            </li>
          ))}
        </ol>
      </header>

      {markFlash > 0 && marked && (
        <div className="toast" role="status">
          {marked.name} marked
        </div>
      )}

      <div className="console">
        <div className="console-readout">
          <div className="objective">
            {known && <i className="needle" style={{ transform: `rotate(${(turn * 180) / Math.PI}deg)` }} />}
            <div>
              <strong>{canMark && near ? `Mark ${near.name}` : aim?.name ?? 'Find them'}</strong>
              <span>
                {canMark
                  ? `${nearestDist.toFixed(0)} m`
                  : known && aimDist < 99
                    ? `${aimDist.toFixed(0)} m`
                    : zone === 'nogo'
                      ? 'Turn back'
                      : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="console-actions">
          <button type="button" className={canMark ? 'mark-go' : 'mark-wait'} disabled={!canMark} onClick={onMark}>
            Mark
          </button>
        </div>
      </div>
    </div>
  )
}
