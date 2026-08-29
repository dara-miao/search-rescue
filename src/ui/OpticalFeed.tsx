import { useEffect, useState } from 'react'
import { hasGoogleKey, headingDelta } from '../game/maps'
import { mastStreetViewArgs, streetViewImageUrl, streetViewMeta } from '../game/google'
import { insideInterior } from '../game/interiors'
import { useGame } from '../game/store'

export function OpticalFeed() {
  const thermal = useGame((s) => s.thermal)
  const x = useGame((s) => s.robot.x)
  const z = useGame((s) => s.robot.z)
  const room = insideInterior(x, z)
  const [streetSrc, setStreetSrc] = useState<string | null>(null)

  useEffect(() => {
    if (room?.id) return
    if (!hasGoogleKey()) return

    let cancelled = false
    let inflight = false
    const last = {
      heading: 1e9,
      pitch: 1e9,
      pano: '',
      panoX: 1e9,
      panoZ: 1e9,
      status: 'unknown' as 'ok' | 'none' | 'unknown',
    }

    const paint = (heading: number, pitch: number) => {
      last.heading = heading
      last.pitch = pitch
      setStreetSrc(
        streetViewImageUrl({
          pano: last.pano,
          heading,
          pitch,
        }),
      )
    }

    const pullMeta = async (lat: number, lon: number, rx: number, rz: number, heading: number, pitch: number) => {
      if (inflight) return
      inflight = true
      try {
        const meta = await streetViewMeta(lat, lon)
        if (cancelled) return
        if (meta.status !== 'OK' || !meta.pano_id) {
          last.pano = ''
          last.status = 'none'
          last.panoX = rx
          last.panoZ = rz
          last.heading = heading
          last.pitch = pitch
          return
        }
        last.pano = meta.pano_id
        last.status = 'ok'
        last.panoX = rx
        last.panoZ = rz
        paint(heading, pitch)
      } catch {
        // keep last frame
      } finally {
        inflight = false
      }
    }

    const consider = () => {
      if (cancelled || document.hidden) return
      const { robot, phase } = useGame.getState()
      if (phase !== 'playing') return
      if (insideInterior(robot.x, robot.z)) return

      const next = mastStreetViewArgs(robot)
      const fromPano = Math.hypot(robot.x - last.panoX, robot.z - last.panoZ)
      const turn = headingDelta(next.heading, last.heading)
      const nod = Math.abs(next.pitch - last.pitch)
      const walked = fromPano >= 10
      const aimed = turn >= 8 || nod >= 4
      const idle = !robot.moving && !aimed && !walked

      if (idle && last.status !== 'unknown') return
      if (last.pano && aimed) paint(next.heading, next.pitch)
      if (inflight) return
      if (last.status === 'unknown' || walked) {
        void pullMeta(next.lat, next.lon, robot.x, robot.z, next.heading, next.pitch)
      }
    }

    const unsub = useGame.subscribe(consider)
    document.addEventListener('visibilitychange', consider)
    consider()
    return () => {
      cancelled = true
      unsub()
      document.removeEventListener('visibilitychange', consider)
    }
  }, [room?.id])

  if (room) {
    return (
      <aside className={`optical fill ${thermal ? 'is-thermal' : ''} no-pano`}>
        <img
          src={room.still}
          alt={room.title}
          draggable={false}
          onError={(e) => {
            if (e.currentTarget.dataset.fallback) return
            e.currentTarget.dataset.fallback = '1'
            e.currentTarget.src = room.fallback
          }}
        />
        <div className="still-marks">
          {room.mark ? <b className="evac">{room.mark}</b> : null}
          {room.labels.map((label) => (
            <b key={label.text} style={{ color: label.color }}>
              {label.text}
            </b>
          ))}
        </div>
        <span>{room.credit}</span>
      </aside>
    )
  }

  if (!hasGoogleKey() || !streetSrc) return null

  return (
    <aside className={`optical ${thermal ? 'is-thermal' : ''}`}>
      <img src={streetSrc} alt="" draggable={false} />
    </aside>
  )
}
