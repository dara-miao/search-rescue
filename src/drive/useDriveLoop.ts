import { useEffect } from 'react'
import { useDrive } from './store'

function screenStickFromKeys(keys: Set<string>) {
  const x =
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
  const y =
    (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) -
    (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
  return { x, y }
}

export function useDriveLoop() {
  useEffect(() => {
    const keys = new Set<string>()
    const block = new Set([
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ])

    const onDown = (e: KeyboardEvent) => {
      if (block.has(e.code)) e.preventDefault()
      keys.add(e.code)
    }
    const onUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
    }
    const onBlur = () => keys.clear()

    window.addEventListener('keydown', onDown, { capture: true })
    window.addEventListener('keyup', onUp, { capture: true })
    window.addEventListener('blur', onBlur)

    let last = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { stickOn, stickX, stickY, step } = useDrive.getState()
      const stick = stickOn ? { x: stickX, y: -stickY } : screenStickFromKeys(keys)
      step(stick, dt)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onDown, { capture: true })
      window.removeEventListener('keyup', onUp, { capture: true })
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
