import { useMemo } from 'react'
import { CanvasTexture, ExtrudeGeometry, Path, RepeatWrapping, Shape } from 'three'
import { Billboard, Text } from '@react-three/drei'
import { coverAt, GROUND, heightAt } from '../game/ground'
import { BUILDINGS, LANDMARKS, TREES, type CampusBuilding } from '../game/world'
import { C } from './colors'
import { Ground } from './Ground'

function extraPalms(): Array<[number, number]> {
  const pts: Array<[number, number]> = []
  for (const path of GROUND.paths) {
    for (let i = 0; i < path.length; i++) {
      const [x, z] = path[i]
      const prev = path[Math.max(0, i - 1)]
      const next = path[Math.min(path.length - 1, i + 1)]
      const dx = next[0] - prev[0]
      const dz = next[1] - prev[1]
      const len = Math.hypot(dx, dz) || 1
      const side = i % 2 === 0 ? 1 : -1
      const ox = x + (-dz / len) * (7.2 + (i % 3)) * side
      const oz = z + (dx / len) * (7.2 + (i % 3)) * side
      if (coverAt(ox, oz) === 'lawn') pts.push([ox, oz])
    }
  }
  const seeds: Array<[number, number]> = [
    [-42, -16],
    [18, 18],
    [-18, -42],
    [48, -8],
    [70, 20],
    [-60, -8],
    [30, -28],
  ]
  for (const [cx, cz] of seeds) {
    for (let k = 0; k < 5; k++) {
      const a = k * 1.37 + cx * 0.01
      const r = 8 + (k % 3) * 5
      const x = cx + Math.cos(a) * r
      const z = cz + Math.sin(a) * r
      if (coverAt(x, z) === 'lawn') pts.push([x, z])
    }
  }
  return pts
}

function doorOf(building: CampusBuilding) {
  const ring = building.outer
  let best = { ax: 0, az: 0, bx: 1, bz: 0, score: Infinity }
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = ring[i][0]
    const az = ring[i][1]
    const bx = ring[i + 1][0]
    const bz = ring[i + 1][1]
    const mx = (ax + bx) / 2
    const mz = (az + bz) / 2
    const score = mx * mx + mz * mz
    const len = Math.hypot(bx - ax, bz - az)
    if (len > 4 && score < best.score) {
      best = { ax, az, bx, bz, score }
    }
  }
  return { ax: best.ax, az: best.az, bx: best.bx, bz: best.bz }
}

function makeFacade(brick: boolean, fire: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.fillStyle = brick ? '#6e2c2c' : '#cbb89a'
  ctx.fillRect(0, 0, 256, 256)
  if (brick) {
    ctx.fillStyle = '#5a2224'
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 8; x++) {
        const ox = y % 2 ? 16 : 0
        ctx.fillRect(x * 32 + ox + 1, y * 16 + 1, 30, 14)
      }
    }
  } else {
    ctx.fillStyle = '#b9a686'
    for (let y = 0; y < 8; y++) ctx.fillRect(0, y * 32, 256, 1)
  }
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const lit = fire ? (row + col) % 3 !== 0 : (row * 7 + col * 3) % 11 === 0
      ctx.fillStyle = fire
        ? lit
          ? '#ff6a18'
          : '#1a1010'
        : lit
          ? '#e0b45a'
          : '#141820'
      ctx.fillRect(18 + col * 48, 22 + row * 58, 26, 34)
    }
  }
  return canvas
}

function Footprint({
  building,
  thermal,
  facade,
}: {
  building: CampusBuilding
  thermal: boolean
  facade: HTMLCanvasElement
}) {
  const geometry = useMemo(() => {
    const shape = new Shape()
    building.outer.forEach(([x, z], i) => {
      if (i === 0) shape.moveTo(x, -z)
      else shape.lineTo(x, -z)
    })
    for (const inner of building.inners) {
      const hole = new Path()
      inner.forEach(([x, z], i) => {
        if (i === 0) hole.moveTo(x, -z)
        else hole.lineTo(x, -z)
      })
      shape.holes.push(hole)
    }
    const geom = new ExtrudeGeometry(shape, {
      depth: building.height,
      bevelEnabled: false,
      curveSegments: 1,
    })
    geom.rotateX(-Math.PI / 2)
    return geom
  }, [building])

  const map = useMemo(() => {
    const tex = new CanvasTexture(facade)
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(2, 1.4)
    return tex
  }, [facade])

  const wall = thermal ? C.thermalCold : building.brick ? '#6a2a2c' : '#c4b191'
  const short = building.name.split(',')[0]
  const labeled = /Bovard|Leavey|Tutor|Annenberg|Waite Phillips|Taper/.test(short)

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={thermal ? wall : '#ffffff'}
          map={thermal ? undefined : map}
          roughness={0.92}
          metalness={0.04}
        />
      </mesh>
      {labeled && (
        <Billboard position={[building.cx, building.height + 2.2, building.cz]}>
          <Text fontSize={2.1} color={thermal ? '#7ad7ff' : '#f3e6c8'} anchorX="center" outlineWidth={0.08} outlineColor="#000">
            {short}
          </Text>
        </Billboard>
      )}
    </group>
  )
}

function RoofCap({ building, thermal }: { building: CampusBuilding; thermal: boolean }) {
  const shape = useMemo(() => {
    const s = new Shape()
    building.outer.forEach(([x, z], i) => {
      if (i === 0) s.moveTo(x, -z)
      else s.lineTo(x, -z)
    })
    return s
  }, [building])
  const roof = thermal ? '#0a1820' : '#7a3426'
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, building.height + 0.12, 0]} castShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial
        color={roof}
        roughness={0.8}
        emissive={building.fire && !thermal ? '#4a1208' : '#000'}
        emissiveIntensity={building.fire ? 0.35 : 0}
      />
    </mesh>
  )
}

function HollowLibrary({
  building,
  thermal,
  cutaway = false,
}: {
  building: CampusBuilding
  thermal: boolean
  cutaway?: boolean
}) {
  const walls = useMemo(() => {
    const list: Array<{ x: number; z: number; w: number; rot: number }> = []
    const ring = building.outer
    const door = doorOf(building)
    for (let i = 0; i < ring.length - 1; i++) {
      const ax = ring[i][0]
      const az = ring[i][1]
      const bx = ring[i + 1][0]
      const bz = ring[i + 1][1]
      const mx = (ax + bx) / 2
      const mz = (az + bz) / 2
      const len = Math.hypot(bx - ax, bz - az)
      const rot = Math.atan2(bx - ax, bz - az)
      const isDoor =
        door &&
        ((Math.abs(ax - door.ax) < 0.2 && Math.abs(az - door.az) < 0.2 && Math.abs(bx - door.bx) < 0.2 && Math.abs(bz - door.bz) < 0.2) ||
          (Math.abs(ax - door.bx) < 0.2 && Math.abs(az - door.bz) < 0.2 && Math.abs(bx - door.ax) < 0.2 && Math.abs(bz - door.az) < 0.2))
      if (isDoor) {
        const gap = 4.6
        const dirx = (bx - ax) / len
        const dirz = (bz - az) / len
        const half = (len - gap) / 2
        if (half > 1.2) {
          list.push({
            x: ax + dirx * (half / 2),
            z: az + dirz * (half / 2),
            w: half,
            rot,
          })
          list.push({
            x: bx - dirx * (half / 2),
            z: bz - dirz * (half / 2),
            w: half,
            rot,
          })
        }
        continue
      }
      list.push({ x: mx, z: mz, w: len, rot })
    }
    return list
  }, [building])

  const wall = thermal ? C.thermalCold : '#6d2d2e'
  const y = heightAt(building.cx, building.cz)
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <shapeGeometry
          args={[
            (() => {
              const s = new Shape()
              building.outer.forEach(([x, z], i) => (i === 0 ? s.moveTo(x, -z) : s.lineTo(x, -z)))
              return s
            })(),
          ]}
        />
        <meshStandardMaterial color={thermal ? '#111' : '#1c1614'} roughness={1} />
      </mesh>
      {walls.map((w, i) => (
        <mesh key={i} position={[w.x, building.height / 2, w.z]} rotation={[0, w.rot, 0]} castShadow>
          <boxGeometry args={[0.7, cutaway ? 8.4 : building.height, w.w]} />
          <meshStandardMaterial
            color={wall}
            roughness={0.9}
            emissive={building.fire && !thermal ? '#3a1008' : '#000'}
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
      {!cutaway && <RoofCap building={building} thermal={thermal} />}
      <Billboard position={[building.cx, building.height + 3.2, building.cz]}>
        <Text fontSize={2.4} color={thermal ? '#ff7a22' : '#ffd56a'} anchorX="center" outlineWidth={0.1} outlineColor="#000">
          {building.name.split(',')[0]}
        </Text>
      </Billboard>
    </group>
  )
}

function TommyTrojan({ thermal }: { thermal: boolean }) {
  const bronze = thermal ? '#3a2410' : C.bronze
  const dark = thermal ? '#201408' : C.bronzeDark
  const spot = LANDMARKS.find((l) => l.name.includes('Tommy')) ?? { x: 0, z: 0 }
  return (
    <group position={[spot.x, heightAt(spot.x, spot.z), spot.z]}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[3.1, 1.1, 3.1]} />
        <meshStandardMaterial color={thermal ? '#151515' : C.granite} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[2.4, 0.35, 2.4]} />
        <meshStandardMaterial color={thermal ? C.thermalCold : '#3a3530'} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <boxGeometry args={[0.7, 1.4, 0.45]} />
        <meshStandardMaterial color={bronze} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[-0.22, 1.7, 0.05]} rotation={[0.1, 0, 0.08]}>
        <boxGeometry args={[0.22, 1.15, 0.22]} />
        <meshStandardMaterial color={bronze} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0.22, 1.7, 0.05]} rotation={[0.1, 0, -0.08]}>
        <boxGeometry args={[0.22, 1.15, 0.22]} />
        <meshStandardMaterial color={bronze} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 3.05, 0]} castShadow>
        <boxGeometry args={[0.95, 1.05, 0.55]} />
        <meshStandardMaterial color={bronze} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 3.75, 0.04]}>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshStandardMaterial color={bronze} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 4.05, 0]}>
        <boxGeometry args={[0.5, 0.22, 0.5]} />
        <meshStandardMaterial color={dark} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.72, 3.35, 0.1]} rotation={[0, 0, -1.05]}>
        <boxGeometry args={[0.18, 1.15, 0.18]} />
        <meshStandardMaterial color={bronze} metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[1.35, 3.55, 0.1]} rotation={[0.15, 0, 0.2]}>
        <boxGeometry args={[0.08, 0.08, 1.7]} />
        <meshStandardMaterial color={dark} metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 1.15, 1.22]}>
        <boxGeometry args={[1.15, 0.28, 0.08]} />
        <meshStandardMaterial
          color={thermal ? C.thermalHot : C.cardinal}
          emissive={thermal ? C.thermalHot : C.cardinal}
          emissiveIntensity={thermal ? 0.8 : 0.25}
        />
      </mesh>
      <Billboard position={[0, 5.1, 0]}>
        <Text fontSize={0.7} color="#f6e6c4" anchorX="center" outlineWidth={0.03} outlineColor="#000">
          Tommy Trojan
        </Text>
      </Billboard>
    </group>
  )
}

function Fountain({ thermal }: { thermal: boolean }) {
  const f = LANDMARKS.find((l) => l.kind === 'fountain')
  if (!f) return null
  return (
    <group position={[f.x, heightAt(f.x, f.z), f.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <circleGeometry args={[6.2, 40]} />
        <meshStandardMaterial color={thermal ? '#0a2030' : '#4a5a62'} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <circleGeometry args={[4.6, 40]} />
        <meshStandardMaterial
          color={thermal ? '#113344' : '#6a8ea8'}
          roughness={0.15}
          metalness={0.45}
          emissive={thermal ? '#226688' : '#244050'}
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  )
}

function Palms({ thermal }: { thermal: boolean }) {
  const spots = useMemo(() => {
    const seen = new Set<string>()
    const all: Array<[number, number]> = [...TREES, ...extraPalms()]
    const unique: Array<[number, number]> = []
    for (const [x, z] of all) {
      const key = `${x.toFixed(1)},${z.toFixed(1)}`
      if (seen.has(key)) continue
      seen.add(key)
      unique.push([x, z])
    }
    return unique
  }, [])

  return (
    <group>
      {spots.map(([x, z], i) => {
        const lean = ((x * 13 + z * 7) % 17) / 17
        const scale = 0.78 + lean * 0.5
        const fronds = 7 + (i % 3)
        const h = 6.4 * scale
        return (
          <group key={`${x}-${z}-${i}`} position={[x, heightAt(x, z), z]} scale={scale}>
            <mesh position={[0, h / 2, 0]} castShadow>
              <cylinderGeometry args={[0.16, 0.26, 6.4, 7]} />
              <meshStandardMaterial color={thermal ? '#1a2a30' : C.trunk} roughness={1} />
            </mesh>
            {Array.from({ length: fronds }, (_, k) => {
              const a = (k / fronds) * Math.PI * 2 + lean
              return (
                <mesh
                  key={k}
                  position={[Math.sin(a) * 0.7, 6.45, Math.cos(a) * 0.7]}
                  rotation={[0.72, a, 0.12]}
                >
                  <boxGeometry args={[0.16, 0.07, 2.3]} />
                  <meshStandardMaterial color={thermal ? '#0c2830' : C.frond} roughness={0.9} />
                </mesh>
              )
            })}
          </group>
        )
      })}
    </group>
  )
}

function LandmarkLabels({ thermal }: { thermal: boolean }) {
  return (
    <group>
      {BUILDINGS.filter((b) => /Doheny|Bovard|Leavey|Tutor/.test(b.name)).map((b) => (
        <Billboard key={b.id} position={[b.cx, b.height + 6, b.cz]}>
          <Text fontSize={2.4} color={thermal ? '#7ad7ff' : '#f3e6c8'} anchorX="center" outlineWidth={0.1} outlineColor="#000">
            {b.name.split(',')[0]}
          </Text>
        </Billboard>
      ))}
    </group>
  )
}

export function Campus({
  thermal,
  photoreal = false,
  cutaway = false,
}: {
  thermal: boolean
  photoreal?: boolean
  cutaway?: boolean
}) {
  const facadeBrick = useMemo(() => makeFacade(true, true), [])
  const facadeStone = useMemo(() => makeFacade(false, false), [])

  if (photoreal) {
    return <LandmarkLabels thermal={thermal} />
  }

  return (
    <group>
      <Ground thermal={thermal} />
      {BUILDINGS.map((b) =>
        b.enterable ? (
          <HollowLibrary key={b.id} building={b} thermal={thermal} cutaway={cutaway} />
        ) : (
          <group key={b.id} position={[0, heightAt(b.cx, b.cz), 0]}>
            <Footprint building={b} thermal={thermal} facade={b.brick ? facadeBrick : facadeStone} />
            <RoofCap building={b} thermal={thermal} />
          </group>
        ),
      )}
      <TommyTrojan thermal={thermal} />
      <Fountain thermal={thermal} />
      <Palms thermal={thermal} />
    </group>
  )
}
