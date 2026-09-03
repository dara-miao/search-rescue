import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { site } from '../data/site'
import { useDrive } from '../drive/store'
import { nearestPlayOpening } from '../run/opening'
import { useRun } from '../run/store'
import { heightAt } from './site-ground.js'

const MAX = 20

/** Lawn rings under occupied openings so the next door is visible from staging. */
export function OpeningBeacons() {
  const rings = useRef<InstancedMesh>(null)
  const pillar = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame((state) => {
    const ring = rings.current
    const col = pillar.current
    if (!ring || !col) return
    const run = useRun.getState()
    const drive = useDrive.getState()
    const focus = nearestPlayOpening(drive.x, drive.z, run)
    const pulse = 0.82 + Math.sin(state.clock.elapsedTime * 2.4) * 0.18
    let i = 0
    for (const ext of run.extractions) {
      if (i >= MAX) break
      const cell = run.cells.find((c) => c.id === ext.cellId)
      if (!cell || cell.vented) continue
      const waiting = run.victims.filter((v) => v.cellId === ext.cellId && v.state === 'WAITING').length
      if (!waiting) continue
      const y = heightAt(ext.x, ext.z, site)
      const hot = focus?.ext.id === ext.id
      dummy.position.set(ext.x, y + 0.06, ext.z)
      dummy.rotation.set(-Math.PI / 2, 0, 0)
      dummy.scale.setScalar(hot ? 1.15 * pulse : 0.72)
      dummy.updateMatrix()
      ring.setMatrixAt(i, dummy.matrix)
      dummy.rotation.set(0, 0, 0)
      dummy.position.set(ext.x, y + (hot ? 1.6 * pulse : 0.9), ext.z)
      dummy.scale.set(hot ? 1 : 0.55, hot ? 3.2 * pulse : 1.4, hot ? 1 : 0.55)
      dummy.updateMatrix()
      col.setMatrixAt(i, dummy.matrix)
      i++
    }
    dummy.scale.setScalar(0)
    dummy.position.set(0, -40, 0)
    dummy.updateMatrix()
    while (i < MAX) {
      ring.setMatrixAt(i, dummy.matrix)
      col.setMatrixAt(i, dummy.matrix)
      i++
    }
    ring.instanceMatrix.needsUpdate = true
    col.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={rings} args={[undefined, undefined, MAX]} frustumCulled={false} renderOrder={14}>
        <ringGeometry args={[1.15, 1.55, 28]} />
        <meshBasicMaterial color="#5ad0e8" transparent opacity={0.55} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={pillar} args={[undefined, undefined, MAX]} frustumCulled={false} renderOrder={15}>
        <cylinderGeometry args={[0.07, 0.14, 1, 8]} />
        <meshBasicMaterial color="#7ae7f4" transparent opacity={0.42} depthWrite={false} />
      </instancedMesh>
    </group>
  )
}
