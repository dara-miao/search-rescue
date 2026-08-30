import { Billboard, Text } from '@react-three/drei'
import { heightAt } from '../game/ground'
import { useGame } from '../game/store'

const STALE = 25

function zoneColor(zone: string) {
  if (zone === 'nogo') return '#ff4d3a'
  if (zone === 'hot') return '#ff8a1a'
  if (zone === 'warm') return '#ffcc00'
  return '#7ee0c2'
}

export function LastKnowns() {
  const victims = useGame((s) => s.sim.victims)
  const elapsed = useGame((s) => s.elapsed)

  return (
    <group>
      {victims.map((v) => {
        if (!v.lastKnown) return null
        const stale = elapsed - v.lastKnown.t > STALE
        const x = v.lastKnown.x
        const z = v.lastKnown.z
        const y = heightAt(x, z)
        const color = v.status === 'marked' ? '#2ee59a' : v.status === 'lost' ? '#8a8a8a' : zoneColor(v.lastKnown.zone)
        return (
          <group key={v.id} position={[x, y, z]}>
            <mesh position={[0, 6.2, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 12.4, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
            <mesh position={[0, 12.6, 0]}>
              <sphereGeometry args={[0.38, 10, 10]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
            </mesh>
            <Billboard position={[0, 14.2, 0]}>
              <Text
                fontSize={1.05}
                color={color}
                anchorX="center"
                outlineWidth={0.04}
                outlineColor="#000"
              >
                {`${v.name}${stale ? ' STALE' : ''}${v.status === 'lost' ? ' LOST' : ''}`}
              </Text>
            </Billboard>
          </group>
        )
      })}
    </group>
  )
}
