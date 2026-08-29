import { insideInterior } from '../game/interiors'
import { useGame } from '../game/store'
import { InteriorRoom } from './InteriorRoom'

export function Interiors({ thermal }: { thermal: boolean }) {
  const x = useGame((s) => s.robot.x)
  const z = useGame((s) => s.robot.z)
  const room = insideInterior(x, z)
  if (!room) return null
  return <InteriorRoom room={room} thermal={thermal} />
}
