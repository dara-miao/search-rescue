import { Canvas } from '@react-three/fiber'
import { View } from '@react-three/drei'
import { useEffect, useRef, type RefObject } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { useSimLoop } from './game/useSimLoop'
import { useGame } from './game/store'
import { WorldView } from './scene/WorldView'
import { Briefing, EndCard } from './ui/Overlays'
import { PlayPane } from './ui/PlayPane'
import { WorldChrome } from './ui/Hud'

export default function App() {
  const phase = useGame((s) => s.phase)
  const start = useGame((s) => s.start)
  const briefingStep = useGame((s) => s.briefingStep)
  const briefing = phase === 'briefing'
  const input = useSimLoop(phase === 'playing')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock()
  }, [phase])

  useEffect(() => {
    if (briefingStep >= 1 || !briefing) void import('./scene/RobotScene')
  }, [briefing, briefingStep])

  useEffect(() => {
    const el = root.current
    if (!el) return
    const onLost = (e: Event) => e.preventDefault()
    el.addEventListener('webglcontextlost', onLost)
    return () => el.removeEventListener('webglcontextlost', onLost)
  }, [])

  return (
    <div className="app" ref={root}>
      <Canvas
        eventSource={root as RefObject<HTMLElement>}
        eventPrefix="offset"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}
        camera={{ position: [200, 96, 90], fov: 46, near: 0.4, far: 1600 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}
      >
        <View.Port />
      </Canvas>

      <main className={`split${briefing ? ' solo' : ''}`}>
        <section className="pane">
          <View index={1} frames={Infinity} className="view-fill">
            <WorldView cinematic={briefing} />
          </View>
          {briefing ? <Briefing onDeploy={start} /> : <WorldChrome />}
        </section>
        {!briefing && <PlayPane input={input} />}
      </main>

      <EndCard />
    </div>
  )
}
