import type { MutableRefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { InputApi } from '../game/input'
import { DEPLOY, useGame } from '../game/store'
import { RobotScene } from '../scene/RobotScene'
import { MastHud } from './Hud'
import { OpticalFeed } from './OpticalFeed'

function isHud(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('.mark-go, .mark-wait, .walk-hold, .optical'))
}

export function PlayPane({ input }: { input: MutableRefObject<InputApi | null> }) {
  const thermal = useGame((s) => s.thermal)
  const playing = useGame((s) => s.phase === 'playing')
  const tryMark = useGame((s) => s.tryMark)

  const hold = (on: boolean) => {
    input.current?.setHold(on)
  }

  return (
    <>
      <div className="gutter" aria-hidden="true" />
      <section
        className={`pane robot-pane ${thermal ? 'is-thermal' : ''}`}
        onPointerDown={(e) => {
          if (!playing || isHud(e.target)) return
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            /* window pointerup still clears the hold */
          }
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
          window.focus()
          hold(true)
        }}
        onPointerUp={() => hold(false)}
        onPointerCancel={() => hold(false)}
        onLostPointerCapture={() => hold(false)}
      >
        <Canvas
          eventPrefix="offset"
          style={{ position: 'absolute', inset: 0 }}
          camera={{ position: [DEPLOY.x - 7, 9, DEPLOY.z + 13], fov: 46, near: 0.4, far: 420 }}
          shadows={false}
          dpr={[0.85, 1]}
          gl={{
            antialias: false,
            stencil: false,
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
          }}
          onCreated={({ gl }) => {
            const onLost = (e: Event) => e.preventDefault()
            gl.domElement.addEventListener('webglcontextlost', onLost)
          }}
        >
          <RobotScene />
        </Canvas>
        {playing && <OpticalFeed />}
        {playing && (
          <MastHud
            onMark={tryMark}
            onToggleWalk={() => input.current?.toggleLatch() ?? false}
          />
        )}
      </section>
    </>
  )
}
