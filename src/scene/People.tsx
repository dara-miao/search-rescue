import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { Group } from 'three'
import { heightAt } from '../game/ground'
import { useGame } from '../game/store'
import { CAMPUS } from '../game/world'
import { recentlyDetected } from '../sim/sensors'
import type { VictimStatus } from '../sim/types'
import { C } from './colors'

function Person({
  x,
  z,
  y,
  name,
  status,
  next,
  thermal,
}: {
  x: number
  z: number
  y: number
  name: string
  status: VictimStatus
  next: boolean
  thermal: boolean
}) {
  const g = useRef<Group>(null)
  const found = status === 'marked'
  const lost = status === 'lost'

  useFrame(({ clock }) => {
    if (!g.current || found || lost) return
    g.current.scale.setScalar(0.9 + Math.sin(clock.elapsedTime * 2.4 + x) * 0.1)
  })

  const heat = found ? '#2ee59a' : lost ? '#6a6a6a' : thermal ? C.thermalHot : '#ffb078'
  const body = found ? '#1a3d32' : lost ? '#3a3a3a' : thermal ? '#ff5a00' : '#c98a6a'
  const emit = lost ? 0.05 : thermal ? 3.2 : found ? 0.8 : 0.35

  return (
    <group ref={g} position={[x, y, z]}>
      <mesh position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.18, 0.55, 6, 10]} />
        <meshStandardMaterial color={body} emissive={heat} emissiveIntensity={emit} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color={body} emissive={heat} emissiveIntensity={lost ? 0.04 : thermal ? 2.4 : 0.25} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <sphereGeometry args={[found || lost ? 0.12 : 0.18, 10, 10]} />
        <meshStandardMaterial
          color={heat}
          emissive={heat}
          emissiveIntensity={lost ? 0.2 : thermal ? 5 : 2}
          toneMapped={false}
        />
      </mesh>
      <Billboard position={[0, 2.05, 0]}>
        <Text
          fontSize={next ? 0.34 : 0.28}
          color={found ? '#9dffd0' : lost ? '#b0b0b0' : next ? '#ffcc00' : '#ffe7c2'}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000"
        >
          {lost ? `${name} lost` : name}
        </Text>
      </Billboard>
      {next && !found && !lost && (
        <mesh position={[0, 3.4, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
          <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={2.4} toneMapped={false} />
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

export function People({ thermal, world = false }: { thermal: boolean; world?: boolean }) {
  const survivors = useGame((s) => s.survivors)
  const nearestId = useGame((s) => s.nearestId)
  const nearestDist = useGame((s) => s.nearestDist)
  const elapsed = useGame((s) => s.elapsed)

  if (world) return null

  const visible = survivors.filter((p) => p.status !== 'unseen')
  const lock = survivors.find((p) => p.id === nearestId)
  const showRing = Boolean(lock && recentlyDetected(lock, elapsed) && nearestDist <= CAMPUS.markRange * 2.5)
  const ringAt = showRing && lock ? lock : null

  return (
    <group>
      {visible.map((p) => (
        <Person
          key={p.id}
          x={p.x}
          z={p.z}
          y={heightAt(p.x, p.z)}
          name={p.name}
          status={p.status}
          next={p.id === nearestId && recentlyDetected(p, elapsed)}
          thermal={thermal && p.status !== 'lost'}
        />
      ))}
      {ringAt && (
        <mesh position={[ringAt.x, heightAt(ringAt.x, ringAt.z) + 0.08, ringAt.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CAMPUS.markRange - 0.08, CAMPUS.markRange, 24]} />
          <meshBasicMaterial color="#ffcc00" transparent opacity={0.32} />
        </mesh>
      )}
    </group>
  )
}
