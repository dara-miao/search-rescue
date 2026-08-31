import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useSimLoop } from './game/useSimLoop'
import { useGame } from './game/store'
import { WorldView } from './scene/WorldView'
import { Briefing, EndCard } from './ui/Overlays'
import { WorldChrome } from './ui/Hud'

const loadPlayPane = () => import('./ui/PlayPane').then((m) => ({ default: m.PlayPane }))
const PlayPane = lazy(loadPlayPane)

export default function App() {
  const phase = useGame((s) => s.phase)
  const start = useGame((s) => s.start)
  const briefingStep = useGame((s) => s.briefingStep)
  const briefing = phase === 'briefing'
  const input = useSimLoop(phase === 'playing')

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [phase])

  useEffect(() => {
    if (briefingStep >= 1 || !briefing) void loadPlayPane()
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

        {!briefing && (
          <Suspense fallback={<section className="pane robot-pane robot-boot" aria-hidden="true" />}>
            <PlayPane input={input} />
          </Suspense>
        )}
      </main>

      <EndCard />
    </div>
  )
}
