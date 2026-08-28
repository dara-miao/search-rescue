import { DoubleSide } from 'three'
import { Billboard, Text } from '@react-three/drei'
import type { InteriorDef } from '../game/interiors'
import { at } from '../game/interiors'
import { C } from './colors'
import { useOptionalTexture } from './useTexture'

function StillPlane({
  position,
  rotation,
  width,
  height,
  still,
  thermal,
  fallback,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  width: number
  height: number
  still: ReturnType<typeof useOptionalTexture>
  thermal: boolean
  fallback: string
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={still ?? undefined}
        color={still ? (thermal ? '#7ad0e8' : '#ffffff') : thermal ? '#143040' : fallback}
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  )
}

export function InteriorRoom({ room, thermal }: { room: InteriorDef; thermal: boolean }) {
  const still = useOptionalTexture(room.still, false)
  const stillLeft = useOptionalTexture(room.stillLeft ?? room.still, false)
  const stillRight = useOptionalTexture(room.stillRight ?? room.still, false)
  const stillFront = useOptionalTexture(room.stillFront ?? room.still, false)
  const stillCeiling = useOptionalTexture(room.stillCeiling ?? room.still, true)
  const stillFloor = useOptionalTexture(room.stillFloor ?? room.stillRight ?? room.still, true)

  const hall = room.hall
  const depth = room.depth ?? 11
  const width = room.width ?? 7.2
  const height = room.height ?? 6.2
  const door = Math.min(room.door ?? 2.5, width - 1.6)
  const midAlong = depth * 0.5
  const midY = height * 0.5
  const halfW = width * 0.5
  const panelW = (width - door) * 0.5
  const panelSide = (door + panelW) * 0.5

  const backFacing = Math.atan2(-hall.ax, -hall.az)
  const frontFacing = backFacing + Math.PI
  const leftFacing = backFacing + Math.PI / 2
  const rightFacing = backFacing - Math.PI / 2
  const wood = thermal ? '#1a1410' : '#4a2e1c'
  const lamp = thermal ? C.thermalHot : '#ffc878'

  return (
    <group>
      {room.mark && (
        <Billboard position={at(hall, -2.2, 0, 3.5)}>
          <Text fontSize={0.8} color="#6ee0b0" anchorX="center" outlineWidth={0.06} outlineColor="#000">
            {room.mark}
          </Text>
        </Billboard>
      )}

      <StillPlane
        position={at(hall, midAlong, 0, 0.04)}
        rotation={[-Math.PI / 2, hall.yaw, 0]}
        width={width}
        height={depth}
        still={stillFloor}
        thermal={thermal}
        fallback="#3a2a1c"
      />
      <StillPlane
        position={at(hall, midAlong, 0, height)}
        rotation={[Math.PI / 2, hall.yaw, 0]}
        width={width}
        height={depth}
        still={stillCeiling}
        thermal={thermal}
        fallback="#5a4030"
      />
      <StillPlane
        position={at(hall, depth - 0.06, 0, midY)}
        rotation={[0, backFacing, 0]}
        width={width}
        height={height}
        still={still}
        thermal={thermal}
        fallback="#8a6a50"
      />
      <StillPlane
        position={at(hall, midAlong, -halfW, midY)}
        rotation={[0, leftFacing, 0]}
        width={depth}
        height={height}
        still={stillLeft}
        thermal={thermal}
        fallback="#6a4a38"
      />
      <StillPlane
        position={at(hall, midAlong, halfW, midY)}
        rotation={[0, rightFacing, 0]}
        width={depth}
        height={height}
        still={stillRight}
        thermal={thermal}
        fallback="#6a4a38"
      />
      <StillPlane
        position={at(hall, 0.08, -panelSide, midY)}
        rotation={[0, frontFacing, 0]}
        width={panelW}
        height={height}
        still={stillFront}
        thermal={thermal}
        fallback="#7a5a42"
      />
      <StillPlane
        position={at(hall, 0.08, panelSide, midY)}
        rotation={[0, frontFacing, 0]}
        width={panelW}
        height={height}
        still={stillFront}
        thermal={thermal}
        fallback="#7a5a42"
      />

      <Text position={at(hall, 1.4, 0, 0.28)} rotation={[-Math.PI / 2, 0, -hall.yaw]} fontSize={0.18} color="#c9b89a" anchorX="center">
        {room.credit}
      </Text>

      {[2.6, 5.4, 8.2, 11].filter((along) => along < depth - 1.6).map((along) => (
        <group key={along} position={at(hall, along, along % 5 > 3 ? -2.1 : 2.1, 0)} rotation={[0, hall.yaw, 0]}>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[2.1, 0.08, 0.86]} />
            <meshStandardMaterial color={wood} roughness={0.55} />
          </mesh>
        </group>
      ))}

      {[3.2, 7.4, 11.6].filter((along) => along < depth - 0.8).map((along) => (
        <mesh key={`lamp-${along}`} position={at(hall, along, 0, height - 0.85)}>
          <boxGeometry args={[0.9, 0.22, 0.9]} />
          <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={2.1} toneMapped={false} />
        </mesh>
      ))}
      <pointLight position={at(hall, midAlong, 0, height * 0.62)} intensity={thermal ? 6 : 38} distance={28} color="#ffe0b0" />

      <Billboard position={at(hall, midAlong, 0, height + 2.4)}>
        <Text fontSize={1.4} color={thermal ? '#ff7a22' : '#ffd56a'} anchorX="center" outlineWidth={0.08} outlineColor="#000">
          {room.title}
        </Text>
      </Billboard>
    </group>
  )
}
