import { useEffect, useState } from 'react'
import { hasGoogleKey, headingDelta } from '../game/maps'
import { mastStreetViewArgs, streetViewImageUrl, streetViewMeta } from '../game/google'
import { useGame } from '../game/store'

const TIMES_MIRROR = '/doheny-times-mirror.jpg'
const TIMES_MIRROR_WIKI =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Doheny_Library_interior.jpg/960px-Doheny_Library_interior.jpg'

export function OpticalFeed() {
  const thermal = useGame((s) => s.thermal)
  const [src, setSrc] = useState(TIMES_MIRROR)
  const [showingStill, setShowingStill] = useState(true)

  useEffect(() => {
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
      setShowingStill(false)
      setSrc(
        streetViewImageUrl({
          pano: last.pano,
          heading,
          pitch,
        }),
      )
    }

    const showStill = (x: number, z: number, heading: number, pitch: number) => {
      last.pano = ''
      last.status = 'none'
      last.panoX = x
      last.panoZ = z
      last.heading = heading
      last.pitch = pitch
      setSrc(TIMES_MIRROR)
      setShowingStill(true)
    }

    const pullMeta = async (lat: number, lon: number, x: number, z: number, heading: number, pitch: number) => {
      if (inflight) return
      inflight = true
      try {
        const meta = await streetViewMeta(lat, lon)
        if (cancelled) return
        if (meta.status !== 'OK' || !meta.pano_id) {
          showStill(x, z, heading, pitch)
          return
        }
        last.pano = meta.pano_id
        last.status = 'ok'
        last.panoX = x
        last.panoZ = z
        paint(heading, pitch)
      } catch {
        if (!cancelled) showStill(x, z, heading, pitch)
      } finally {
        inflight = false
      }
    }

    const consider = () => {
      if (cancelled || document.hidden) return
      const { robot, phase } = useGame.getState()
      if (phase !== 'playing') return

      const next = mastStreetViewArgs(robot)
      const fromPano = Math.hypot(robot.x - last.panoX, robot.z - last.panoZ)
      const turn = headingDelta(next.heading, last.heading)
      const nod = Math.abs(next.pitch - last.pitch)
      const walked = fromPano >= 10
      const aimed = turn >= 8 || nod >= 4
      const still = !robot.moving && !aimed && !walked

      if (still && last.status !== 'unknown') return

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
  }, [])

  return (
    <aside className={`optical ${thermal ? 'is-thermal' : ''} ${showingStill ? 'no-pano' : ''}`}>
      <img
        src={src}
        alt={showingStill ? 'Times-Mirror reading room, Doheny Memorial Library' : ''}
        draggable={false}
        onError={(e) => {
          const el = e.currentTarget
          const step = el.dataset.fallback
          if (!step) {
            el.dataset.fallback = 'local'
            el.src = TIMES_MIRROR
            setSrc(TIMES_MIRROR)
            setShowingStill(true)
            return
          }
          if (step === 'local') {
            el.dataset.fallback = 'wiki'
            el.src = TIMES_MIRROR_WIKI
            setSrc(TIMES_MIRROR_WIKI)
            setShowingStill(true)
          }
        }}
      />
      {showingStill ? <span>EEJCC / Wikimedia CC BY-SA 4.0</span> : null}
    </aside>
  )
}
