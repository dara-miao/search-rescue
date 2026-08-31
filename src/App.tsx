import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useGame } from './game/store'
import { WorldView } from './scene/WorldView'
import { Briefing, EndCard } from './ui/Overlays'
import { WorldChrome } from './ui/Hud'

const PlayPane = lazy(() => import('./ui/PlayPane').then((m) => ({ default: m.PlayPane })))

function idle(work: () => void) {
  const ric = window.requestIdleCallback
  if (ric) return ric(work, { timeout: 1200 })
  return window.setTimeout(work, 280)
}

export default function App() {
  const phase = useGame((s) => s.phase)
  const start = useGame((s) => s.start)
  const briefing = phase === 'briefing'

  useEffect(() => {
    const id = idle(() => {
      void import('./ui/PlayPane')
    })
    return () => {
      window.clearTimeout(id as number)
      window.cancelIdleCallback?.(id as number)
    }
  }, [])

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
          <Suspense fallback={null}>
            <PlayPane />
          </Suspense>
        )}
      </main>

      <EndCard />
    </div>
  )
}
