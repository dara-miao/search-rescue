import { DOHENY } from '../game/world'

export function Labels({ thermal }: { thermal: boolean }) {
  return (
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
  )
}
