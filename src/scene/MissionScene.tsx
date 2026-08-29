import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Campus } from './Campus'
import { Fire } from './Fire'
import { Ingress } from './Ingress'
import { Lights } from './Lights'
import { People } from './People'
import { Places } from './Places'
import { Robot } from './Robot'
import { MastRig, WorldRig } from './Rigs'
import { useGame } from '../game/store'

export function MissionScene({
  variant,
  cinematic = false,
}: {
  variant: 'world' | 'robot'
  cinematic?: boolean
}) {
  const thermal = useGame((s) => s.thermal && variant === 'robot')

  return (
    <>
      <Lights thermal={thermal} />
      <Campus thermal={thermal} cutaway={variant === 'world'} />
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
