import { Stars } from '@react-three/drei'
import { C } from './colors'

export function Lights({
  thermal,
  photoreal = false,
  interior = false,
}: {
  thermal: boolean
  photoreal?: boolean
  interior?: boolean
}) {
  if (interior && !thermal) {
    return (
      <>
        <color attach="background" args={['#1a1410']} />
        <fog attach="fog" args={['#1c1612', 18, 90]} />
        <ambientLight intensity={0.55} color="#ffe6c4" />
        <hemisphereLight args={['#f0d8b0', '#3a2418', 0.9]} />
        <directionalLight position={[20, 40, 10]} intensity={0.85} color="#fff1d6" />
      </>
    )
  }

  if (photoreal && !thermal) {
    return (
      <>
        <color attach="background" args={['#7ea4c8']} />
        <fog attach="fog" args={['#8aabcc', 80, 420]} />
        <ambientLight intensity={0.85} color="#fff4e6" />
        <hemisphereLight args={['#c8dff5', '#6a5a48', 1.1]} />
        <directionalLight position={[-40, 80, 30]} intensity={1.35} color="#fff1d6" />
        <directionalLight position={[30, 20, -20]} intensity={0.25} color="#ff8a4a" />
      </>
    )
  }

  if (!thermal && !photoreal) {
    return (
      <>
        <color attach="background" args={['#6a5340']} />
        <fog attach="fog" args={['#7a6250', 90, 380]} />
        <ambientLight intensity={0.72} color="#fff0d8" />
        <hemisphereLight args={['#ffe8c8', '#4a3a28', 1.05]} />
        <directionalLight
          position={[-50, 70, 28]}
          intensity={1.45}
          color="#fff6e4"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={220}
          shadow-camera-left={-120}
          shadow-camera-right={120}
          shadow-camera-top={120}
          shadow-camera-bottom={-120}
        />
        <directionalLight position={[36, 16, -18]} intensity={0.32} color="#ff8a4a" />
      </>
    )
  }

  return (
    <>
      <color attach="background" args={[C.thermalBg]} />
      <fog attach="fog" args={[C.thermalBg, 40, 160]} />
      <ambientLight intensity={0.2} color="#226688" />
      <hemisphereLight args={['#134050', '#020406', 0.5]} />
      <directionalLight position={[-80, 70, 40]} intensity={0.3} color="#88ccee" />
      <directionalLight position={[40, 18, -20]} intensity={0.05} color="#ff8a4a" />
      <Stars radius={280} depth={60} count={500} factor={4} fade speed={0.35} />
    </>
  )
}
