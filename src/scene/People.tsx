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
  facade,
}: {
  x: number
  z: number
  y: number
  name: string
  found: boolean
  next: boolean
  thermal: boolean
  facade: boolean
}) {
  const g = useRef<Group>(null)

  useFrame(({ clock }) => {
    if (!g.current) return
    const pulse = 0.85 + Math.sin(clock.elapsedTime * 3 + x) * 0.15
    g.current.scale.setScalar(found || facade ? 1 : pulse)
  })

  const heat = found ? '#2ee59a' : thermal ? C.thermalHot : facade ? '#ffcc66' : '#ffb078'
  const body = found ? '#1a3d32' : thermal ? '#ff5a00' : '#c98a6a'
  const stand = Math.max(y, 0.08)
  const label = facade ? 2.15 : next ? 0.95 : 0.78
  const poleH = facade ? 14 : 4.2
  const poleY = facade ? 10.2 : 6.4

  return (
    <group ref={g} position={[x, stand, z]}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <capsuleGeometry args={[0.55, 1.45, 6, 12]} />
        <meshStandardMaterial
          color={body}
          emissive={heat}
          emissiveIntensity={thermal ? 3.2 : found ? 0.9 : 0.7}
          roughness={0.6}
        />
      </mesh>
      <mesh position={[0, 2.55, 0]}>
        <sphereGeometry args={[0.46, 12, 12]} />
        <meshStandardMaterial color={body} emissive={heat} emissiveIntensity={thermal ? 2.4 : 0.5} />
      </mesh>
      <mesh position={[0, 3.45, 0]}>
        <sphereGeometry args={[found ? 0.28 : 0.4, 12, 12]} />
        <meshBasicMaterial color={heat} toneMapped={false} />
      </mesh>
      <Billboard position={[0, facade ? 18.4 : 4.35, 0]}>
        <Text
          fontSize={label}
          color={found ? '#9dffd0' : next || facade ? '#ffcc00' : '#ffe7c2'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={facade ? 0.12 : 0.05}
          outlineColor="#000"
        >
          {name}
        </Text>
      </Billboard>
      {!found && (
        <mesh position={[0, poleY, 0]}>
          <cylinderGeometry args={[facade ? 0.16 : 0.09, facade ? 0.16 : 0.09, poleH, 8]} />
          <meshBasicMaterial color={next || facade ? '#ffcc00' : '#ff8a3a'} toneMapped={false} />
        </mesh>
      )}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[facade ? 1.5 : 1.05, facade ? 2.05 : 1.45, 28]} />
        <meshBasicMaterial
          color={found ? '#2ee59a' : next || facade ? '#ffcc00' : '#ffb078'}
          toneMapped={false}
          transparent
          opacity={found ? 0.95 : 0.85}
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
          facade={p.id === 'v1'}
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
