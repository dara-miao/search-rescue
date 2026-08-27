import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D } from 'three'
import { DOHENY } from '../game/world'

const dummy = new Object3D()
const flameColor = new Color()

function FlameField({
  origin,
  count,
  spread,
  height,
  thermal,
}: {
  origin: [number, number, number]
  count: number
  spread: number
  height: number
  thermal: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * spread,
        z: (Math.random() - 0.5) * spread * 0.55,
        t: Math.random() * Math.PI * 2,
        s: 0.4 + Math.random() * 0.8,
        speed: 0.65 + Math.random() * 1.15,
      })),
    [count, spread],
  )

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < seeds.length; i++) {
      const p = seeds[i]
      const life = ((t * p.speed + p.t) % 1.8) / 1.8
      dummy.position.set(origin[0] + p.x + Math.sin(t * 3 + p.t) * 0.3, origin[1] + life * height, origin[2] + p.z)
      const scale = p.s * (1 - life) * (0.55 + Math.sin(t * 8 + p.t) * 0.12)
      dummy.scale.set(scale * 0.55, scale * 1.5, scale * 0.55)
      dummy.rotation.y = p.t
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      flameColor.setHSL(thermal ? 0.08 : 0.065 - life * 0.04, 1, thermal ? 0.55 : 0.52 - life * 0.2)
      m.setColorAt(i, flameColor)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <coneGeometry args={[0.5, 1.2, 5]} />
      <meshStandardMaterial
        color={thermal ? '#ff6a00' : '#ff4d00'}
        emissive={thermal ? '#ff8a00' : '#ff2a00'}
        emissiveIntensity={thermal ? 4 : 2.8}
        toneMapped={false}
      />
    </instancedMesh>
  )
}

function Smoke({
  origin,
  count,
  thermal,
}: {
  origin: [number, number, number]
  count: number
  thermal: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        x: (Math.random() - 0.5) * 14,
        z: (Math.random() - 0.5) * 10,
        t: Math.random() * 10,
        s: 1.1 + Math.random() * 2.2,
        speed: 0.1 + Math.random() * 0.16,
      })),
    [count],
  )

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const t = clock.elapsedTime
    for (let i = 0; i < seeds.length; i++) {
      const p = seeds[i]
      const life = (t * p.speed + p.t) % 1
      dummy.position.set(origin[0] + p.x + Math.sin(t * 0.4 + p.t) * 2.2, origin[1] + life * 28, origin[2] + p.z)
      const sc = p.s * (0.7 + life * 2.1)
      dummy.scale.set(sc, sc * 0.7, sc)
      dummy.rotation.y = p.t + life
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.8, 6, 6]} />
      <meshStandardMaterial
        color={thermal ? '#1a1010' : '#2a2422'}
        transparent
        opacity={thermal ? 0.12 : 0.26}
        depthWrite={false}
      />
    </instancedMesh>
  )
}

export function Fire({ thermal }: { thermal: boolean }) {
  const x = DOHENY.cx
  const z = DOHENY.cz
  const h = DOHENY.height
  return (
    <group>
      <FlameField origin={[x, 1.4, z]} count={90} spread={18} height={h * 0.55} thermal={thermal} />
      <FlameField origin={[x - 8, 3, z + 4]} count={50} spread={8} height={h * 0.45} thermal={thermal} />
      <FlameField origin={[x + 7, h * 0.45, z - 3]} count={46} spread={9} height={h * 0.5} thermal={thermal} />
      <FlameField origin={[x, h * 0.7, z]} count={40} spread={14} height={8} thermal={thermal} />
      <Smoke origin={[x, h * 0.85, z]} count={42} thermal={thermal} />
      <pointLight position={[x, 8, z]} intensity={thermal ? 10 : 90} distance={70} color={thermal ? '#ff6600' : '#ff6a1a'} />
      <pointLight position={[x - 8, 5, z]} intensity={thermal ? 5 : 36} distance={32} color="#ff3c00" />
      <pointLight position={[x + 6, 10, z - 4]} intensity={thermal ? 5 : 30} distance={28} color="#ff8a20" />
    </group>
  )
}
