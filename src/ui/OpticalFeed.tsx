import { useEffect, useRef, useState } from 'react'
import { hasGoogleKey, headingDelta } from '../game/maps'
import { mastStreetViewArgs, streetViewImageUrl, streetViewMeta } from '../game/google'
import { useGame } from '../game/store'

export function OpticalFeed() {
  const thermal = useGame((s) => s.thermal)
  const [src, setSrc] = useState<string | null>(null)
  const last = useRef({
    heading: 1e9,
    pitch: 1e9,
    pano: '',
    panoX: 1e9,
    panoZ: 1e9,
  })

  useEffect(() => {
    if (!hasGoogleKey()) return

    let cancelled = false
    let inflight = false

    const paint = (heading: number, pitch: number) => {
      last.current.heading = heading
      last.current.pitch = pitch
      setSrc(
        streetViewImageUrl({
          pano: last.current.pano,
          heading,
          pitch,
        }),
      )
    }

    const tick = async () => {
      if (cancelled) return
      const { robot } = useGame.getState()
      const next = mastStreetViewArgs(robot)
      const fromPano = Math.hypot(robot.x - last.current.panoX, robot.z - last.current.panoZ)
      const turn = headingDelta(next.heading, last.current.heading)
      const nod = Math.abs(next.pitch - last.current.pitch)

      if (last.current.pano && (turn >= 6 || nod >= 3)) {
        paint(next.heading, next.pitch)
      }

      if (inflight) return
      if (last.current.pano && fromPano < 10) return

      inflight = true
      try {
        const meta = await streetViewMeta(next.lat, next.lon)
        if (cancelled) return
        if (meta.status !== 'OK' || !meta.pano_id) {
          last.current.pano = ''
          setSrc(null)
          return
        }
        last.current.pano = meta.pano_id
        last.current.panoX = robot.x
        last.current.panoZ = robot.z
        paint(next.heading, next.pitch)
      } catch {
        // keep last frame
      } finally {
        inflight = false
      }
    }

    void tick()
    const id = window.setInterval(() => void tick(), 200)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  if (!src) return null

  return (
    <aside className={`optical ${thermal ? 'is-thermal' : ''}`}>
      <img src={src} alt="" draggable={false} />
    </aside>
  )
}
