import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { useDrive } from './drive/store'
import { isHeroShot } from './run/hero'
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
    const hero = isHeroShot()
    if (seed == null && !hero) return
    useRun.getState().start(seed ?? 42)
    useDrive.getState().reset()
    if (hero) {
      useRun.getState().begin()
      useRun.getState().setHud({ thermal: false })
    }
  }, [])
  const phase = useRun((s) => s.phase)
  const hero = isHeroShot()
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
      {hero ? null : phase === 'credits' ? (
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
