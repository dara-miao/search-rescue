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

  const stand = Math.max(y, 0.08)

  return (
    <group ref={g} position={[x, stand, z]}>
      <mesh position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.42, 1.15, 6, 12]} />
        <meshStandardMaterial
          color={body}
          emissive={heat}
          emissiveIntensity={thermal ? 3.2 : found ? 0.8 : 0.55}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <sphereGeometry args={[0.36, 12, 12]} />
        <meshStandardMaterial color={body} emissive={heat} emissiveIntensity={thermal ? 2.4 : 0.4} />
      </mesh>
      <mesh position={[0, 2.85, 0]}>
        <sphereGeometry args={[found ? 0.22 : 0.32, 12, 12]} />
        <meshStandardMaterial
          color={heat}
          emissive={heat}
          emissiveIntensity={thermal ? 5 : 2.4}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 3.55, 0]}>
        <Text
          fontSize={next ? 0.72 : 0.58}
          color={found ? '#9dffd0' : next ? '#ffcc00' : '#ffe7c2'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.04}
          outlineColor="#000"
        >
          {name}
        </Text>
      </Billboard>
      {next && !found && (
        <mesh position={[0, 5.2, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 3.2, 8]} />
          <meshStandardMaterial
            color="#ffcc00"
            emissive="#ffcc00"
            emissiveIntensity={2.4}
            toneMapped={false}
          />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.85, 1.15, 28]} />
        <meshBasicMaterial
          color={found ? '#2ee59a' : next ? '#ffcc00' : '#ffb078'}
          toneMapped={false}
          transparent
          opacity={found ? 0.9 : 0.7}
        />
      </mesh>
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
