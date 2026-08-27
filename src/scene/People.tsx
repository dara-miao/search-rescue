import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { Group } from 'three'
import { useGame } from '../game/store'
import { CAMPUS } from '../game/world'
import { C } from './colors'

function Person({
  x,
  z,
  y,
  name,
  found,
  next,
  thermal,
}: {
  x: number
  z: number
  y: number
  name: string
  found: boolean
  next: boolean
  thermal: boolean
}) {
  const g = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!g.current) return
    const pulse = 0.85 + Math.sin(clock.elapsedTime * 3 + x) * 0.15
    g.current.scale.setScalar(found ? 1 : pulse)
  })

  const heat = found ? '#2ee59a' : thermal ? C.thermalHot : '#ffb078'
  const body = found ? '#1a3d32' : thermal ? '#ff5a00' : '#c98a6a'

  return (
    <group ref={g} position={[x, y, z]}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.18, 0.55, 6, 10]} />
        <meshStandardMaterial
          color={body}
          emissive={heat}
          emissiveIntensity={thermal ? 3.2 : found ? 0.8 : 0.35}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color={body} emissive={heat} emissiveIntensity={thermal ? 2.4 : 0.25} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[found ? 0.12 : 0.18, 10, 10]} />
        <meshStandardMaterial
          color={heat}
          emissive={heat}
          emissiveIntensity={thermal ? 5 : 2}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 2.05, 0]}>
        <Text
          fontSize={next ? 0.34 : 0.28}
          color={found ? '#9dffd0' : next ? '#ffcc00' : '#ffe7c2'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {name}
        </Text>
      </Billboard>
      {next && !found && (
        <mesh position={[0, 3.4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ffcc00"
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      )}
      {found && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.7, 0.85, 28]} />
          <meshStandardMaterial
            color="#2ee59a"
            emissive="#2ee59a"
            emissiveIntensity={1.4}
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
    </group>
  )
}

export function People({ thermal }: { thermal: boolean }) {
  const survivors = useGame((s) => s.survivors)
  const nearestId = useGame((s) => s.nearestId)
  const nearestDist = useGame((s) => s.nearestDist)
  const robot = useGame((s) => s.robot)

  return (
    <group>
      {survivors.map((p) => (
        <Person
          key={p.id}
          x={p.x}
          z={p.z}
          y={p.y}
          name={p.name}
          found={p.found}
          next={p.id === nearestId}
          thermal={thermal}
        />
      ))}
      {nearestId && nearestDist < CAMPUS.markRange * 2.5 && (
        <mesh
          position={[robot.x, 0.06, robot.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[CAMPUS.markRange - 0.08, CAMPUS.markRange, 40]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ffcc00"
            emissiveIntensity={0.8}
            transparent
            opacity={0.35}
          />
        </mesh>
      )}
    </group>
  )
}
