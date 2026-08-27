export type InputState = {
  forward: number
  strafe: number
  yaw: number
  pitch: number
  sprint: boolean
  stickActive: boolean
  stickX: number
  stickY: number
  lookX: number
  lookY: number
  lookActive: boolean
}

export function createInput() {
  const keys = new Set<string>()
  const edges = new Set<string>()
  const look = { yaw: 0, pitch: 0 }
  const stick = { x: 0, y: 0, active: false }
  const lookStick = { x: 0, y: 0, active: false }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return
    if (!keys.has(e.code)) edges.add(e.code)
    keys.add(e.code)
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyF', 'KeyT', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code)
  }

  const attach = () => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    if (document.pointerLockElement) document.exitPointerLock()
  }

  const detach = () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
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
      lookX: lookStick.x,
      lookY: lookStick.y,
      lookActive: lookStick.active,
    }
  }

  const setStick = (x: number, y: number, active: boolean) => {
    stick.x = x
    stick.y = y
    stick.active = active
  }

  const setLookStick = (x: number, y: number, active: boolean) => {
    lookStick.x = x
    lookStick.y = y
    lookStick.active = active
  }

  const addLook = (dx: number, dy: number) => {
    look.yaw -= dx * 0.004
    look.pitch -= dy * 0.0032
    look.pitch = Math.max(-0.85, Math.min(0.55, look.pitch))
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

  return { attach, detach, consume, setStick, setLookStick, addLook, turn, setYaw, resetLook, pressed, consumeEdge }
}

export type InputApi = ReturnType<typeof createInput>
