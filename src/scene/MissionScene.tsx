import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Campus } from './Campus'
import { Fire } from './Fire'
import { GoogleTiles } from './GoogleTiles'
import { Ingress } from './Ingress'
import { LastKnowns } from './LastKnowns'
import { Lights } from './Lights'
import { People } from './People'
import { Places } from './Places'
import { Robot } from './Robot'
import { MastRig, WorldRig } from './Rigs'
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
  const googleWorld = variant === 'world' && hasGoogleTiles()
  const photoreal = googleWorld && tilesReady
  const quiet = cinematic

  return (
    <>
      <Lights thermal={thermal} photoreal={photoreal || quiet} />
      {googleWorld && <GoogleTiles variant="world" />}
      {!quiet && (
        <Campus thermal={thermal} photoreal={photoreal} cutaway={variant === 'world' && !photoreal} />
      )}
      {!quiet && variant === 'world' && !photoreal && <Places thermal={thermal} />}
      {!quiet && variant === 'world' && <Ingress />}
      {!quiet && <Fire thermal={thermal} />}
      {!quiet && <People thermal={thermal} world={variant === 'world'} />}
      {variant === 'world' && !quiet && <LastKnowns />}
      {!quiet && <Robot variant={variant} />}
      {variant === 'world' ? <WorldRig cinematic={cinematic} /> : <MastRig />}
      {variant === 'robot' && thermal && (
        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={1.4} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.85} />
        </EffectComposer>
      )}
    </>
  )
}
