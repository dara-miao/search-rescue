import { Stars } from '@react-three/drei'
import { C } from './colors'

export function Lights({
  thermal,
  photoreal = false,
}: {
  thermal: boolean
  photoreal?: boolean
}) {
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

  return (
    <>
      <color attach="background" args={[thermal ? C.thermalBg : '#0a0d14']} />
      <fog attach="fog" args={[thermal ? C.thermalBg : '#0c1018', thermal ? 40 : 70, thermal ? 160 : 320]} />
      <ambientLight intensity={thermal ? 0.2 : 0.22} color={thermal ? '#226688' : '#6a5848'} />
      <hemisphereLight
        args={thermal ? ['#134050', '#020406', 0.5] : ['#6a7a98', '#1a100c', 0.7]}
      />
      <directionalLight
        position={[-80, 70, 40]}
        intensity={thermal ? 0.3 : 1.15}
        color={thermal ? '#88ccee' : '#c4d0e4'}
        castShadow={!photoreal}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={220}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
      />
      <directionalLight position={[40, 18, -20]} intensity={thermal ? 0.05 : 0.28} color="#ff8a4a" />
      <Stars radius={280} depth={60} count={thermal ? 500 : 1400} factor={4} fade speed={0.35} />
    </>
  )
}
