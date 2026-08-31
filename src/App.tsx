import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useState } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useGame } from './game/store'
import { WorldView } from './scene/WorldView'
import { Briefing, EndCard } from './ui/Overlays'
import { WorldChrome } from './ui/Hud'

const PlayPane = lazy(() => import('./ui/PlayPane').then((m) => ({ default: m.PlayPane })))

export default function App() {
  const phase = useGame((s) => s.phase)
  const start = useGame((s) => s.start)
  const briefingStep = useGame((s) => s.briefingStep)
  const briefing = phase === 'briefing'
  const [playReady, setPlayReady] = useState(false)

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [phase])

  // First briefing beat stays WORLD-tiles only. After Next, warm the robot
  // canvas offscreen so Start is not a black pane.
  useEffect(() => {
    if (!briefing || briefingStep >= 1) setPlayReady(true)
  }, [briefing, briefingStep])

  return (
    <div className="app">
      <main className={`split${briefing ? ' solo' : ''}`}>
        <section className="pane">
          <Canvas
            camera={{ position: [200, 96, 90], fov: 46, near: 0.4, far: 1600 }}
            dpr={[1, 1.35]}
            gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
          >
            <WorldView cinematic={briefing} />
          </Canvas>
          {briefing ? <Briefing onDeploy={start} /> : <WorldChrome />}
        </section>

        {playReady && (
          <div className={briefing ? 'play-warm' : 'play-live'}>
            <Suspense fallback={<section className="pane robot-pane robot-boot" aria-hidden="true" />}>
              <PlayPane />
            </Suspense>
          </div>
        )}
      </main>

      <EndCard />
    </div>
  )
}
