import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { DEPLOY, useGame } from '../game/store'
import { RobotScene } from '../scene/RobotScene'
import { MastHud } from './Hud'
import { OpticalFeed } from './OpticalFeed'

export function PlayPane() {
  const thermal = useGame((s) => s.thermal)
  const playing = useGame((s) => s.phase === 'playing')

  return (
    <>
      <div className="gutter" aria-hidden="true" />
      <section className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}>
        <span className="pane-tag">ROBOT</span>
        <Canvas
          eventPrefix="offset"
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: [DEPLOY.x - 7, 9, DEPLOY.z + 13], fov: 46, near: 0.4, far: 420 }}
          shadows={false}
          dpr={[0.85, 1]}
          gl={{
            antialias: false,
            stencil: false,
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
          }}
          onCreated={({ gl }) => {
            const onLost = (e: Event) => e.preventDefault()
            gl.domElement.addEventListener('webglcontextlost', onLost)
          }}
        >
          <RobotScene />
        </Canvas>
        {playing && <OpticalFeed />}
        {playing && <MastHud />}
      </section>
    </>
  )
}
