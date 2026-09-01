import { Line, OrbitControls, PerspectiveCamera, Text } from '@react-three/drei'
import { useMemo } from 'react'
import { DoubleSide, ExtrudeGeometry, Path, Shape } from 'three'
import { footprintBounds, site, type Vec2 } from '../data/site'

const GROUND_PAD = 60
const BRICK = '#c4b49a'
const BRICK_EDGE = '#8d7d66'
const LAWN = '#3a4a34'
const COURTYARD = '#2c3828'

function signedArea(pts: Vec2[]) {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.z - q.x * p.z
  }
  return a / 2
}

function ringToPath(pts: Vec2[], reverse: boolean) {
  const path = new Path()
  const seq = reverse ? pts.slice().reverse() : pts
  path.moveTo(seq[0].x, -seq[0].z)
  for (let i = 1; i < seq.length; i++) path.lineTo(seq[i].x, -seq[i].z)
  path.closePath()
  return path
}

function BuildingMesh() {
  const geometry = useMemo(() => {
    const outer = site.building.footprint
    const shape = new Shape()
    shape.moveTo(outer[0].x, -outer[0].z)
    for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i].x, -outer[i].z)
    shape.closePath()

    const outerSign = Math.sign(signedArea(outer)) || 1
    for (const hole of site.building.holes) {
      if (hole.length < 3) continue
      const holeSign = Math.sign(signedArea(hole)) || 1
      shape.holes.push(ringToPath(hole, holeSign === outerSign))
    }

    const geo = new ExtrudeGeometry(shape, {
      depth: site.building.heightM,
      bevelEnabled: false,
      curveSegments: 1,
    })
    geo.rotateX(-Math.PI / 2)
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={BRICK} roughness={0.92} metalness={0} />
    </mesh>
  )
}

function Ground() {
  const bounds = footprintBounds(GROUND_PAD)
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[bounds.centre.x, -0.02, bounds.centre.z]}
      receiveShadow
    >
      <planeGeometry args={[bounds.width, bounds.depth]} />
      <meshStandardMaterial color={LAWN} roughness={1} />
    </mesh>
  )
}

function CourtyardFill() {
  const hole = site.building.holes[0]
  const geometry = useMemo(() => {
    if (!hole || hole.length < 3) return null
    const shape = new Shape()
    shape.moveTo(hole[0].x, -hole[0].z)
    for (let i = 1; i < hole.length; i++) shape.lineTo(hole[i].x, -hole[i].z)
    shape.closePath()
    const geo = new ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false })
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [hole])
  if (!geometry) return null
  return (
    <mesh geometry={geometry} position={[0, 0.01, 0]}>
      <meshStandardMaterial color={COURTYARD} roughness={1} />
    </mesh>
  )
}

function GridOverlay() {
  const cells = site.fireGrid.cells.filter((c) => c.floor === 0)
  const angle = site.building.orientedBounds.angleRad
  return (
    <group position={[0, site.building.heightM + 0.12, 0]}>
      {cells.map((cell) => {
        const color = cell.isCore
          ? '#5c4033'
          : cell.facades.includes('south')
            ? '#c45c2a'
            : cell.facades.includes('north')
              ? '#3a6ea5'
              : '#d8c7a4'
        return (
          <group key={cell.id} position={[cell.centre.x, 0, cell.centre.z]} rotation={[0, -angle, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[cell.size.x * 0.86, cell.size.z * 0.86]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} side={DoubleSide} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Compass() {
  const bounds = footprintBounds(8)
  const southZ = bounds.maxZ + 18
  const northZ = bounds.minZ - 14
  const x = site.building.centroid.x
  return (
    <group>
      <Text
        position={[x, 0.4, southZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={4.2}
        color="#efe6d6"
        anchorX="center"
        anchorY="middle"
      >
        SOUTH · ALUMNI PARK
      </Text>
      <Text
        position={[x, 0.4, northZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={3.2}
        color="#9aa7b8"
        anchorX="center"
        anchorY="middle"
      >
        NORTH
      </Text>
      <mesh position={[x, 0.06, southZ - 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 14]} />
        <meshBasicMaterial color="#efe6d6" />
      </mesh>
    </group>
  )
}

function Outline() {
  const points = useMemo(() => {
    const ring = site.building.footprint
    return ring.concat(ring[0]).map((p) => [p.x, 0.08, p.z] as [number, number, number])
  }, [])
  return <Line points={points} color={BRICK_EDGE} lineWidth={1.2} />
}

export function FootprintView() {
  const look = site.building.centroid
  return (
    <>
      <color attach="background" args={['#14181e']} />
      <fog attach="fog" args={['#14181e', 180, 420]} />
      <PerspectiveCamera makeDefault position={[look.x + 28, 118, look.z + 96]} fov={42} near={0.4} far={800} />
      <ambientLight intensity={0.55} color="#e8e2d4" />
      <hemisphereLight args={['#9aa8b8', '#2a2418', 0.7]} />
      <directionalLight position={[40, 80, 20]} intensity={1.15} color="#fff4e0" castShadow />
      <Ground />
      <CourtyardFill />
      <BuildingMesh />
      <Outline />
      <GridOverlay />
      <Compass />
      <OrbitControls
        makeDefault
        target={[look.x, site.building.heightM * 0.35, look.z]}
        enablePan
        minDistance={28}
        maxDistance={240}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  )
}
