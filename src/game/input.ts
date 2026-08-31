export type InputState = {
  forward: number
  strafe: number
  yaw: number
  pitch: number
  sprint: boolean
  stickActive: boolean
  stickX: number
  stickY: number
}

const KEY_CODE: Record<string, string> = {
  w: 'KeyW',
  a: 'KeyA',
  s: 'KeyS',
  d: 'KeyD',
  q: 'KeyQ',
  e: 'KeyE',
  f: 'KeyF',
  t: 'KeyT',
  ' ': 'Space',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
}

function codeOf(e: KeyboardEvent) {
  if (e.code) return e.code
  return KEY_CODE[e.key.toLowerCase()] ?? ''
}

export function createInput() {
  const keys = new Set<string>()
  const edges = new Set<string>()
  const look = { yaw: 0, pitch: 0 }
  const stick = { x: 0, y: 0, active: false }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return
    const code = codeOf(e)
    if (!code) return
    if (!keys.has(code)) edges.add(code)
    keys.add(code)
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyF', 'KeyT'].includes(code)) {
      e.preventDefault()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    const code = codeOf(e)
    if (code) keys.delete(code)
  }

  const attach = () => {
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    if (document.pointerLockElement) document.exitPointerLock()
  }

  const detach = () => {
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
    keys.clear()
    edges.clear()
  }

  const consume = (): InputState => {
    const up = keys.has('KeyW') || keys.has('ArrowUp')
    const down = keys.has('KeyS') || keys.has('ArrowDown')

    const forward = Math.max(-1, Math.min(1, (up ? 1 : 0) - (down ? 1 : 0)))

    return {
      forward,
      strafe: 0,
      yaw: look.yaw,
      pitch: look.pitch,
      sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
      stickActive: stick.active,
      stickX: stick.x,
      stickY: stick.y,
    }
  }

  const setStick = (x: number, y: number, active: boolean) => {
    stick.x = x
    stick.y = y
    stick.active = active
  }

  const nod = (pitchDelta: number) => {
    look.pitch = Math.max(-0.85, Math.min(0.55, look.pitch + pitchDelta))
  }

  const turn = (yawDelta: number) => {
    look.yaw += yawDelta
  }

  const setYaw = (yaw: number) => {
    look.yaw = yaw
  }

  const resetLook = (yaw = 0, pitch = -0.08) => {
    look.yaw = yaw
    look.pitch = pitch
  }

  const pressed = (code: string) => keys.has(code)

  const consumeEdge = (code: string) => {
    if (!edges.has(code)) return false
    edges.delete(code)
    return true
  }

  return { attach, detach, consume, setStick, nod, turn, setYaw, resetLook, pressed, consumeEdge }
}

export type InputApi = ReturnType<typeof createInput>
