import { PerspectiveCamera } from '@react-three/drei'
import { hasGoogleTiles } from '../game/maps'
import { useGame } from '../game/store'
import { Campus } from './Campus'
import { Fire } from './Fire'
import { GoogleTiles } from './GoogleTiles'
import { Robot } from './Robot'
import { WorldRig } from './Rigs'

function Sky() {
  return (
    <>
      <color attach="background" args={['#7ea4c8']} />
      <fog attach="fog" args={['#8aabcc', 180, 620]} />
      <ambientLight intensity={0.85} color="#fff4e6" />
      <hemisphereLight args={['#c8dff5', '#6a5a48', 1.1]} />
      <directionalLight position={[-40, 80, 30]} intensity={1.35} color="#fff1d6" />
    </>
  )
}

export function WorldView({ cinematic }: { cinematic: boolean }) {
  const playing = useGame((s) => s.phase === 'playing')
  const tilesReady = useGame((s) => s.tilesReady)
  const google = hasGoogleTiles()
  const photoreal = google && tilesReady
  return (
    <>
      <PerspectiveCamera makeDefault position={[200, 96, 90]} fov={46} near={0.8} far={720} />
      <Sky />
      {google && <GoogleTiles variant="world" />}
      {!photoreal && <Campus thermal={false} photoreal={false} cutaway />}
      {!photoreal && <Fire thermal={false} />}
      {playing && <Robot variant="world" />}
      <WorldRig cinematic={cinematic} />
    </>
  )
}
