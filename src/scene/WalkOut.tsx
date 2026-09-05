import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { site } from '../data/site'
import { heightAt } from './site-ground.js'
import { evacueePose } from '../run/evacuees'
import { useRun } from '../run/store'

const MAX = 48

export function WalkOut() {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const inst = mesh.current
    if (!inst) return
    const run = useRun.getState()
    let i = 0
    for (const evac of run.evacuees) {
      if (i >= MAX) break
      const pose = evacueePose(evac, run.t)
      if (!pose.visible) continue
      dummy.position.set(pose.x, heightAt(pose.x, pose.z, site) + 0.72, pose.z)
      dummy.rotation.set(0, Math.atan2(pose.hx, pose.hz), 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
      i++
    }
    dummy.scale.setScalar(0)
    dummy.position.set(0, -20, 0)
    dummy.updateMatrix()
    while (i < MAX) {
      inst.setMatrixAt(i, dummy.matrix)
      i++
    }
    inst.instanceMatrix.needsUpdate = true
    inst.count = MAX
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX]} frustumCulled={false}>
      <capsuleGeometry args={[0.16, 0.52, 4, 8]} />
      <meshStandardMaterial color="#c4a07a" roughness={0.72} emissive="#2a1810" emissiveIntensity={0.2} />
    </instancedMesh>
  )
}
