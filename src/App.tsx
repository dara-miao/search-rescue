import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useSimLoop } from './game/useSimLoop'
import { useGame } from './game/store'
import { WorldView } from './scene/WorldView'
import { Briefing, EndCard } from './ui/Overlays'
import { PlayPane } from './ui/PlayPane'
import { WorldChrome } from './ui/Hud'

function holdContext(el: HTMLElement | null) {
  if (!el) return () => {}
  const onLost = (e: Event) => e.preventDefault()
  el.addEventListener('webglcontextlost', onLost)
  return () => el.removeEventListener('webglcontextlost', onLost)
}

export default function App() {
  const phase = useGame((s) => s.phase)
  const start = useGame((s) => s.start)
  const briefingStep = useGame((s) => s.briefingStep)
  const briefing = phase === 'briefing'
  useSimLoop(phase === 'playing')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [phase])

  useEffect(() => {
    if (briefingStep >= 1 || !briefing) void import('./scene/RobotScene')
  }, [briefing, briefingStep])

  useEffect(() => holdContext(root.current), [])

  useEffect(() => {
    if (phase !== 'playing') return
    root.current?.focus()
    window.focus()
  }, [phase])

  return (
    <div className="app" ref={root} tabIndex={-1}>
      <main className={`split${briefing ? ' solo' : ''}`}>
        <section className="pane">
          {!briefing && <span className="pane-tag">WORLD</span>}
          <Canvas
            eventPrefix="offset"
            style={{ position: 'absolute', inset: 0 }}
            camera={{ position: [200, 96, 90], fov: 46, near: 0.8, far: 720 }}
            dpr={[0.85, 1]}
            gl={{
              antialias: false,
              stencil: false,
              powerPreference: 'high-performance',
              toneMapping: ACESFilmicToneMapping,
            }}
            onCreated={({ gl }) => holdContext(gl.domElement)}
          >
            <WorldView cinematic={briefing} />
          </Canvas>
          {briefing ? <Briefing onDeploy={start} /> : <WorldChrome />}
        </section>
        {!briefing && <PlayPane />}
      </main>

      <EndCard />
    </div>
  )
}
