import { Billboard, Text } from '@react-three/drei'
import { useGame } from '../game/store'

const KEEP = /Doheny|Bovard|Leavey|Tutor|Tommy|Alumni Park/

export function Places({ thermal }: { thermal: boolean }) {
  const places = useGame((s) => s.places).filter(
    (p) => p.kind === 'library' || KEEP.test(p.name),
  )
  if (places.length === 0) return null

  return (
    <group>
      {places.slice(0, 6).map((place) => (
        <Billboard key={place.id} position={[place.x, place.kind === 'library' ? 24 : 16, place.z]}>
          <Text
            fontSize={1.35}
            color={thermal ? '#8ec8e0' : '#e8dcc4'}
            anchorX="center"
            outlineWidth={0.05}
            outlineColor="#000"
          >
            {place.name}
          </Text>
        </Billboard>
      ))}
    </group>
  )
}
