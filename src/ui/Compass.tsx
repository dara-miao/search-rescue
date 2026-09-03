import { useDrive } from '../drive/store'
import { cardinal, dohenyOffset, headingDeg, offsetTo } from '../run/heading'
import { nearestPlayOpening } from '../run/opening'
import { useRun } from '../run/store'

export function Compass() {
  const yaw = useDrive((s) => s.yaw)
  const x = useDrive((s) => s.x)
  const z = useDrive((s) => s.z)
  const cells = useRun((s) => s.cells)
  const extractions = useRun((s) => s.extractions)
  const victims = useRun((s) => s.victims)
  const deg = headingDeg(yaw)
  const pip = (dohenyOffset(x, z, yaw) * 180) / Math.PI
  const near = nearestPlayOpening(x, z, { cells, extractions, victims })
  const open = near ? (offsetTo(x, z, yaw, near.ext.x, near.ext.z) * 180) / Math.PI : null

  return (
    <div className="compass" role="meter" aria-label={`Heading ${cardinal(yaw)}`} aria-valuenow={Math.round(deg)}>
      <div className="compass-rose" style={{ transform: `rotate(${-deg}deg)` }}>
        <span className="c-n">N</span>
        <span className="c-e">E</span>
        <span className="c-s">S</span>
        <span className="c-w">W</span>
      </div>
      <i className="compass-notch" />
      <b className="compass-pip" style={{ transform: `rotate(${pip}deg)` }} title="Doheny" />
      {open != null ? (
        <b className="compass-pip open" style={{ transform: `rotate(${open}deg)` }} title="Nearest opening" />
      ) : null}
      <em>{cardinal(yaw)}</em>
    </div>
  )
}
