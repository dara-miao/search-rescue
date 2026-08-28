import { DoubleSide } from 'three'
import { Billboard, Text } from '@react-three/drei'
import type { InteriorDef } from '../game/interiors'
import { at } from '../game/interiors'
import { C } from './colors'
import { useOptionalTexture } from './useTexture'

function fit(
  still: ReturnType<typeof useOptionalTexture>,
  maxW: number,
  maxH: number,
): [number, number] {
  const img = still?.image as { width?: number; height?: number } | undefined
  const w = img?.width ?? 4
  const h = img?.height ?? 3
  const aspect = w / Math.max(h, 1)
  return aspect > maxW / maxH ? [maxW, maxW / aspect] : [maxH * aspect, maxH]
}

function Shell({
  hall,
  depth,
  width,
  height,
  door,
  thermal,
}: {
  hall: InteriorDef['hall']
  depth: number
  width: number
  height: number
  door: number
  thermal: boolean
}) {
  const mid = depth * 0.5
  const midY = height * 0.5
  const halfW = width * 0.5
  const panelW = (width - door) * 0.5
  const panelSide = (door + panelW) * 0.5
  const backFacing = Math.atan2(-hall.ax, -hall.az)
  const frontFacing = backFacing + Math.PI
  const leftFacing = backFacing + Math.PI / 2
  const rightFacing = backFacing - Math.PI / 2
  const floor = thermal ? '#0c1014' : '#2a2118'
  const wall = thermal ? '#142028' : '#c4b49a'
  const wood = thermal ? '#101418' : '#3f2a1c'
  const ceil = thermal ? '#0a0e12' : '#4a3828'

  return (
    <group>
      <mesh position={at(hall, mid, 0, 0.03)} rotation={[-Math.PI / 2, hall.yaw, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={floor} roughness={0.35} metalness={0.08} />
      </mesh>
      <mesh position={at(hall, mid, 0, height)} rotation={[Math.PI / 2, hall.yaw, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={ceil} roughness={0.85} />
      </mesh>
      <mesh position={at(hall, depth - 0.04, 0, midY)} rotation={[0, backFacing, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={wall} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={at(hall, mid, -halfW, midY)} rotation={[0, leftFacing, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wall} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={at(hall, mid, halfW, midY)} rotation={[0, rightFacing, 0]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={wall} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={at(hall, 0.04, -panelSide, midY)} rotation={[0, frontFacing, 0]}>
        <planeGeometry args={[panelW, height]} />
        <meshStandardMaterial color={wall} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={at(hall, 0.04, panelSide, midY)} rotation={[0, frontFacing, 0]}>
        <planeGeometry args={[panelW, height]} />
        <meshStandardMaterial color={wall} roughness={0.9} side={DoubleSide} />
      </mesh>
      <mesh position={at(hall, mid, -halfW + 0.03, 0.7)} rotation={[0, leftFacing, 0]}>
        <planeGeometry args={[depth, 1.4]} />
        <meshStandardMaterial color={wood} roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh position={at(hall, mid, halfW - 0.03, 0.7)} rotation={[0, rightFacing, 0]}>
        <planeGeometry args={[depth, 1.4]} />
        <meshStandardMaterial color={wood} roughness={0.7} side={DoubleSide} />
      </mesh>
    </group>
  )
}

function HungStill({
  position,
  rotation,
  still,
  maxW,
  maxH,
  thermal,
}: {
  position: [number, number, number]
  rotation: [number, number, number]
  still: ReturnType<typeof useOptionalTexture>
  maxW: number
  maxH: number
  thermal: boolean
}) {
  if (!still) return null
  const [w, h] = fit(still, maxW, maxH)
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[w + 0.16, h + 0.16]} />
        <meshStandardMaterial color={thermal ? '#0a1218' : '#1a120c'} roughness={0.8} />
      </mesh>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={still} color={thermal ? '#7ad0e8' : '#ffffff'} toneMapped={false} />
      </mesh>
    </group>
  )
}

export function InteriorRoom({ room, thermal }: { room: InteriorDef; thermal: boolean }) {
  const still = useOptionalTexture(room.still, false)
  const stillLeft = useOptionalTexture(room.stillLeft ?? null, false)
  const stillRight = useOptionalTexture(room.stillRight ?? null, false)
  const stillFar = useOptionalTexture(room.stillFar ?? null, false)

  const hall = room.hall
  const depth = room.depth ?? 11
  const width = room.width ?? 7.2
  const height = room.height ?? 6.2
  const door = Math.min(room.door ?? 2.5, width - 1.6)
  const backFacing = Math.atan2(-hall.ax, -hall.az)
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

      <Shell hall={hall} depth={depth} width={width} height={height} door={door} thermal={thermal} />

      <HungStill
        position={at(hall, depth - 0.18, 0, 3.05)}
        rotation={[0, backFacing, 0]}
        still={still}
        maxW={Math.min(width - 0.8, 7.2)}
        maxH={Math.min(height - 1.1, 5.2)}
        thermal={thermal}
      />
      <HungStill
        position={at(hall, 3.4, -(width * 0.5 - 0.12), 3.05)}
        rotation={[0, leftFacing, 0]}
        still={stillLeft}
        maxW={5.2}
        maxH={4.8}
        thermal={thermal}
      />
      <HungStill
        position={at(hall, 3.4, width * 0.5 - 0.12, 3.05)}
        rotation={[0, rightFacing, 0]}
        still={stillRight}
        maxW={5.2}
        maxH={4.8}
        thermal={thermal}
      />
      {room.stillFar && (
        <HungStill
          position={at(hall, Math.min(depth - 2.4, 8.2), width * 0.5 - 0.12, 3.05)}
          rotation={[0, rightFacing, 0]}
          still={stillFar}
          maxW={3.6}
          maxH={5.2}
          thermal={thermal}
        />
      )}

      <Text position={at(hall, 1.2, 0, 0.22)} rotation={[-Math.PI / 2, 0, hall.yaw]} fontSize={0.16} color="#c9b89a" anchorX="center">
        {room.credit}
      </Text>

      {[2.8, 6.2].filter((along) => along < depth - 1.8).map((along) => (
        <group key={along} position={at(hall, along, along > 4 ? -2.0 : 2.0, 0)} rotation={[0, hall.yaw, 0]}>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[1.9, 0.08, 0.8]} />
            <meshStandardMaterial color={wood} roughness={0.55} />
          </mesh>
        </group>
      ))}

      <mesh position={at(hall, Math.min(depth * 0.45, 4.2), 0, height - 0.7)}>
        <boxGeometry args={[0.85, 0.18, 0.85]} />
        <meshStandardMaterial color={lamp} emissive={lamp} emissiveIntensity={2.1} toneMapped={false} />
      </mesh>
      <pointLight position={at(hall, depth * 0.4, 0, height * 0.62)} intensity={thermal ? 5 : 28} distance={22} color="#ffe0b0" />
    </group>
  )
}
