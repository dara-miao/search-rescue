import type { MutableRefObject, Ref } from 'react'
import type { InputApi } from '../game/input'
import { useGame } from '../game/store'
import { AnalogKnob } from './AnalogKnob'
import { MastHud } from './Hud'
import { OpticalFeed } from './OpticalFeed'

export function PlayPane({
  input,
  paneRef,
}: {
  input: MutableRefObject<InputApi | null>
  paneRef: Ref<HTMLElement>
}) {
  const thermal = useGame((s) => s.thermal)
  const playing = useGame((s) => s.phase === 'playing')
  const tryMark = useGame((s) => s.tryMark)

  return (
    <>
      <div className="gutter" aria-hidden="true" />
      <section ref={paneRef} className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}>
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
