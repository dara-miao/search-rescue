import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useGame } from '../game/store'

export function Ingress() {
  const path = useGame((s) => s.evacPath)
  const points = useMemo(
    () => path.map(([x, z]) => [x, 0.22, z] as [number, number, number]),
    [path],
  )
  const under = useMemo(
    () => path.map(([x, z]) => [x, 0.16, z] as [number, number, number]),
    [path],
  )

  if (points.length < 2) return null

  return (
    <group>
      <Line points={under} color="#9d2235" lineWidth={4.5} transparent opacity={0.55} />
      <Line points={points} color="#ffcc00" lineWidth={1.8} dashed dashSize={1.6} gapSize={0.9} />
    </group>
  )
}
