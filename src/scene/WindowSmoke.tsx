import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, Object3D, PlaneGeometry, MeshBasicMaterial, Color } from 'three'
import { useRun } from '../run/store'
import type { FireCell } from '../run/types'
import { openingSocket, socketsFor } from './opening-socket'

const MAX = 240
const PUFFS = 8
const HAZE = 3

export function smokeSocketOutside(cell: FireCell) {
  return socketsFor(cell)
}

export function WindowSmoke() {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const geo = useMemo(() => new PlaneGeometry(1.15, 1.55), [])
  const mat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color('#d4b48a'),
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        fog: true,
      }),
    [],
  )

  useFrame((state) => {
    const inst = mesh.current
    if (!inst) return
    const t = state.clock.elapsedTime
    const run = useRun.getState()
    const burning = run.cells
      .filter((c) => c.preVent || c.vented)
      .sort((a, b) => Number(b.preVent && !b.vented) - Number(a.preVent && !a.vented))
    const fireSocks = burning.slice(0, 20).flatMap((c) => socketsFor(c).map((s) => ({ ...s, hot: c.vented })))
    const occupied = run.cells.filter((c) => {
      if (c.vented || c.preVent) return false
      return run.victims.some((v) => v.cellId === c.id && (v.state === 'WAITING' || v.state === 'MARKED'))
    })
    const hazeSocks = occupied
      .slice(0, 12)
      .map((c) => {
        const ext = run.extractions.find((e) => e.cellId === c.id)
        return openingSocket(c, ext?.facade)
      })
      .filter((s): s is NonNullable<typeof s> => s != null)
    const burstIds = new Set(
      run.vents.filter((v) => v.kind === 'vent' && run.t - v.t < 5).map((v) => v.cellId),
    )

    let i = 0
    for (const sock of fireSocks) {
      const burst = sock.hot && burstIds.size > 0
      const extra = burst ? 3 : 0
      for (let p = 0; p < PUFFS + extra && i < MAX; p++, i++) {
        const age = (t * (0.2 + p * 0.045) + sock.x * 0.05 + p * 0.91) % 1
        const rise = age * (sock.hot ? 6.4 : 4.6) + p * 0.28
        const drift = age * (sock.hot ? 2.2 : 1.5)
        const swirl = Math.sin(t * 0.7 + p + sock.z) * age * (sock.hot ? 0.85 : 0.5)
        dummy.position.set(
          sock.x + sock.nx * (0.4 + drift) + sock.nz * swirl,
          sock.y + rise,
          sock.z + sock.nz * (0.4 + drift) - sock.nx * swirl,
        )
        dummy.scale.setScalar(0.5 + age * (sock.hot ? 2.4 : 1.8) + p * 0.04)
        dummy.lookAt(state.camera.position)
        dummy.updateMatrix()
        inst.setMatrixAt(i, dummy.matrix)
      }
    }
    for (const sock of hazeSocks) {
      for (let p = 0; p < HAZE && i < MAX; p++, i++) {
        const age = (t * (0.12 + p * 0.03) + sock.x * 0.08 + p * 0.4) % 1
        dummy.position.set(
          sock.x + sock.nx * (0.2 + age * 0.9) + sock.nz * Math.sin(t + p) * 0.2,
          sock.y + age * 1.6,
          sock.z + sock.nz * (0.2 + age * 0.9) - sock.nx * Math.sin(t + p) * 0.2,
        )
        dummy.scale.setScalar(0.35 + age * 0.9)
        dummy.lookAt(state.camera.position)
        dummy.updateMatrix()
        inst.setMatrixAt(i, dummy.matrix)
      }
    }
    dummy.scale.setScalar(0)
    dummy.position.set(0, -20, 0)
    dummy.updateMatrix()
    while (i < MAX) {
      inst.setMatrixAt(i, dummy.matrix)
      i++
    }
    inst.instanceMatrix.needsUpdate = true
    const venting = fireSocks.some((s) => s.hot)
    mat.opacity = venting ? 0.3 : 0.2 + Math.min(0.1, hazeSocks.length * 0.01)
    mat.color.set(venting ? '#e3a36a' : '#d4b48a')
  })

  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} />
}
