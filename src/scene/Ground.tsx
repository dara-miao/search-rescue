import { useMemo } from 'react'
import { BufferAttribute, CatmullRomCurve3, PlaneGeometry, Vector3 } from 'three'
import { COVER_COLOR, GROUND, THERMAL_COLOR, coverAt, heightAt, type Cover } from '../game/ground'
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

export function Ground({ thermal }: { thermal: boolean }) {
  const sat = satPlane()
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(sat.width, sat.depth, 168, 112)
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
      .slice(0, 36)
      .map((path) => {
        const pts = path.map(([x, z]) => new Vector3(x, heightAt(x, z) + 0.07, z))
        return new CatmullRomCurve3(pts, false, 'catmullrom', 0.15)
      })
  }, [])

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.03} toneMapped={false} />
      </mesh>
      {ribbons.map((curve, i) => (
        <mesh key={i} receiveShadow>
          <tubeGeometry args={[curve, Math.max(10, curve.points.length * 4), i === 0 ? 1.7 : 0.85, 5, false]} />
          <meshStandardMaterial
            color={thermal ? '#245868' : i === 0 ? '#c4b08a' : '#8a7b68'}
            roughness={0.95}
          />
        </mesh>
      ))}
      <mesh position={[108.6, 0.2, 50.2]} rotation={[0, 1.28, 0]} receiveShadow castShadow>
        <boxGeometry args={[11, 0.38, 7.2]} />
        <meshStandardMaterial color={thermal ? '#2a6070' : '#b8a888'} roughness={0.88} />
      </mesh>
    </group>
  )
}
