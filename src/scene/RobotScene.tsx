import { useGame } from '../game/store'
import { Campus } from './Campus'
import { Fire } from './Fire'
import { Lights } from './Lights'
import { People } from './People'
import { Robot } from './Robot'
import { MastRig } from './Rigs'

export function RobotScene() {
  const thermal = useGame((s) => s.thermal)

  return (
    <>
      <Lights thermal={thermal} />
      <Campus thermal={thermal} />
      <Fire thermal={thermal} />
      <People thermal={thermal} />
      <Robot variant="robot" />
      <MastRig />
    </>
  )
}
