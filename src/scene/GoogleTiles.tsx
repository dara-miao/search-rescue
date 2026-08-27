import { TilesPlugin, TilesRenderer, TilesAttributionOverlay } from '3d-tiles-renderer/r3f'
import { ReorientationPlugin, TilesFadePlugin, UpdateOnChangePlugin } from '3d-tiles-renderer/plugins'
import { GOOGLE_MAPS_KEY, TOMMY_GEO } from '../game/maps'
import { useGame } from '../game/store'

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

export function GoogleTiles({
  variant,
}: {
  variant: 'world' | 'robot'
}) {
  const key = GOOGLE_MAPS_KEY
  const setTilesReady = useGame((s) => s.setTilesReady)
  if (!key) return null

  return (
    <group rotation={[0, Math.PI, 0]}>
      <TilesRenderer
        url={`${GOOGLE_ROOT}?key=${key}`}
        errorTarget={variant === 'robot' ? 6 : 10}
        onLoadModel={() => setTilesReady(true)}
      >
        <TilesPlugin plugin={GooglePhotorealTiles} args={[{ apiToken: key }]} />
        <TilesPlugin
          plugin={ReorientationPlugin}
          args={[
            {
              lat: LAT,
              lon: LON,
              height: 28,
              recenter: true,
            },
          ]}
        />
        <TilesPlugin plugin={UpdateOnChangePlugin} />
        <TilesPlugin plugin={TilesFadePlugin} />
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
  )
}
