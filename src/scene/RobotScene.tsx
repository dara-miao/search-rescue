import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useGame } from '../game/store'
import { Campus } from './Campus'
import { Fire } from './Fire'
import { Lights } from './Lights'
import { People } from './People'
import { Robot } from './Robot'
import { MastRig } from './Rigs'
import { Trail } from './Trail'

export function RobotScene() {
  const thermal = useGame((s) => s.thermal)

  return (
    <>
      <Lights thermal={thermal} />
      <Campus thermal={thermal} />
      <Fire thermal={thermal} />
      <People thermal={thermal} />
      <Robot variant="robot" />
      <Trail />
      <MastRig />
      {thermal && (
        <EffectComposer enableNormalPass={false}>
          <Bloom intensity={1.4} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.85} />
        </EffectComposer>
      )}
    </>
  )
}
