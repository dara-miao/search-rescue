import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { useDrive } from './drive/store'
import { parseSeed } from './run/seed'
import { useRunAudio } from './run/useRunAudio'
import { useRunLoop } from './run/useRunLoop'
import { useRun } from './run/store'
import { FootprintView } from './scene/FootprintView'
import { Briefing } from './ui/Briefing'
import { Credits } from './ui/Credits'
import { Debrief } from './ui/Debrief'
import { RunHud } from './ui/RunHud'
import PlayApp from './PlayApp'

function legacyPlay() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('play') === '1'
}

function Stage0App() {
  useRunLoop()
  useRunAudio()
  useEffect(() => {
    const seed = parseSeed(window.location.search)
    if (seed == null) return
    useRun.getState().start(seed)
    useDrive.getState().reset()
  }, [])
  const phase = useRun((s) => s.phase)
  return (
    <div className="app stage0-app">
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        shadows={false}
        gl={{
          antialias: true,
          stencil: false,
          powerPreference: 'high-performance',
          toneMapping: ACESFilmicToneMapping,
        }}
      >
        <FootprintView />
      </Canvas>
      {phase === 'credits' ? (
        <Credits />
      ) : phase === 'debrief' ? (
        <Debrief />
      ) : phase === 'briefing' ? (
        <Briefing />
      ) : (
        <RunHud />
      )}
    </div>
  )
}

export default function App() {
  return legacyPlay() ? <PlayApp /> : <Stage0App />
}
