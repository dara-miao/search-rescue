export type PadMode = 'drive' | 'look'

const DEAD = 0.12

/** Map a stick axis through a deadzone and square curve so small leans stay gentle. */
export function stickAxis(v: number, dead = DEAD) {
  if (Math.abs(v) < dead) return 0
  const t = (Math.abs(v) - dead) / (1 - dead)
  return Math.sign(v) * t * t
}

/** Linear so a small Drive lean still walks. */
export function stickAxisLin(v: number, dead = 0.08) {
  if (Math.abs(v) < dead) return 0
  return Math.sign(v) * ((Math.abs(v) - dead) / (1 - dead))
}

export function stickWish(mode: PadMode, x: number, y: number) {
  if (mode === 'look') return { turn: stickAxis(x), forward: 0, nod: stickAxis(y) }
  return { turn: stickAxisLin(x), forward: stickAxisLin(y), nod: 0 }
}
