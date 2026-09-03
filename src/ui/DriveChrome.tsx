import { AnalogKnob } from './AnalogKnob'
import { attribution } from '../data/site'
import { useDrive } from '../drive/store'

export function DriveChrome() {
  const speed = useDrive((s) => s.speed)
  const setStick = useDrive((s) => s.setStick)

  return (
    <>
      <aside className="stage0 drive-hud">
        <p className="stage0-kicker">Stage 1 · movement</p>
        <h1>South lawn</h1>
        <dl>
          <div>
            <dt>Speed</dt>
            <dd>{Math.abs(speed).toFixed(1)} m/s · ramp to 6</dd>
          </div>
          <div>
            <dt>Drive</dt>
            <dd>W / S throttle · A / D steer</dd>
          </div>
          <div>
            <dt>Look</dt>
            <dd>Q / E or drag · scroll zoom 8 to 25 m</dd>
          </div>
        </dl>
        <p className="stage0-note">
          Night on Alumni Park. Chase camera, 25° pitch. The hull stops on the OSM outline. You
          cannot go inside.
        </p>
        <p className="stage0-license">{attribution()}</p>
      </aside>
      <div className="drive-dock">
        <AnalogKnob onVector={(x, y, on) => setStick(x, y, on)} />
      </div>
    </>
  )
}
