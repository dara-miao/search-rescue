import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { InstancedMesh, Object3D, PlaneGeometry, MeshBasicMaterial, Color } from 'three'
import { site } from '../data/site'
import { MASSING_CONFIG } from './doheny-massing.js'
import { useRun } from '../run/store'
import type { FireCell } from '../run/types'

const MAX = 72
const PUFFS = 3

function outward(facade: FireCell['facades'][number], angle: number) {
  const local =
    facade === 'south' ? { x: 0, z: 1 } : facade === 'north' ? { x: 0, z: -1 } : facade === 'east' ? { x: 1, z: 0 } : { x: -1, z: 0 }
  const c = Math.cos(-angle)
  const s = Math.sin(-angle)
  return { x: local.x * c + local.z * s, z: -local.x * s + local.z * c }
}

function socketsFor(cell: FireCell) {
  const θ = site.building.orientedBounds.angleRad
  const y = cell.floor * MASSING_CONFIG.storeyHeight + MASSING_CONFIG.storeyHeight * 0.55
  return cell.facades.map((facade) => {
    const n = outward(facade, θ)
    const along = facade === 'north' || facade === 'south' ? cell.size.z * 0.5 : cell.size.x * 0.5
    return {
      x: cell.centre.x + n.x * (along + 0.55),
      y,
      z: cell.centre.z + n.z * (along + 0.55),
      nx: n.x,
      nz: n.z,
      hot: cell.vented,
    }
  })
}

export function WindowSmoke() {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const geo = useMemo(() => new PlaneGeometry(1.6, 2.4), [])
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
    const cells = useRun.getState().cells
    const active = cells.filter((c) => c.preVent || c.vented).sort((a, b) => Number(b.preVent && !b.vented) - Number(a.preVent && !a.vented))
    const sockets = active.slice(0, 24).flatMap(socketsFor)
    let i = 0
    for (const sock of sockets) {
      for (let p = 0; p < PUFFS && i < MAX; p++, i++) {
        const age = (t * (0.22 + p * 0.05) + sock.x * 0.05 + p * 1.7) % 1
        const rise = age * 3.4
        const drift = age * 1.1
        dummy.position.set(sock.x + sock.nx * (0.4 + drift), sock.y + rise, sock.z + sock.nz * (0.4 + drift))
        dummy.scale.setScalar(0.7 + age * 1.6 + (sock.hot ? 0.35 : 0))
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
    mat.opacity = 0.18 + Math.min(0.16, sockets.length * 0.008)
    mat.color.set(sockets.some((s) => s.hot) ? '#e3a36a' : '#d4b48a')
  })

  return <instancedMesh ref={mesh} args={[geo, mat, MAX]} frustumCulled={false} />
}

export function smokeSocketOutside(cell: FireCell) {
  return socketsFor(cell)
}
