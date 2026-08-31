import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useGame } from '../game/store'

const LEGS: Array<{ hip: [number, number, number]; side: 1 | -1; offset: number }> = [
  { hip: [-0.28, 0.02, 0.28], side: -1, offset: 0 },
  { hip: [0.28, 0.02, 0.28], side: 1, offset: Math.PI },
  { hip: [-0.28, 0.02, -0.3], side: -1, offset: Math.PI },
  { hip: [0.28, 0.02, -0.3], side: 1, offset: 0 },
]

export function Robot({ variant }: { variant: 'world' | 'robot' }) {
  const group = useRef<Group>(null)
  const legs = useRef<Array<Group | null>>([null, null, null, null])
  const gait = useRef(0)
  const youPin = variant === 'world'

  useFrame((_, dt) => {
    const { robot } = useGame.getState()
    const g = group.current
    if (!g) return
    if (robot.moving) gait.current += dt * (4.4 + robot.speed * 0.4)
    const bob = robot.moving ? Math.sin(gait.current * 2) * 0.025 : 0
    g.position.set(robot.x, robot.y + bob, robot.z)
    g.rotation.y = robot.yaw

    legs.current.forEach((leg, i) => {
      if (!leg) return
      const phase = gait.current + LEGS[i].offset
      const swing = robot.moving ? Math.sin(phase) * 0.48 : 0
      const lift = robot.moving ? Math.max(0, Math.cos(phase)) * 0.1 : 0
      leg.rotation.x = swing
      leg.position.y = LEGS[i].hip[1] + lift
    })
  })

  return (
    <group ref={group}>
      {!youPin && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.46, 0]} renderOrder={8}>
          <ringGeometry args={[1.6, 2.5, 28]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.88} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {youPin && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.46, 0]} renderOrder={20}>
            <ringGeometry args={[5.4, 9.2, 48]} />
            <meshBasicMaterial color="#ffcc00" transparent opacity={0.95} depthTest={false} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]} renderOrder={20}>
            <circleGeometry args={[4.2, 32]} />
            <meshBasicMaterial color="#ffcc00" transparent opacity={0.42} depthTest={false} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 11, 0]} renderOrder={21}>
            <cylinderGeometry args={[0.55, 0.55, 22, 10]} />
            <meshBasicMaterial color="#ffcc00" depthTest={false} toneMapped={false} />
          </mesh>
          <mesh position={[0, 22.4, 0]} renderOrder={22}>
            <sphereGeometry args={[1.7, 14, 14]} />
            <meshBasicMaterial color="#ffcc00" depthTest={false} toneMapped={false} />
          </mesh>
        </>
      )}
      <group scale={youPin ? 1 : 2.4}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.58, 0.22, 0.92]} />
        <meshStandardMaterial color="#16181d" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.2, 0.02]}>
        <boxGeometry args={[0.5, 0.08, 0.72]} />
        <meshStandardMaterial color="#9d2235" metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.22, -0.18]}>
        <boxGeometry args={[0.42, 0.04, 0.18]} />
        <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.7} />
      </mesh>
      {LEGS.map((leg, i) => (
        <group
          key={i}
          ref={(el) => {
            legs.current[i] = el
          }}
          position={leg.hip}
        >
          <mesh position={[0, -0.22, 0]}>
            <boxGeometry args={[0.12, 0.38, 0.14]} />
            <meshStandardMaterial color="#1a1d22" metalness={0.55} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.5, 0.02]}>
            <boxGeometry args={[0.11, 0.32, 0.13]} />
            <meshStandardMaterial color="#111318" metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.68, 0.04]}>
            <boxGeometry args={[0.16, 0.08, 0.22]} />
            <meshStandardMaterial color="#0c0d10" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <group position={[0, 0.32, 0.38]}>
        <mesh>
          <boxGeometry args={[0.18, 0.16, 0.22]} />
          <meshStandardMaterial color="#0e1014" metalness={0.7} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.02, 0.12]}>
          <boxGeometry args={[0.2, 0.1, 0.04]} />
          <meshStandardMaterial color="#7ad7ff" emissive="#3ec7ff" emissiveIntensity={1.8} />
        </mesh>
      </group>
      <spotLight
        position={[0, 0.4, 0.5]}
        angle={0.55}
        penumbra={0.45}
        intensity={youPin ? 10 : 16}
        distance={22}
        color="#fff4d8"
        castShadow={youPin}
      />
      </group>
    </group>
  )
}
