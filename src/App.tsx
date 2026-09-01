import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useSimLoop } from './game/useSimLoop'
import { useGame } from './game/store'
import { WorldView } from './scene/WorldView'
import { ScenarioPick, EndCard } from './ui/Overlays'
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
  const picking = phase === 'pick'
  useSimLoop(phase === 'playing')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void import('./scene/RobotScene')
    void useGame.getState().hydrateGoogle()
  }, [])

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [phase])

  useEffect(() => holdContext(root.current), [])

  useEffect(() => {
    if (phase !== 'playing') return
    root.current?.focus()
    window.focus()
  }, [phase])

  return (
    <div className="app" ref={root} tabIndex={-1}>
      <main className="split">
        <section className="pane">
          <span className="pane-tag">WORLD</span>
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
            <WorldView cinematic={picking} />
          </Canvas>
          {picking ? <ScenarioPick onPick={start} /> : <WorldChrome />}
        </section>
        <PlayPane />
      </main>

      <EndCard />
    </div>
  )
}
