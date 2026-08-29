import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Campus } from './Campus'
import { Fire } from './Fire'
import { GoogleTiles } from './GoogleTiles'
import { Ingress } from './Ingress'
import { Labels } from './Labels'
import { Lights } from './Lights'
import { People } from './People'
import { Places } from './Places'
import { Robot } from './Robot'
import { MastRig, WorldRig } from './Rigs'
import { insideInterior } from '../game/interiors'
import { hasGoogleTiles } from '../game/maps'
import { useGame } from '../game/store'

export function MissionScene({
  variant,
  cinematic = false,
}: {
  variant: 'world' | 'robot'
  cinematic?: boolean
}) {
  const thermal = useGame((s) => s.thermal && variant === 'robot')
  const tilesReady = useGame((s) => s.tilesReady)
  const robotX = useGame((s) => s.robot.x)
  const robotZ = useGame((s) => s.robot.z)
  const interior = Boolean(insideInterior(robotX, robotZ))
  const photoreal = variant === 'world' && hasGoogleTiles() && tilesReady && !interior

  return (
    <>
      <Lights thermal={thermal} photoreal={photoreal} interior={interior} />
      {variant === 'world' && hasGoogleTiles() && !interior && <GoogleTiles variant={variant} />}
      <Campus thermal={thermal} photoreal={photoreal} cutaway={variant === 'world'} />
      <Labels thermal={thermal} />
      <Places thermal={thermal} />
      <Ingress />
      <Fire thermal={thermal} />
      <People thermal={thermal} />
      <Robot variant={variant} />
      {variant === 'world' ? <WorldRig cinematic={cinematic} /> : <MastRig />}
      {variant === 'robot' && (
        <EffectComposer enableNormalPass={false}>
          <Bloom
            intensity={thermal ? 1.4 : 0.85}
            luminanceThreshold={thermal ? 0.2 : 0.62}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={thermal ? 0.85 : 0.45} />
        </EffectComposer>
      )}
    </>
  )
}
