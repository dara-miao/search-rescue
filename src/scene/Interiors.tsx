import { INTERIORS } from '../game/interiors'
import { useGame } from '../game/store'
import { InteriorRoom } from './InteriorRoom'

export function Interiors({ thermal }: { thermal: boolean }) {
  const x = useGame((s) => s.robot.x)
  const z = useGame((s) => s.robot.z)
  const rooms = INTERIORS.filter((room) => Math.hypot(x - room.hall.x, z - room.hall.z) < 26)

  return (
    <group>
      {rooms.map((room) => (
        <InteriorRoom key={room.id} room={room} thermal={thermal} />
      ))}
    </group>
  )
}
