import { useMemo } from 'react'
import { MASSING_CONFIG } from './doheny-massing.js'
import { facadeDir } from '../run/layout'
import { useRun } from '../run/store'

/**
 * Vented rooms mark their exterior wall as a heat zone — a low wash on the
 * stone, not another blinking window.
 */
export function HeatZones() {
  const cells = useRun((s) => s.cells)
  const t = useRun((s) => s.t)
  const events = useRun((s) => s.vents)
  const vents = useMemo(
    () => cells.filter((c) => c.vented && !c.isCore && c.facades.length > 0),
    [cells],
  )

  return (
    <group>
      {vents.map((cell) => {
        const face = cell.facades[0]
        const n = facadeDir(face)
        const along = face === 'north' || face === 'south' ? cell.size.x : cell.size.z
        const y = cell.floor * MASSING_CONFIG.storeyHeight + MASSING_CONFIG.storeyHeight * 0.5
        const hit = events.filter((e) => e.kind === 'vent' && e.cellId === cell.id).at(-1)
        const fresh = hit ? Math.max(0, 1 - (t - hit.t) / 6) : 0
        return (
          <mesh
            key={cell.id}
            position={[cell.centre.x + n.x * 0.35, y, cell.centre.z + n.z * 0.35]}
            rotation={[0, Math.atan2(n.x, n.z), 0]}
          >
            <planeGeometry args={[Math.max(3.2, along * 0.85), MASSING_CONFIG.storeyHeight * 0.92]} />
            <meshBasicMaterial color="#e07030" transparent opacity={0.14 + fresh * 0.32} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}
