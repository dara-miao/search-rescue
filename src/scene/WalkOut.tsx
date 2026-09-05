import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { site } from '../data/site'
import { evacueePose } from '../run/evacuees'
import { useRun } from '../run/store'
import { heightAt } from './site-ground.js'

const MAX = 48

export function WalkOut() {
  const bodies = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame(() => {
    const body = bodies.current
    const head = heads.current
    if (!body || !head) return
    const run = useRun.getState()
    let i = 0
    for (const evac of run.evacuees) {
      if (i >= MAX) break
      const pose = evacueePose(evac, run.t)
      if (!pose.visible) continue
      const ground = heightAt(pose.x, pose.z, site) + 0.72
      const y = pose.y > 0.5 ? pose.y : ground
      const yaw = Math.atan2(pose.hx, pose.hz)
      dummy.position.set(pose.x, y, pose.z)
      dummy.rotation.set(pose.y > ground + 0.4 ? 0.4 : 0, yaw, 0)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      body.setMatrixAt(i, dummy.matrix)
      dummy.position.set(pose.x, y + 0.46, pose.z)
      dummy.rotation.set(0, yaw, 0)
      dummy.scale.setScalar(0.92)
      dummy.updateMatrix()
      head.setMatrixAt(i, dummy.matrix)
      i++
    }
    dummy.scale.setScalar(0)
    dummy.position.set(0, -20, 0)
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
        <capsuleGeometry args={[0.18, 0.54, 5, 8]} />
        <meshStandardMaterial color="#d8b48c" roughness={0.6} emissive="#6a3418" emissiveIntensity={0.85} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#e8c8a8" roughness={0.52} emissive="#5a2c12" emissiveIntensity={0.75} />
      </instancedMesh>
    </group>
  )
}
