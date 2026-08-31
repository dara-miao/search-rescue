import { lazy, Suspense, type MutableRefObject } from 'react'
import { View } from '@react-three/drei'
import type { InputApi } from '../game/input'
import { useGame } from '../game/store'
import { AnalogKnob } from './AnalogKnob'
import { MastHud } from './Hud'
import { OpticalFeed } from './OpticalFeed'

const RobotScene = lazy(() => import('../scene/RobotScene').then((m) => ({ default: m.RobotScene })))

export function PlayPane({ input }: { input: MutableRefObject<InputApi | null> }) {
  const thermal = useGame((s) => s.thermal)
  const playing = useGame((s) => s.phase === 'playing')
  const tryMark = useGame((s) => s.tryMark)

  return (
    <>
      <div className="gutter" aria-hidden="true" />
      <section className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}>
        <View index={2} frames={Infinity} className="view-fill">
          <Suspense fallback={null}>
            <RobotScene />
          </Suspense>
        </View>
        {playing && <OpticalFeed />}
        {playing && (
          <MastHud
            onMark={tryMark}
            drive={<AnalogKnob onVector={(x, y, active) => input.current?.setStick(x, y, active)} />}
          />
        )}
      </section>
    </>
  )
}
