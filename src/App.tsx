import { Canvas } from '@react-three/fiber'
import { useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useSimLoop } from './game/useSimLoop'
import { useGame } from './game/store'
import { MissionScene } from './scene/MissionScene'
import { Briefing, EndCard } from './ui/Overlays'
import { AnalogKnob } from './ui/AnalogKnob'
import { Hud } from './ui/Hud'
import { OpticalFeed } from './ui/OpticalFeed'
import { hasGoogleTiles } from './game/maps'

function WorldPaneLabel({ playing }: { playing: boolean }) {
  const tilesReady = useGame((s) => s.tilesReady)
  const waiting = playing && hasGoogleTiles() && !tilesReady
  return (
    <div className="pane-label">
      {waiting ? 'WORLD · LOADING MAP' : hasGoogleTiles() ? 'WORLD · MAP' : 'WORLD'}
    </div>
  )
}

export default function App() {
  const phase = useGame((s) => s.phase)
  const thermal = useGame((s) => s.thermal)
  const start = useGame((s) => s.start)
  const toggleThermal = useGame((s) => s.toggleThermal)
  const tryMark = useGame((s) => s.tryMark)
  const hydrateGoogle = useGame((s) => s.hydrateGoogle)
  const moving = useGame((s) => s.robot.moving)
  const elapsed = useGame((s) => s.elapsed)
  const playing = phase === 'playing'
  const input = useSimLoop(playing)
  const showNudge = playing && !moving && elapsed < 8

  useEffect(() => {
    void hydrateGoogle()
  }, [hydrateGoogle])

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [playing])

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
          <WorldPaneLabel playing={playing} />
        </section>

        <div className="gutter" aria-hidden="true" />

        <section className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}>
          <Canvas
            camera={{ position: [0, 1.2, 18], fov: 64, near: 0.08, far: 480 }}
            dpr={[1, 1.6]}
            gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
          >
            <MissionScene variant="robot" />
          </Canvas>
          {playing && <OpticalFeed />}
          <div className="pane-label right">{thermal ? 'ROBOT THERMAL' : 'ROBOT'}</div>
        </section>
      </main>

      {phase === 'briefing' && <Briefing onDeploy={start} />}
      <EndCard />
      {playing && <Hud onMark={tryMark} onThermal={toggleThermal} />}
      {playing && (
        <div className="knobs">
          <AnalogKnob
            label="DRIVE"
            hint="point to walk"
            className={`knob-move ${showNudge ? 'nudge' : ''}`}
            onVector={(x, y, active) => input.current?.setStick(x, y, active)}
          />
        </div>
      )}
    </div>
  )
}
