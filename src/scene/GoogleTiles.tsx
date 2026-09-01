import { TilesPlugin, TilesRenderer, TilesAttributionOverlay } from '3d-tiles-renderer/r3f'
import type { TilesRenderer as TilesImpl } from '3d-tiles-renderer/three'
import { ReorientationPlugin, UpdateOnChangePlugin } from '3d-tiles-renderer/plugins'
import { useRef } from 'react'
import type { Group, Object3D } from 'three'
import { heightAt } from '../game/ground'
import { GOOGLE_MAPS_KEY, TOMMY_GEO } from '../game/maps'
import { DEPLOY, useGame } from '../game/store'
import { disposeTileScene, isRoofHit, measureRoofCentroid, probeTileGround, registerTileScene } from '../game/tilesCollide'
import { DOHENY } from '../game/world'

function sceneFromLoad(payload: unknown): Object3D | null {
  if (!payload || typeof payload !== 'object') return null
  const rec = payload as { scene?: Object3D; isObject3D?: boolean }
  if (rec.scene) return rec.scene
  if (rec.isObject3D) return payload as Object3D
  return null
}

const LAT = (TOMMY_GEO.lat * Math.PI) / 180
const LON = (TOMMY_GEO.lon * Math.PI) / 180
const GOOGLE_HOST = 'https://tile.googleapis.com'
const GOOGLE_ROOT = `${GOOGLE_HOST}/v1/3dtiles/root.json`

let sharedSession: string | null = null

function sessionFromUri(uri: string) {
  try {
    return new URL(uri, GOOGLE_HOST).searchParams.get('session')
  } catch {
    return null
  }
}

function sessionFromTileset(json: { root?: unknown }) {
  let token: string | null = null
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object' || token) return
    const rec = node as { content?: { uri?: string }; children?: unknown[] }
    if (rec.content?.uri) token = sessionFromUri(rec.content.uri)
    rec.children?.forEach(walk)
  }
  walk(json.root)
  return token
}

function rememberSession(token: string | null) {
  if (token) sharedSession = token
}

function isRootTileset(pathname: string) {
  return pathname.endsWith('/root.json')
}

function toGoogleTilesUrl(raw: string, apiToken: string) {
  const href = String(raw)
  try {
    const incoming = new URL(href, typeof window !== 'undefined' ? window.location.origin : GOOGLE_HOST)
    if (!incoming.pathname.startsWith('/v1/3dtiles')) return href

    const google = new URL(`${GOOGLE_HOST}${incoming.pathname}${incoming.search}`)
    const root = isRootTileset(incoming.pathname)
    if (!root) rememberSession(google.searchParams.get('session'))
    google.searchParams.set('key', apiToken)
    if (root) {
      google.searchParams.delete('session')
    } else if (sharedSession && !google.searchParams.has('session')) {
      google.searchParams.set('session', sharedSession)
    }
    return google.toString()
  } catch {
    return href
  }
}

class GooglePhotorealTiles {
  name = 'GOOGLE_PHOTOREAL'
  apiToken: string

  constructor({ apiToken }: { apiToken: string }) {
    this.apiToken = apiToken
  }

  preprocessURL(url: string) {
    return toGoogleTilesUrl(url, this.apiToken)
  }

  async fetchData(url: string, options: RequestInit) {
    const href = toGoogleTilesUrl(url, this.apiToken)
    const res = await fetch(href, options)
    const type = res.headers.get('content-type') ?? ''
    if (res.ok && type.includes('json')) {
      try {
        const json = (await res.clone().json()) as { root?: unknown; session?: string }
        rememberSession(json.session ?? sessionFromTileset(json))
      } catch {
        // binary or empty body — ignore
      }
    }
    return res
  }
}

/** WGS84 ellipsoid height at Tommy — LA geoid is ~−35 m on a ~56 m campus. */
const TOMMY_ELLIPSOID_M = 22

let alignTimer = 0

function snapTilesToCampus(align: Group | null) {
  if (!align) return
  align.updateMatrixWorld(true)
  const roof = measureRoofCentroid(DOHENY.cx, DOHENY.cz)
  if (roof) {
    const dx = DOHENY.cx - roof.x
    const dz = DOHENY.cz - roof.z
    if (Math.hypot(dx, dz) > 1.4) {
      align.position.x += dx
      align.position.z += dz
      align.updateMatrixWorld(true)
    }
  }
  const probes: Array<[number, number]> = [
    [0, 0],
    [DEPLOY.x, DEPLOY.z],
    [111.4, 48.2],
  ]
  let lift = 0
  let n = 0
  for (const [x, z] of probes) {
    const tileY = probeTileGround(x, z)
    const dem = heightAt(x, z)
    if (tileY == null || isRoofHit(tileY, dem)) continue
    lift += dem - tileY
    n += 1
  }
  if (n && Math.abs(lift / n) > 0.3) {
    align.position.y += lift / n
    align.updateMatrixWorld(true)
  }
}

export function GoogleTiles({
  variant,
}: {
  variant: 'world' | 'robot'
}) {
  const key = GOOGLE_MAPS_KEY
  const setTilesReady = useGame((s) => s.setTilesReady)
  const align = useRef<Group>(null)
  const tuneQueues = (tiles: TilesImpl | null) => {
    if (!tiles) return
    tiles.downloadQueue.maxJobsPerOrigin = 2
    tiles.parseQueue.maxJobs = 1
    tiles.loadSiblings = false
    tiles.errorTarget = variant === 'robot' ? 16 : 34
    tiles.lruCache.minSize = 80
    tiles.lruCache.maxSize = 160
    tiles.lruCache.minBytesSize = 48 * 1024 * 1024
    tiles.lruCache.maxBytesSize = 96 * 1024 * 1024
    tiles.lruCache.unloadPercent = 0.25
  }
  if (!key) return null

  return (
    <group ref={align}>
      <group rotation={[0, Math.PI, 0]}>
      <TilesRenderer
        ref={tuneQueues}
        url={`${GOOGLE_ROOT}?key=${key}`}
        errorTarget={variant === 'robot' ? 16 : 34}
        onLoadModel={(payload: unknown) => {
          setTilesReady(true)
          const scene = sceneFromLoad(payload)
          if (scene) registerTileScene(scene)
          window.clearTimeout(alignTimer)
          alignTimer = window.setTimeout(() => snapTilesToCampus(align.current), 1200)
        }}
        onDisposeModel={(payload: unknown) => {
          const scene = sceneFromLoad(payload)
          if (scene) disposeTileScene(scene)
        }}
      >
        <TilesPlugin plugin={GooglePhotorealTiles} args={[{ apiToken: key }]} />
        <TilesPlugin
          plugin={ReorientationPlugin}
          args={[
            {
              lat: LAT,
              lon: LON,
              height: TOMMY_ELLIPSOID_M,
              recenter: true,
            },
          ]}
        />
        <TilesPlugin plugin={UpdateOnChangePlugin} />
        {variant === 'world' && (
          <TilesAttributionOverlay
            style={{
              position: 'absolute',
              left: 12,
              bottom: 44,
              color: '#d8ccb6',
              fontSize: '10px',
              pointerEvents: 'none',
            }}
          />
        )}
      </TilesRenderer>
      </group>
    </group>
  )
}
