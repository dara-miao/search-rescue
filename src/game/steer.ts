export type PadMode = 'drive' | 'look'

const DEAD = 0.12

/** Map a stick axis through a deadzone and square curve so small leans stay gentle. */
export function stickAxis(v: number, dead = DEAD) {
  if (Math.abs(v) < dead) return 0
  const t = (Math.abs(v) - dead) / (1 - dead)
  return Math.sign(v) * t * t
}

export function stickWish(mode: PadMode, x: number, y: number) {
  const turn = stickAxis(x)
  const lift = stickAxis(y)
  if (mode === 'look') return { turn, forward: 0, nod: lift }
  return { turn, forward: lift, nod: 0 }
}
