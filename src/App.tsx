import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useGame } from './game/store'
import { WorldView } from './scene/WorldView'
import { Briefing, EndCard } from './ui/Overlays'
import { WorldChrome } from './ui/Hud'

const playPane = import('./ui/PlayPane')
const PlayPane = lazy(() => playPane.then((m) => ({ default: m.PlayPane })))

export default function App() {
  const phase = useGame((s) => s.phase)
  const start = useGame((s) => s.start)
  const briefing = phase === 'briefing'

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [phase])

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

        {!briefing && (
          <Suspense fallback={<section className="pane robot-pane" aria-hidden="true" />}>
            <PlayPane />
          </Suspense>
        )}
      </main>

      <EndCard />
    </div>
  )
}
