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

const BLOCK = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyS',
  'KeyA',
  'KeyD',
  'KeyF',
  'KeyT',
])

function codeOf(e: KeyboardEvent) {
  const mapped = KEY_CODE[e.key.toLowerCase()]
  if (mapped) return mapped
  if (e.code && e.code !== 'Unidentified') return e.code
  return ''
}

export function createInput() {
  const keys = new Set<string>()
  const edges = new Set<string>()
  const look = { yaw: 0, pitch: 0 }
  const stick = { x: 0, y: 0, active: false }
  let hold = false
  let latch = false

  const onKeyDown = (e: KeyboardEvent) => {
    const code = codeOf(e)
    if (!code) return
    if (!keys.has(code)) edges.add(code)
    keys.add(code)
    if (BLOCK.has(code)) e.preventDefault()
  }
  const onKeyUp = (e: KeyboardEvent) => {
    const code = codeOf(e)
    if (code) keys.delete(code)
  }
  const onLostFocus = () => {
    keys.clear()
    edges.clear()
  }

  const attach = () => {
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onLostFocus)
    document.addEventListener('visibilitychange', onLostFocus)
    if (document.pointerLockElement) document.exitPointerLock()
  }

  const detach = () => {
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('keyup', onKeyUp, true)
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('keyup', onKeyUp, true)
    window.removeEventListener('blur', onLostFocus)
    document.removeEventListener('visibilitychange', onLostFocus)
    keys.clear()
    edges.clear()
    hold = false
    latch = false
  }

  const consume = (): InputState => {
    const up = latch || hold || keys.has('KeyW') || keys.has('ArrowUp')
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

  const setHold = (on: boolean) => {
    hold = on
  }

  const toggleLatch = () => {
    latch = !latch
    return latch
  }

  const setLatch = (on: boolean) => {
    latch = on
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

  return {
    attach,
    detach,
    consume,
    setStick,
    setHold,
    toggleLatch,
    setLatch,
    nod,
    turn,
    setYaw,
    resetLook,
    pressed,
    consumeEdge,
  }
}

export type InputApi = ReturnType<typeof createInput>
