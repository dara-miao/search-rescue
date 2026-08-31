import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { useSimLoop } from '../game/useSimLoop'
import { useGame } from '../game/store'
import { RobotScene } from '../scene/RobotScene'
import { AnalogKnob } from './AnalogKnob'
import { MastHud } from './Hud'
import { OpticalFeed } from './OpticalFeed'

export function PlayPane() {
  const thermal = useGame((s) => s.thermal)
  const playing = useGame((s) => s.phase === 'playing')
  const tryMark = useGame((s) => s.tryMark)
  const input = useSimLoop(playing)

  return (
    <>
      <div className="gutter" aria-hidden="true" />
      <section className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}>
        <Canvas
          camera={{ position: [0, 1.2, 18], fov: 64, near: 0.08, far: 1100 }}
          dpr={[1, 1.35]}
          gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
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
