import { useEffect, useState } from 'react'
import { hasGoogleKey, headingDelta } from '../game/maps'
import { mastStreetViewArgs, streetViewImageUrl, streetViewMeta } from '../game/google'
import { interiorAt, stillAt } from '../game/interiors'
import { useGame } from '../game/store'

export function OpticalFeed() {
  const thermal = useGame((s) => s.thermal)
  const [src, setSrc] = useState<string | null>(null)
  const [noPano, setNoPano] = useState(false)

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
      setNoPano(false)
      setSrc(
        streetViewImageUrl({
          pano: last.pano,
          heading,
          pitch,
        }),
      )
    }

    const pullMeta = async (lat: number, lon: number, x: number, z: number, heading: number, pitch: number) => {
      if (inflight) return
      inflight = true
      try {
        const meta = await streetViewMeta(lat, lon)
        if (cancelled) return
        if (meta.status !== 'OK' || !meta.pano_id) {
          last.pano = ''
          last.status = 'none'
          last.panoX = x
          last.panoZ = z
          last.heading = heading
          last.pitch = pitch
          const room = interiorAt(x, z)
          setSrc(room ? stillAt(room, x, z) : '/doheny-times-mirror.jpg')
          setNoPano(true)
          return
        }
        last.pano = meta.pano_id
        last.status = 'ok'
        last.panoX = x
        last.panoZ = z
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

  if (!hasGoogleKey()) return null
  if (!src) return null

  return (
    <aside className={`optical ${thermal ? 'is-thermal' : ''} ${noPano ? 'no-pano' : ''}`}>
      <img
        src={src}
        alt={noPano ? 'Licensed interior still' : ''}
        draggable={false}
        onError={(e) => {
          if (!noPano || e.currentTarget.dataset.fallback) return
          e.currentTarget.dataset.fallback = '1'
          const room = interiorAt(useGame.getState().robot.x, useGame.getState().robot.z)
          e.currentTarget.src =
            room?.fallback ??
            'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Doheny_Library_interior.jpg/960px-Doheny_Library_interior.jpg'
        }}
      />
      {noPano ? <CreditChip /> : null}
    </aside>
  )
}

function CreditChip() {
  const x = useGame((s) => s.robot.x)
  const z = useGame((s) => s.robot.z)
  const room = interiorAt(x, z)
  return <span>{room?.credit ?? 'EEJCC / Wikimedia CC BY-SA 4.0'}</span>
}
