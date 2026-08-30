import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useSimLoop } from './game/useSimLoop'
import { useGame } from './game/store'
import { MissionScene } from './scene/MissionScene'
import { Briefing, EndCard } from './ui/Overlays'
import { AnalogKnob } from './ui/AnalogKnob'
import { MastHud, WorldChrome } from './ui/Hud'
import { OpticalFeed } from './ui/OpticalFeed'

export default function App() {
  const phase = useGame((s) => s.phase)
  const thermal = useGame((s) => s.thermal)
  const start = useGame((s) => s.start)
  const tryMark = useGame((s) => s.tryMark)
  const hydrateGoogle = useGame((s) => s.hydrateGoogle)
  const playing = phase === 'playing'
  const input = useSimLoop(playing)

  useEffect(() => {
    void hydrateGoogle()
  }, [hydrateGoogle])

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [playing])

  if (phase === 'briefing') {
    return (
      <div className="app">
        <div className="onboard-stage">
          <Canvas
            camera={{ position: [190, 22, 80], fov: 40, near: 0.4, far: 1600 }}
            shadows
            dpr={[1, 1.7]}
            gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
          >
            <MissionScene variant="world" cinematic />
          </Canvas>
          <Briefing onDeploy={start} />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <main className={`split ${thermal ? 'thermal' : ''}`}>
        <section className="pane">
          <Canvas
            camera={{ position: [40, 96, 70], fov: 46, near: 0.4, far: 1600 }}
            shadows
            dpr={[1, 1.7]}
            gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
          >
            <MissionScene variant="world" cinematic={!playing} />
          </Canvas>
          <WorldChrome />
        </section>

        <div className="gutter" aria-hidden="true" />

        <section className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}>
          <Canvas
            camera={{ position: [0, 1.2, 18], fov: 64, near: 0.08, far: 1100 }}
            dpr={[1, 1.6]}
            gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
          >
            <MissionScene variant="robot" />
          </Canvas>
          {playing && <OpticalFeed />}
          {playing && (
            <MastHud
              onMark={tryMark}
              drive={<AnalogKnob onVector={(x, y, active) => input.current?.setStick(x, y, active)} />}
            />
          )}
        </section>
      </main>

      <EndCard />
    </div>
  )
}
