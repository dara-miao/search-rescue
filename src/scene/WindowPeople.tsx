import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { holdFrac } from '../run/hold'
import { useRun } from '../run/store'
import { openingSocket } from './opening-socket'

const MAX = 40

/** People in the window frame. Count stays hidden until you assess. */
export function WindowPeople() {
  const bodies = useRef<InstancedMesh>(null)
  const heads = useRef<InstancedMesh>(null)
  const arms = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])

  useFrame((state) => {
    const body = bodies.current
    const head = heads.current
    const arm = arms.current
    if (!body || !head || !arm) return
    const run = useRun.getState()
    const t = state.clock.elapsedTime
    let i = 0
    let a = 0
    for (const victim of run.victims) {
      if (victim.state !== 'WAITING' && victim.state !== 'MARKED') continue
      const cell = run.cells.find((c) => c.id === victim.cellId)
      if (!cell) continue
      const ext = run.extractions.find((e) => e.cellId === victim.cellId)
      const sock = openingSocket(cell, ext?.facade)
      if (!sock) continue
      const n = victim.scanned ? Math.max(1, Math.min(victim.count, 4)) : 1
      const working = run.hold.targetId === victim.id && run.hold.kind !== 'idle'
      const frac = working ? holdFrac(run.hold) : 0
      const lean =
        working && run.hold.kind === 'rescue' ? 0.22 + frac * 0.7 : working ? 0.32 : 0.14
      const drop = working && run.hold.kind === 'rescue' ? frac * 0.85 : 0
      const reach = working ? 0.22 + frac * 0.18 : 0.08
      const marked = victim.state === 'MARKED'
      const yaw = Math.atan2(sock.nx, sock.nz)
      const tx = -sock.nz
      const tz = sock.nx
      for (let k = 0; k < n && i < MAX; k++) {
        const spread = (k - (n - 1) / 2) * 0.38
        const bob = Math.sin(t * (working ? 3.2 : 1.6) + victim.x + k) * (working ? 0.08 : 0.04)
        const px = sock.x + sock.nx * lean + tx * spread
        const pz = sock.z + sock.nz * lean + tz * spread
        const y = sock.y - drop + bob
        const scale = marked ? 0.86 : 1
        dummy.position.set(px, y, pz)
        dummy.rotation.set(working && run.hold.kind === 'rescue' ? 0.35 * frac : 0.08, yaw, 0)
        dummy.scale.setScalar(scale)
        dummy.updateMatrix()
        body.setMatrixAt(i, dummy.matrix)
        dummy.position.set(px + sock.nx * 0.04, y + 0.48, pz + sock.nz * 0.04)
        dummy.rotation.set(0, yaw, 0)
        dummy.scale.setScalar(scale * 0.94)
        dummy.updateMatrix()
        head.setMatrixAt(i, dummy.matrix)
        i++
        for (const side of [-1, 1]) {
          if (a >= MAX * 2) break
          dummy.position.set(
            px + tx * side * 0.2 + sock.nx * reach,
            y + 0.12 + (working ? 0.06 : 0),
            pz + tz * side * 0.2 + sock.nz * reach,
          )
          dummy.rotation.set(0.55 + reach, yaw, side * 0.35)
          dummy.scale.set(0.55, 0.7, 0.55)
          dummy.updateMatrix()
          arm.setMatrixAt(a, dummy.matrix)
          a++
        }
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
    while (a < MAX * 2) {
      arm.setMatrixAt(a, dummy.matrix)
      a++
    }
    body.instanceMatrix.needsUpdate = true
    head.instanceMatrix.needsUpdate = true
    arm.instanceMatrix.needsUpdate = true
    body.count = MAX
    head.count = MAX
    arm.count = MAX * 2
  })

  return (
    <group>
      <instancedMesh ref={bodies} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <capsuleGeometry args={[0.22, 0.58, 5, 8]} />
        <meshStandardMaterial color="#d8b48c" roughness={0.58} emissive="#6a3418" emissiveIntensity={1.05} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <sphereGeometry args={[0.17, 10, 8]} />
        <meshStandardMaterial color="#e8c8a8" roughness={0.5} emissive="#5a2c12" emissiveIntensity={0.9} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, undefined, MAX * 2]} frustumCulled={false}>
        <capsuleGeometry args={[0.07, 0.34, 4, 6]} />
        <meshStandardMaterial color="#d4b08a" roughness={0.6} emissive="#5a2e14" emissiveIntensity={0.85} />
      </instancedMesh>
    </group>
  )
}
