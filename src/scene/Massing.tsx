import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { BufferGeometry, Group, Material, Mesh } from 'three'
import { site } from '../data/site'
import { windowHeatLookup } from '../run/fire'
import { useRun } from '../run/store'
import { buildMassing, updateWindowGlow } from './doheny-massing.js'
import { mountExtractionMarkers } from './markers'

function statusFor(group: Group, meta: { floor: number; facade: string; bayIndex: number }) {
  const windows = group.userData.windows as Array<{
    userData: { floor: number; facade: string; bayIndex: number; marker?: { userData: { cellId?: string } } }
  }>
  const win = windows.find(
    (w) =>
      w.userData.floor === meta.floor &&
      w.userData.facade === meta.facade &&
      w.userData.bayIndex === meta.bayIndex,
  )
  const cellId = win?.userData.marker?.userData.cellId
  if (!cellId) return null
  const run = useRun.getState()
  const cell = run.cells.find((c) => c.id === cellId)
  if (cell?.vented) return 'DEAD'
  if (run.hold.kind === 'rescue' && run.hold.targetId) {
    const victim = run.victims.find((v) => v.id === run.hold.targetId)
    if (victim?.cellId === cellId) return 'ACTIVE'
  }
  return 'AVAILABLE'
}

export function Massing() {
  const group = useMemo(() => {
    const g = buildMassing(site)
    mountExtractionMarkers(g, useRun.getState().extractions)
    return g
  }, [])

  useFrame((state) => {
    const cells = useRun.getState().cells
    const heatOf = windowHeatLookup(cells)
    updateWindowGlow(
      group,
      (meta) => {
        let h = heatOf(meta)
        for (const cell of cells) {
          if (cell.floor !== meta.floor) continue
          if (!cell.facades.includes(meta.facade as (typeof cell.facades)[number])) continue
          if (cell.preVent && !cell.vented) h = Math.max(h, 68)
        }
        return h
      },
      (meta) => statusFor(group, meta),
      state.clock.elapsedTime,
    )
  })

  useEffect(() => {
    return () => {
      group.traverse((obj) => {
        const mesh = obj as Mesh
        const geo = mesh.geometry as BufferGeometry | undefined
        if (geo) geo.dispose()
        const mat = mesh.material as Material | Material[] | undefined
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      })
    }
  }, [group])

  return <primitive object={group} />
}
