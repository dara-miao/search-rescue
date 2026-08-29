import { DoubleSide } from 'three'
import { Billboard, Text } from '@react-three/drei'
import type { InteriorDef } from '../game/interiors'
import { at } from '../game/interiors'
import { C } from './colors'
import { useOptionalTexture } from './useTexture'

export function InteriorRoom({ room, thermal }: { room: InteriorDef; thermal: boolean }) {
  const still = useOptionalTexture(room.still, false)
  const hall = room.hall
  const backFacing = Math.atan2(-hall.ax, -hall.az)
  const lamp = thermal ? C.thermalHot : '#ffc878'

  return (
    <group>
      {room.mark && (
        <Billboard position={at(hall, -2.2, 0, 3.5)}>
          <Text fontSize={0.7} color="#6ee0b0" anchorX="center" outlineWidth={0.05} outlineColor="#000">
            {room.mark}
          </Text>
        </Billboard>
      )}
      {room.labels.map((label) => (
        <Billboard key={label.text} position={at(hall, label.along, label.side, label.y)}>
          <Text fontSize={0.38} color={label.color} anchorX="center" outlineWidth={0.04} outlineColor="#000">
            {label.text}
          </Text>
        </Billboard>
      ))}
      <mesh position={at(hall, 5.4, 0, 3.05)} rotation={[0, backFacing, 0]}>
        <planeGeometry args={[7.2, 5.8]} />
        <meshBasicMaterial
          map={still ?? undefined}
          color={still ? (thermal ? '#7ad0e8' : '#ffffff') : '#8a6a50'}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <Text position={at(hall, 5.2, 0, 0.22)} rotation={[0, backFacing, 0]} fontSize={0.16} color="#c9b89a" anchorX="center">
        {room.credit}
      </Text>
      <mesh position={at(hall, 3.4, 0, 5.4)}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight position={at(hall, 3.2, 0, 4)} intensity={thermal ? 6 : 28} distance={20} color="#ffe0b0" />
    </group>
  )
}
