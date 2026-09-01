import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import { FootprintView } from './scene/FootprintView'
import { Stage0Chrome } from './ui/Stage0Chrome'
import PlayApp from './PlayApp'

function legacyPlay() {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('play') === '1'
}

function Stage0App() {
  return (
    <div className="app stage0-app">
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.5]}
        shadows
        gl={{
          antialias: true,
          stencil: false,
          powerPreference: 'high-performance',
          toneMapping: ACESFilmicToneMapping,
        }}
      >
        <FootprintView />
      </Canvas>
      <Stage0Chrome />
    </div>
  )
}

export default function App() {
  return legacyPlay() ? <PlayApp /> : <Stage0App />
}
