import { CAMPUS } from '../game/world'
import { useGame } from '../game/store'

function formatTime(seconds: number) {
  const left = Math.max(0, CAMPUS.timeLimit - seconds)
  const m = Math.floor(left / 60)
  const s = Math.floor(left % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function headingTo(
  fromX: number,
  fromZ: number,
  yaw: number,
  toX: number,
  toZ: number,
) {
  const want = Math.atan2(toX - fromX, -(toZ - fromZ))
  let delta = want - yaw
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

export function Hud({
  onMark,
  onThermal,
}: {
  onMark: () => void
  onThermal: () => void
}) {
  const thermal = useGame((s) => s.thermal)
  const elapsed = useGame((s) => s.elapsed)
  const survivors = useGame((s) => s.survivors)
  const nearestId = useGame((s) => s.nearestId)
  const nearestDist = useGame((s) => s.nearestDist)
  const lastMarked = useGame((s) => s.lastMarked)
  const markFlash = useGame((s) => s.markFlash)
  const moving = useGame((s) => s.robot.moving)
  const robot = useGame((s) => s.robot)

  const found = survivors.filter((p) => p.found).length
  const near = survivors.find((p) => p.id === nearestId)
  const objective = survivors.find((p) => !p.found) ?? near
  const canMark = Boolean(near && !near.found && nearestDist <= CAMPUS.markRange)
  const marked = survivors.find((p) => p.id === lastMarked)
  const started = moving || elapsed > 6
  const aim = canMark ? near : objective
  const turn = aim ? headingTo(robot.x, robot.z, robot.yaw, aim.x, aim.z) : 0
  const aimDist = aim
    ? Math.hypot(robot.x - aim.x, robot.z - aim.z)
    : nearestDist

  return (
    <div className="hud">
      <div className="meter">
        <span className={elapsed > CAMPUS.timeLimit - 60 ? 'danger' : ''}>{formatTime(elapsed)}</span>
        <i />
        <span>
          {found}/{survivors.length}
        </span>
      </div>

      <div className="ticks" aria-label="Victims">
        {survivors.map((p, i) => (
          <span key={p.id} className={p.found ? 'found' : p.id === objective?.id ? 'next' : ''}>
            {i + 1}
          </span>
        ))}
      </div>

      {canMark && near ? (
        <button type="button" className="mark-go" onClick={onMark}>
          Mark {near.name}
        </button>
      ) : (
        <div className="objective">
          {started && aim && (
            <i className="needle" style={{ transform: `rotate(${(turn * 180) / Math.PI}deg)` }} />
          )}
          <span>
            {!started
              ? 'West door is ahead'
              : aim
                ? `${aim.name} \u00b7 ${aim.note} \u00b7 ${aimDist.toFixed(0)}m`
                : 'Sweep the quad'}
          </span>
        </div>
      )}

      {markFlash > 0 && marked && (
        <div className="toast">
          {marked.name} marked
          {found < survivors.length ? ` \u00b7 ${survivors.length - found} left` : ''}
        </div>
      )}

      <button type="button" className={`heat ${thermal ? 'on' : ''}`} onClick={onThermal}>
        {thermal ? 'Thermal on' : 'Thermal'}
      </button>
    </div>
  )
}
