import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, InstancedMesh, Object3D, type PointLight } from 'three'
import { heightAt } from '../game/ground'
import { useGame } from '../game/store'
import type { HotCell } from '../sim/types'

const dummy = new Object3D()
const flameColor = new Color()
const MAX = 160

function FlameField({ thermal }: { thermal: boolean }) {
  const mesh = useRef<InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: MAX }, () => ({
        t: Math.random() * Math.PI * 2,
        s: 0.45 + Math.random() * 0.7,
        speed: 0.65 + Math.random() * 1.1,
        jx: (Math.random() - 0.5) * 2.4,
        jz: (Math.random() - 0.5) * 2.4,
      })),
    [],
  )

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const hot = useGame.getState().sim.field.hot
    const t = clock.elapsedTime
    for (let i = 0; i < MAX; i++) {
      const cell: HotCell | undefined = hot[i]
      const p = seeds[i]
      if (!cell) {
        dummy.position.set(0, -40, 0)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        continue
      }
      const life = ((t * p.speed + p.t) % 1.8) / 1.8
      const y = heightAt(cell.x, cell.z) + 1.1 + life * (4 + cell.heat * 10)
      dummy.position.set(cell.x + p.jx, y, cell.z + p.jz)
      const scale = p.s * (1 - life) * (0.4 + cell.heat)
      dummy.scale.set(scale * 0.55, scale * 1.6, scale * 0.55)
      dummy.rotation.y = p.t
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      flameColor.setHSL(thermal ? 0.08 : 0.065 - life * 0.04, 1, thermal ? 0.55 : 0.5 - life * 0.18)
      m.setColorAt(i, flameColor)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    m.count = Math.min(MAX, Math.max(1, hot.length))
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]}>
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

function Smoke({ thermal }: { thermal: boolean }) {
  const mesh = useRef<InstancedMesh>(null)
  const seeds = useMemo(
    () =>
      Array.from({ length: MAX }, () => ({
        t: Math.random() * 10,
        s: 1.1 + Math.random() * 2.2,
        speed: 0.1 + Math.random() * 0.16,
      })),
    [],
  )

  useFrame(({ clock }) => {
    const m = mesh.current
    if (!m) return
    const hot = useGame.getState().sim.field.hot
    const t = clock.elapsedTime
    let shown = 0
    for (let i = 0; i < MAX; i++) {
      const cell = hot[i]
      const p = seeds[i]
      if (!cell || cell.smoke < 0.12) {
        dummy.position.set(0, -50, 0)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        m.setMatrixAt(i, dummy.matrix)
        continue
      }
      const life = (t * p.speed + p.t) % 1
      dummy.position.set(cell.x, heightAt(cell.x, cell.z) + 6 + life * 22, cell.z)
      const sc = p.s * (0.5 + cell.smoke) * (0.7 + life * 1.8)
      dummy.scale.set(sc, sc * 0.7, sc)
      dummy.rotation.y = p.t + life
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      shown++
    }
    m.instanceMatrix.needsUpdate = true
    m.count = Math.min(MAX, Math.max(1, shown))
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]}>
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

function PeakLight({ thermal }: { thermal: boolean }) {
  const light = useRef<PointLight>(null)
  useFrame(() => {
    const peak = useGame.getState().sim.field.hot[0]
    const l = light.current
    if (!l) return
    if (!peak || peak.heat < 0.2) {
      l.intensity = 0
      return
    }
    l.position.set(peak.x, heightAt(peak.x, peak.z) + 8, peak.z)
    l.intensity = (thermal ? 8 : 70) * peak.heat
    l.distance = 50 + 40 * peak.heat
  })
  return <pointLight ref={light} color={thermal ? '#ff6600' : '#ff6a1a'} distance={70} />
}

export function Fire({ thermal }: { thermal: boolean }) {
  return (
    <group>
      <FlameField thermal={thermal} />
      <Smoke thermal={thermal} />
      <PeakLight thermal={thermal} />
    </group>
  )
}
