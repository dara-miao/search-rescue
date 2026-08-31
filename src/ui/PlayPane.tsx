import type { MutableRefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { InputApi } from '../game/input'
import { DEPLOY, useGame } from '../game/store'
import { RobotScene } from '../scene/RobotScene'
import { AnalogKnob } from './AnalogKnob'
import { MastHud } from './Hud'
import { OpticalFeed } from './OpticalFeed'

export function PlayPane({ input }: { input: MutableRefObject<InputApi | null> }) {
  const thermal = useGame((s) => s.thermal)
  const playing = useGame((s) => s.phase === 'playing')
  const tryMark = useGame((s) => s.tryMark)

  return (
    <>
      <div className="gutter" aria-hidden="true" />
      <section className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}>
        <Canvas
          eventPrefix="offset"
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: [DEPLOY.x - 8, 14, DEPLOY.z + 18], fov: 56, near: 0.8, far: 1100 }}
          dpr={[1, 1]}
          gl={{ antialias: false, powerPreference: 'default', toneMapping: ACESFilmicToneMapping }}
          onCreated={({ gl }) => {
            const onLost = (e: Event) => e.preventDefault()
            gl.domElement.addEventListener('webglcontextlost', onLost)
          }}
        >
          <RobotScene />
        </Canvas>
        {playing && <OpticalFeed />}
        {playing && (
          <MastHud
            onMark={tryMark}
            drive={<AnalogKnob onVector={(x, y, active) => input.current?.setStick(x, y, active)} />}
          />
        )}
      </section>
    </>
  )
}
