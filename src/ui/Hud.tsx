import { CAMPUS } from '../game/world'
import { useGame } from '../game/store'
import type { HeatZone, VictimSim } from '../sim/types'

function formatTime(seconds: number) {
  const left = Math.max(0, CAMPUS.timeLimit - seconds)
  const m = Math.floor(left / 60)
  const s = Math.floor(left % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
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

  return (
    <div className="world-chrome">
      <span className="chip">WORLD</span>
      {!tilesReady && <span className="chip">Loading map</span>}
      {(zone === 'hot' || zone === 'nogo') && (
        <span className={`chip ${zone === 'nogo' ? 'nogo' : 'hot'}`}>{zoneLabel(zone)}</span>
      )}
    </div>
  )
}

export function MastHud() {
  const thermal = useGame((s) => s.thermal)
  const elapsed = useGame((s) => s.elapsed)
  const survivors = useGame((s) => s.survivors)
  const nearestId = useGame((s) => s.nearestId)
  const lastMarked = useGame((s) => s.lastMarked)
  const markFlash = useGame((s) => s.markFlash)
  const zone = useGame((s) => s.sim.robot.zone)
  const hull = useGame((s) => s.sim.robot.hull)
  const narration = useGame((s) => s.narration)

  const found = survivors.filter((p) => p.found).length
  const marked = survivors.find((p) => p.id === lastMarked)
  const aim = survivors.find((p) => p.id === nearestId) ?? survivors.find((p) => p.status !== 'marked' && p.status !== 'lost')
  const timeLeft = CAMPUS.timeLimit - elapsed
  const showZone = zone === 'hot' || zone === 'nogo' || hull > 0.35

  return (
    <div className={`mast ${thermal ? 'is-thermal' : ''}`}>
      <header className="mast-top">
        <div className="clock">
          <b className={timeLeft < 60 || zone === 'nogo' ? 'danger' : ''}>{formatTime(elapsed)}</b>
          <span>
            {found}/{survivors.length} marked
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

      <div className="console watch">
        <p className="watch-kicker">{thermal ? 'Thermal' : 'Robot'}</p>
        <p className="watch-line">{narration || 'The robot is on the west lawn.'}</p>
      </div>
    </div>
  )
}
