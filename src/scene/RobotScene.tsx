import { PerspectiveCamera } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { DEPLOY } from '../game/store'
import { useGame } from '../game/store'
import { Campus } from './Campus'
import { Fire } from './Fire'
import { Lights } from './Lights'
import { People } from './People'
import { Robot } from './Robot'
import { MastRig } from './Rigs'

export function RobotScene() {
  const thermal = useGame((s) => s.thermal)

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[DEPLOY.x - 8, 14, DEPLOY.z + 18]}
        fov={56}
        near={0.8}
        far={1100}
      />
      <Lights thermal={thermal} />
      <Campus thermal={thermal} />
      <Fire thermal={thermal} />
      <People thermal={thermal} />
      <Robot variant="robot" />
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
