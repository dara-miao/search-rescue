import { hasGoogleTiles } from '../game/maps'
import { useGame } from '../game/store'
import { GoogleTiles } from './GoogleTiles'
import { Robot } from './Robot'
import { WorldRig } from './Rigs'

function Sky() {
  return (
    <>
      <color attach="background" args={['#7ea4c8']} />
      <fog attach="fog" args={['#8aabcc', 80, 420]} />
      <ambientLight intensity={0.85} color="#fff4e6" />
      <hemisphereLight args={['#c8dff5', '#6a5a48', 1.1]} />
      <directionalLight position={[-40, 80, 30]} intensity={1.35} color="#fff1d6" />
    </>
  )
}

export function WorldView({ cinematic }: { cinematic: boolean }) {
  const playing = useGame((s) => s.phase === 'playing')
  return (
    <>
      <Sky />
      {hasGoogleTiles() && <GoogleTiles variant="world" />}
      {playing && <Robot variant="world" />}
      <WorldRig cinematic={cinematic} />
    </>
  )
}
