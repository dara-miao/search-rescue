import { Line } from '@react-three/drei'
import { useMemo } from 'react'
import { heightAt } from '../game/ground'
import { useGame } from '../game/store'

export function Trail({ world = false }: { world?: boolean }) {
  const trail = useGame((s) => s.trail) ?? []
  const robot = useGame((s) => s.robot)
  const target = useGame((s) => s.autoTarget)
  const lift = world ? 1.4 : 0.14

  const walked = useMemo(() => {
    const pts = trail.map(([x, z]) => [x, heightAt(x, z) + lift, z] as [number, number, number])
    pts.push([robot.x, (world ? heightAt(robot.x, robot.z) : robot.y) + (world ? 0.2 : 0), robot.z])
    return pts
  }, [trail, robot.x, robot.y, robot.z, lift, world])

  const aim = useMemo(() => {
    if (!target) return null
    return [
      [robot.x, heightAt(robot.x, robot.z) + lift, robot.z],
      [target.x, heightAt(target.x, target.z) + lift, target.z],
    ] as Array<[number, number, number]>
  }, [robot.x, robot.z, target, lift])

  return (
    <group>
      {walked.length >= 2 && (
        <Line points={walked} color="#ffcc00" lineWidth={world ? 2.6 : 1.4} transparent opacity={world ? 0.9 : 0.55} />
      )}
      {aim && (
        <Line points={aim} color="#ffe38a" lineWidth={world ? 1.6 : 1} dashed dashSize={1.4} gapSize={0.8} transparent opacity={0.7} />
      )}
    </group>
  )
}
