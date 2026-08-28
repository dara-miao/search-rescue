import { useMemo } from 'react'
import { Billboard, Text } from '@react-three/drei'
import { DOHENY, DOHENY_DOOR } from '../game/world'
import { C } from './colors'
import { useOptionalTexture } from './useTexture'

function hallBasis() {
  const door = DOHENY_DOOR
  if (!door) {
    return {
      x: 114.618,
      z: 50.788,
      ax: 0.96,
      az: -0.281,
      px: 0.281,
      pz: 0.96,
      yaw: Math.atan2(0.96, -0.281),
    }
  }
  const x = (door.ax + door.bx) / 2
  const z = (door.az + door.bz) / 2
  const ix = DOHENY.cx - x
  const iz = DOHENY.cz - z
  const len = Math.hypot(ix, iz) || 1
  const ax = ix / len
  const az = iz / len
  return { x, z, ax, az, px: -az, pz: ax, yaw: Math.atan2(ax, az) }
}

const HALL = hallBasis()

export function insideDoheny(x: number, z: number) {
  return x > 118 && x < 196 && z > 10 && z < 80
}

function at(along: number, side: number, y: number): [number, number, number] {
  return [HALL.x + HALL.ax * along + HALL.px * side, y, HALL.z + HALL.az * along + HALL.pz * side]
}

function DoorFrame({ thermal }: { thermal: boolean }) {
  const door = DOHENY_DOOR
  if (!door) return null
  const len = Math.hypot(door.bx - door.ax, door.bz - door.az) || 1
  const dirx = (door.bx - door.ax) / len
  const dirz = (door.bz - door.az) / len
  const mx = (door.ax + door.bx) / 2
  const mz = (door.az + door.bz) / 2
  const rot = Math.atan2(door.bx - door.ax, door.bz - door.az)
  const gap = 4.6
  const post = gap / 2 + 0.28
  const stone = thermal ? C.thermalCold : '#c4b191'

  return (
    <group>
      <mesh position={[mx + dirx * post, 3.2, mz + dirz * post]} rotation={[0, rot, 0]} castShadow>
        <boxGeometry args={[1.1, 6.4, 0.85]} />
        <meshStandardMaterial color={stone} roughness={0.7} />
      </mesh>
      <mesh position={[mx - dirx * post, 3.2, mz - dirz * post]} rotation={[0, rot, 0]} castShadow>
        <boxGeometry args={[1.1, 6.4, 0.85]} />
        <meshStandardMaterial color={stone} roughness={0.7} />
      </mesh>
      <mesh position={[mx, 6.55, mz]} rotation={[0, rot, 0]} castShadow>
        <boxGeometry args={[1.2, 0.7, gap + 1.4]} />
        <meshStandardMaterial color={thermal ? '#1a1010' : '#5a2a22'} roughness={0.65} />
      </mesh>
    </group>
  )
}

export function TimesMirror({ thermal }: { thermal: boolean }) {
  const still = useOptionalTexture('/doheny-times-mirror.jpg', false)
  const wood = thermal ? '#1a1410' : '#4a2e1c'
  const stone = thermal ? C.thermalCold : '#8a7a64'
  const lamp = thermal ? C.thermalHot : '#ffc878'
  const tables = useMemo(() => {
    const list: Array<[number, number]> = []
    for (const along of [16, 22, 28, 34, 40, 46]) {
      for (const side of [-8.2, -3.4, 3.4, 8.2]) list.push([along, side])
    }
    return list
  }, [])
  const stillFacing = Math.atan2(-HALL.ax, -HALL.az)

  return (
    <group>
      <DoorFrame thermal={thermal} />
      {[14, 22, 30, 38, 46].flatMap((along) =>
        [-5.6, 5.6].map((side) => (
          <mesh key={`col-${along}-${side}`} position={at(along, side, 6.1)} castShadow>
            <cylinderGeometry args={[0.42, 0.5, 12.2, 10]} />
            <meshStandardMaterial color={stone} roughness={0.78} metalness={0.08} />
          </mesh>
        )),
      )}
      {tables.map(([along, side]) => (
        <group key={`tbl-${along}-${side}`} position={at(along, side, 0)} rotation={[0, HALL.yaw, 0]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[2.6, 0.09, 1.15]} />
            <meshStandardMaterial color={wood} roughness={0.55} />
          </mesh>
          {[
            [-1.1, -0.42],
            [1.1, -0.42],
            [-1.1, 0.42],
            [1.1, 0.42],
          ].map(([lx, lz]) => (
            <mesh key={`${lx}-${lz}`} position={[lx, 0.34, lz]}>
              <boxGeometry args={[0.1, 0.68, 0.1]} />
              <meshStandardMaterial color={wood} roughness={0.7} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={at(50.5, 0, 6.4)} rotation={[0, stillFacing, 0]}>
        <planeGeometry args={[16, 11.2]} />
        <meshStandardMaterial
          map={still ?? undefined}
          color={still ? '#ffffff' : thermal ? '#221810' : '#5a4030'}
          roughness={0.7}
          emissive={thermal ? '#000' : '#2a1810'}
          emissiveIntensity={still ? 0.12 : 0.2}
        />
      </mesh>
      <mesh position={at(50.62, 0, 6.4)} rotation={[0, stillFacing, 0]}>
        <planeGeometry args={[16.7, 11.9]} />
        <meshStandardMaterial color={thermal ? '#0c0c0c' : '#2a1a12'} roughness={0.85} />
      </mesh>
      <Text
        position={at(50.2, 0, 0.55)}
        rotation={[0, stillFacing, 0]}
        fontSize={0.28}
        color={thermal ? '#7ad7ff' : '#c9b89a'}
        anchorX="center"
      >
        EEJCC · Wikimedia CC BY-SA 4.0
      </Text>
      {[14, 22, 30, 38].map((along) => (
        <mesh key={`lamp-${along}`} position={at(along, 0, 9.2)}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshStandardMaterial
            color={lamp}
            emissive={lamp}
            emissiveIntensity={thermal ? 3.4 : 2.2}
            toneMapped={false}
          />
        </mesh>
      ))}
      <pointLight position={at(28, 0, 6.5)} intensity={thermal ? 4 : 28} distance={36} color="#ffb068" />
      <Billboard position={[DOHENY.cx, DOHENY.height + 3.2, DOHENY.cz]}>
        <Text fontSize={2.4} color={thermal ? '#ff7a22' : '#ffd56a'} anchorX="center" outlineWidth={0.1} outlineColor="#000">
          Times-Mirror reading room
        </Text>
      </Billboard>
    </group>
  )
}
