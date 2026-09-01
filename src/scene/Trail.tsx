import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { heightAt } from '../game/ground'
import { useGame } from '../game/store'

export function Trail({ world = false }: { world?: boolean }) {
  const trail = useGame((s) => s.trail) ?? []
  const target = useGame((s) => s.autoTarget)
  const lift = world ? 1.4 : 0.14

  const walked = useMemo(() => {
    if (trail.length < 2) return null
    return trail.map(([x, z]) => [x, heightAt(x, z) + lift, z] as [number, number, number])
  }, [trail, lift])

  const aim = useMemo(() => {
    if (!target || trail.length < 1) return null
    const last = trail[trail.length - 1]
    return [
      [last[0], heightAt(last[0], last[1]) + lift, last[1]],
      [target.x, heightAt(target.x, target.z) + lift, target.z],
    ] as Array<[number, number, number]>
  }, [trail, target, lift])

  return (
    <group>
      {walked && (
        <Line points={walked} color="#ffcc00" lineWidth={world ? 2.2 : 1.2} transparent opacity={world ? 0.85 : 0.5} />
      )}
      {aim && (
        <Line points={aim} color="#ffe38a" lineWidth={1} transparent opacity={0.55} />
      )}
    </group>
  )
}
