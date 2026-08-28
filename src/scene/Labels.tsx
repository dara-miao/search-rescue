import { Billboard, Text } from '@react-three/drei'
import { DOHENY } from '../game/world'

const MARKS: Array<{ text: string; color: string; x: number; y: number; z: number }> = [
  { text: 'HOT — stacks', color: '#ff6a1a', x: 151.7, y: 3.4, z: 39.9 },
  { text: 'NO GO — east court', color: '#ff3355', x: 182, y: 2.8, z: 56 },
  { text: 'EVAC — west door', color: '#6ee0b0', x: 116.2, y: 2.4, z: 50.4 },
]

export function Labels({ thermal }: { thermal: boolean }) {
  return (
    <group>
      {MARKS.map((m) => (
        <Billboard key={m.text} position={[m.x, m.y, m.z]}>
          <Text
            fontSize={0.55}
            color={thermal ? '#7ad7ff' : m.color}
            anchorX="center"
            outlineWidth={0.04}
            outlineColor="#000"
          >
            {m.text}
          </Text>
        </Billboard>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[DOHENY.cx, 0.12, DOHENY.cz]}>
        <ringGeometry args={[16, 16.35, 64]} />
        <meshStandardMaterial
          color={thermal ? '#ff4d00' : '#ff6a1a'}
          emissive={thermal ? '#ff4d00' : '#ff6a1a'}
          emissiveIntensity={1.2}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  )
}
