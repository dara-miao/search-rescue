import { Sky, Stars } from '@react-three/drei'
import { C } from './colors'

const SUN = (() => {
  const hour = 15.2
  const t = (hour - 6) / 12
  const elevation = Math.sin(Math.max(0.05, Math.min(0.95, t)) * Math.PI) * 0.62
  const azimuth = Math.PI * 0.78 + (hour - 12) * 0.16
  const phi = Math.PI / 2 - elevation
  return [
    Math.sin(phi) * Math.sin(azimuth),
    Math.cos(phi),
    Math.sin(phi) * Math.cos(azimuth),
  ] as [number, number, number]
})()

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
        <hemisphereLight args={['#f0d8b0', '#3a2418', 0.9']} />
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
        <hemisphereLight args={['#c8dff5', '#6a5a48', 1.1']} />
        <directionalLight position={[-40, 80, 30]} intensity={1.35} color="#fff1d6" />
        <directionalLight position={[30, 20, -20]} intensity={0.25} color="#ff8a4a" />
      </>
    )
  }

  if (!thermal && !photoreal) {
    return (
      <>
        <color attach="background" args={['#8aa8c4']} />
        <fog attach="fog" args={['#b7c4ce', 140, 560]} />
        <Sky
          distance={800}
          sunPosition={SUN}
          turbidity={6.5}
          rayleigh={2.1}
          mieCoefficient={0.006}
          mieDirectionalG={0.86}
        />
        <ambientLight intensity={0.82} color="#fff4e6" />
        <hemisphereLight args={['#c8dff5', '#5a4a38', 1.05']} />
        <directionalLight
          position={[SUN[0] * 90, SUN[1] * 90, SUN[2] * 90]}
          intensity={1.55}
          color="#fff6e4"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={220}
          shadow-camera-left={-120}
          shadow-camera-right={120}
          shadow-camera-top={120}
          shadow-camera-bottom={-120}
        />
        <directionalLight position={[36, 16, -18]} intensity={0.28} color="#ff8a4a" />
      </>
    )
  }

  return (
    <>
      <color attach="background" args={[C.thermalBg]} />
      <fog attach="fog" args={[C.thermalBg, 40, 160]} />
      <ambientLight intensity={0.2} color="#226688" />
      <hemisphereLight args={['#134050', '#020406', 0.5']} />
      <directionalLight position={[-80, 70, 40]} intensity={0.3} color="#88ccee" />
      <directionalLight position={[40, 18, -20]} intensity={0.05} color="#ff8a4a" />
      <Stars radius={280} depth={60} count={500} factor={4} fade speed={0.35} />
    </>
  )
}
