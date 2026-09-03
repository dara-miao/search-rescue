import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { site } from '../data/site'
import { heightAt } from './site-ground.js'
import { useRun } from '../run/store'

const MAX = 40
const CX = site.building.orientedBounds.centre.x
const CZ = site.building.orientedBounds.centre.z

function lawnPoint(x: number, z: number, extra = 0.95) {
  const dx = x - CX
  const dz = z - CZ
  const len = Math.hypot(dx, dz) || 1
  return { x: x + (dx / len) * extra, z: z + (dz / len) * extra, yaw: Math.atan2(dx, dz) }
}

/** People waiting at live openings. Visible without thermal. */
export function WindowPeople() {
  const bodies = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame((state) => {
    const body = bodies.current
    const head = heads.current
    if (!body || !head) return
    const run = useRun.getState()
    const t = state.clock.elapsedTime
    let i = 0
    for (const victim of run.victims) {
      if (victim.state !== 'WAITING' && victim.state !== 'MARKED') continue
      const n = Math.max(1, Math.min(victim.count, 4))
      const lawn = lawnPoint(victim.x, victim.z)
      const tx = -Math.cos(lawn.yaw)
      const tz = Math.sin(lawn.yaw)
      for (let k = 0; k < n && i < MAX; k++) {
        const spread = (k - (n - 1) / 2) * 0.42
        const bob = Math.sin(t * 1.7 + victim.x + k) * 0.05
        const px = lawn.x + tx * spread
        const pz = lawn.z + tz * spread
        const y = heightAt(px, pz, site) + bob
        const marked = victim.state === 'MARKED'
        dummy.position.set(px, y + 0.62, pz)
        dummy.rotation.set(0, lawn.yaw, 0)
        dummy.scale.setScalar(marked ? 0.86 : 1)
        dummy.updateMatrix()
        body.setMatrixAt(i, dummy.matrix)
        dummy.position.set(px, y + 1.08, pz)
        dummy.scale.setScalar(marked ? 0.78 : 0.92)
        dummy.updateMatrix()
        head.setMatrixAt(i, dummy.matrix)
        i++
      }
    }
    dummy.scale.setScalar(0)
    dummy.position.set(0, -40, 0)
    dummy.updateMatrix()
    while (i < MAX) {
      body.setMatrixAt(i, dummy.matrix)
      head.setMatrixAt(i, dummy.matrix)
      i++
    }
    body.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
    body.count = MAX
    head.count = MAX
  })

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <capsuleGeometry args={[0.2, 0.62, 4, 8]} />
        <meshStandardMaterial
          color="#d4b08a"
          roughness={0.62}
          emissive="#5a2e14"
          emissiveIntensity={0.85}
        />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial
          color="#e2c4a4"
          roughness={0.55}
          emissive="#4a2810"
          emissiveIntensity={0.7}
        />
      </instancedMesh>
    </group>
  )
}
