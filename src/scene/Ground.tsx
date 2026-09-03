import { useMemo } from 'react'
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, PlaneGeometry, Vector3 } from 'three'
import {
  COVER_COLOR,
  GROUND,
  THERMAL_COLOR,
  coverAt,
  heightAt,
  pointInPoly,
  type Cover,
  type Vec2,
} from '../game/ground'
import { satPlane } from '../game/world'

function shade(cover: Cover, x: number, z: number, thermal: boolean): [number, number, number] {
  const [r, g, b] = thermal ? THERMAL_COLOR[cover] : COVER_COLOR[cover]
  const n =
    (Math.sin(x * 0.19) * Math.cos(z * 0.15) +
      Math.sin((x + z) * 0.06) * 0.55 +
      Math.cos(x * 0.035 - z * 0.028) * 0.35) *
    0.5
  const vary = 1 + n * 0.12
  return [Math.min(1, r * vary), Math.min(1, g * vary), Math.min(1, b * vary)]
}

function polyBox(poly: Vec2[]) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const [x, z] of poly) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  return { minX, maxX, minZ, maxZ }
}

function polyMedianHeight(poly: Vec2[]) {
  const ys = poly.map(([x, z]) => heightAt(x, z)).sort((a, b) => a - b)
  return ys[Math.floor(ys.length / 2)] ?? 0
}

/** Drape a filled polygon onto the DEM the way Pebble drapes greens and cart paths. */
function drapedPolyGeometry(poly: Vec2[], lift: number, step = 3.4): BufferGeometry | null {
  if (poly.length < 3) return null
  const box = polyBox(poly)
  const width = box.maxX - box.minX
  const depth = box.maxZ - box.minZ
  if (width < 0.8 || depth < 0.8) return null
  const fallback = polyMedianHeight(poly)
  const cols = Math.max(2, Math.min(48, Math.ceil(width / step) + 1))
  const rows = Math.max(2, Math.min(48, Math.ceil(depth / step) + 1))
  const xs = Array.from({ length: cols }, (_, i) => box.minX + (width * i) / (cols - 1))
  const zs = Array.from({ length: rows }, (_, i) => box.minZ + (depth * i) / (rows - 1))
  const idxOf = (c: number, r: number) => r * cols + c
  const inside = new Array<boolean>(cols * rows)
  const positions = new Float32Array(cols * rows * 3)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = xs[c]
      const z = zs[r]
      const on = pointInPoly(x, z, poly)
      inside[idxOf(c, r)] = on
      const i = idxOf(c, r) * 3
      const y = heightAt(x, z)
      positions[i] = x
      positions[i + 1] = (Number.isFinite(y) ? y : fallback) + lift
      positions[i + 2] = z
    }
  }
  const indices: number[] = []
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = idxOf(c, r)
      const b = idxOf(c + 1, r)
      const d = idxOf(c, r + 1)
      const e = idxOf(c + 1, r + 1)
      const count = (inside[a] ? 1 : 0) + (inside[b] ? 1 : 0) + (inside[d] ? 1 : 0) + (inside[e] ? 1 : 0)
      if (count < 3) continue
      if (inside[a] && inside[b] && inside[e]) indices.push(a, b, e)
      if (inside[a] && inside[e] && inside[d]) indices.push(a, e, d)
      if (count === 3 && !(inside[a] && inside[b] && inside[e]) && !(inside[a] && inside[e] && inside[d])) {
        const cell = [a, b, e, d].filter((i) => inside[i])
        if (cell.length === 3) indices.push(cell[0], cell[1], cell[2])
      }
    }
  }
  if (indices.length < 3) return null
  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function Overlay({
  polygons,
  lift,
  step,
  color,
}: {
  polygons: Vec2[][]
  lift: number
  step: number
  color: string
}) {
  const geos = useMemo(
    () => polygons.map((poly) => drapedPolyGeometry(poly, lift, step)).filter((g): g is BufferGeometry => Boolean(g)),
    [lift, polygons, step],
  )
  return (
    <group>
      {geos.map((geometry, i) => (
        <mesh key={i} geometry={geometry} receiveShadow>
          <meshBasicMaterial
            color={color}
            polygonOffset
            polygonOffsetFactor={-2}
            polygonOffsetUnits={-2}
          />
        </mesh>
      ))}
    </group>
  )
}

export function Ground({ thermal }: { thermal: boolean }) {
  const sat = satPlane()
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(sat.width, sat.depth, 88, 58)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + sat.cx
      const z = pos.getZ(i) + sat.cz
      const cover = coverAt(x, z)
      pos.setXYZ(i, x, heightAt(x, z), z)
      const [r, g, b] = shade(cover, x, z, thermal)
      colors[i * 3] = r
      colors[i * 3 + 1] = g
      colors[i * 3 + 2] = b
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [sat.cx, sat.cz, sat.depth, sat.width, thermal])

  const ribbons = useMemo(() => {
    return GROUND.paths
      .filter((path) => path.length >= 2)
      .slice(0, 12)
      .map((path) => {
        const pts = path.map(([x, z]) => new Vector3(x, heightAt(x, z) + 0.07, z))
        return new CatmullRomCurve3(pts, false, 'catmullrom', 0.15)
      })
  }, [])

  const walks = useMemo(() => GROUND.walks.map((p) => p.polygon), [])
  const plazas = useMemo(() => GROUND.plazas.map((p) => p.polygon), [])
  const streets = useMemo(() => GROUND.streets.map((p) => p.polygon), [])
  const steps = useMemo(() => GROUND.steps.map((p) => p.polygon), [])
  const stepY = heightAt(108.6, 50.2)

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.03} />
      </mesh>
      {!thermal && (
        <>
          <Overlay polygons={streets} lift={0.04} step={8} color="#6a6662" />
          <Overlay polygons={walks} lift={0.07} step={5.2} color="#c4b08a" />
          <Overlay polygons={plazas} lift={0.09} step={6} color="#d2c09a" />
          <Overlay polygons={steps} lift={0.14} step={4.2} color="#ddd0b4" />
        </>
      )}
      {ribbons.map((curve, i) => (
        <mesh key={i} receiveShadow>
          <tubeGeometry args={[curve, Math.max(8, curve.points.length * 2), i === 0 ? 1.7 : 0.85, 4, false]} />
          <meshStandardMaterial
            color={thermal ? '#245868' : i === 0 ? '#c4b08a' : '#8a7b68'}
            roughness={0.95}
          />
        </mesh>
      ))}
      <mesh position={[108.6, stepY + 0.2, 50.2]} rotation={[0, 1.28, 0]} receiveShadow castShadow>
        <boxGeometry args={[11, 0.38, 7.2]} />
        <meshStandardMaterial color={thermal ? '#2a6070' : '#b8a888'} roughness={0.88} />
      </mesh>
    </group>
  )
}
