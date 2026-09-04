import { makeExtractions, outsidePoint, siteCells } from './layout'
import type { Condition, RescueType, RunState, Signature, Victim } from './types'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, list: T[]): T {
  return list[Math.floor(rng() * list.length)]
}

function clockFor(condition: Condition, rng: () => number): number {
  if (condition === 'STABLE') return 300 + rng() * 120
  if (condition === 'DETERIORATING') return 150 + rng() * 110
  return 60 + rng() * 70
}

/** Spec table: strong usually means moving / not dying. Faint is the inversion. */
export function rollCondition(signature: Signature, rng: () => number): Condition {
  const r = rng()
  if (signature === 'STRONG') {
    if (r < 0.6) return 'STABLE'
    if (r < 0.9) return 'DETERIORATING'
    return 'CRITICAL'
  }
  if (signature === 'WEAK') {
    if (r < 0.3) return 'STABLE'
    if (r < 0.75) return 'DETERIORATING'
    return 'CRITICAL'
  }
  if (r < 0.1) return 'STABLE'
  if (r < 0.4) return 'DETERIORATING'
  return 'CRITICAL'
}

function rescueTimeFor(type: RescueType, floor: number, fast: boolean, rng: () => number): number {
  if (type === 'UNREACHABLE') return 0
  let t: number
  if (type === 'SELF_EXTRACT' || type === 'GROUP') t = 1.4 + rng() * 0.8
  else t = 2.2 + rng() * 1
  if (floor === 0) t *= 1.5
  if (fast) t *= 0.7
  return t
}

const SIGS: Signature[] = ['STRONG', 'WEAK', 'WEAK', 'FAINT', 'FAINT']
const TYPES: RescueType[] = [
  'SELF_EXTRACT',
  'SELF_EXTRACT',
  'GROUP',
  'ASSISTED',
  'ASSISTED',
  'ASSISTED',
  'UNREACHABLE',
]

type Slot = {
  cell: ReturnType<typeof siteCells>[number]
  type: RescueType
  signature: Signature
  condition: Condition
  count: number
}

export function generateVictims(seed: number): Victim[] {
  const rng = mulberry32(seed)
  const cells = siteCells().filter((c) => !c.isCore)
  const used = new Set<string>()

  const take = (pred: (c: (typeof cells)[number]) => boolean) => {
    const pool = cells.filter((c) => pred(c) && !used.has(c.id))
    const cell = pick(rng, pool.length ? pool : cells.filter((c) => !used.has(c.id)))
    used.add(cell.id)
    return cell
  }

  const westNorth = take((c) => c.facades.includes('west') || c.facades.includes('north'))
  const decoy = take((c) => c.floor >= 1 && c.floor <= 2)
  const lightWell = take((c) => c.floor === 0)
  const unreachA = take((c) => c.floor >= 2)
  const unreachB = rng() < 0.65 ? take((c) => c.floor >= 2) : null

  const slots: Slot[] = [
    {
      cell: westNorth,
      type: pick(rng, ['ASSISTED', 'GROUP'] as RescueType[]),
      signature: 'FAINT',
      condition: 'CRITICAL',
      count: 1,
    },
    {
      cell: decoy,
      type: 'ASSISTED',
      signature: 'STRONG',
      condition: 'STABLE',
      count: 1,
    },
    {
      cell: lightWell,
      type: rng() < 0.5 ? 'GROUP' : 'SELF_EXTRACT',
      signature: pick(rng, SIGS),
      condition: rollCondition(pick(rng, SIGS), rng),
      count: 3 + Math.floor(rng() * 3),
    },
    {
      cell: unreachA,
      type: 'UNREACHABLE',
      signature: pick(rng, SIGS),
      condition: rollCondition(pick(rng, SIGS), rng),
      count: 1,
    },
  ]

  if (unreachB) {
    slots.push({
      cell: unreachB,
      type: 'UNREACHABLE',
      signature: pick(rng, ['FAINT', 'WEAK'] as Signature[]),
      condition: rollCondition('FAINT', rng),
      count: 1,
    })
  }

  const target = 8 + Math.floor(rng() * 3)
  while (slots.length < target) {
    const cell = take(() => true)
    const signature = pick(rng, SIGS)
    const unreachable = slots.filter((s) => s.type === 'UNREACHABLE').length
    const pool =
      cell.floor >= 2 && unreachable < 2 ? TYPES : TYPES.filter((t) => t !== 'UNREACHABLE')
    slots.push({
      cell,
      type: pick(rng, pool),
      signature,
      condition: rollCondition(signature, rng),
      count: 1,
    })
  }

  if (!slots.some((s) => (s.type === 'GROUP' || s.type === 'SELF_EXTRACT') && s.count >= 3)) {
    slots[2].type = 'GROUP'
    slots[2].count = 3
  }

  const extractions = makeExtractions(siteCells())

  return slots.map((slot, i) => {
    const cell = slot.cell
    const out = outsidePoint(cell)
    const ext =
      slot.type === 'UNREACHABLE'
        ? undefined
        : extractions.find((e) => e.cellId === cell.id) ??
          extractions.find((e) => e.floor === Math.min(cell.floor, 1) && e.facade === out.facade)
    const clock = clockFor(slot.condition, rng)
    const count =
      slot.type === 'GROUP' ? Math.max(3, slot.count) : slot.type === 'SELF_EXTRACT' ? Math.max(1, slot.count) : 1
    return {
      id: `v${i}`,
      cellId: cell.id,
      floor: cell.floor,
      col: cell.col,
      row: cell.row,
      roomName: cell.roomName,
      x: out.x,
      z: out.z,
      signature: slot.signature,
      condition: slot.condition,
      type: slot.type,
      count,
      clock,
      clock0: clock,
      rescueTime: rescueTimeFor(slot.type, cell.floor, Boolean(ext?.fast), rng),
      scanned: false,
      state: 'WAITING' as const,
      seenAt: null,
      action: 'never' as const,
      scanLost: false,
      lostReason: null,
    }
  })
}

export function createRun(seed = (Math.random() * 1e9) | 0): RunState {
  const cells = siteCells()
  const rng = mulberry32(seed)
  const floor3 = cells.filter((c) => c.floor === 3 && !c.isCore)
  const ignition = pick(rng, floor3.length ? floor3 : cells.filter((c) => c.floor === 3))
  for (const cell of cells) {
    cell.heat = cell.id === ignition.id ? 60 : 0
  }
  return {
    phase: 'playing',
    t: 0,
    seed,
    ignitionCellId: ignition.id,
    ignitionRoom: ignition.roomName,
    cells,
    extractions: makeExtractions(cells),
    victims: generateVictims(seed),
    encounters: [],
    vents: [],
    battery: 100,
    thermal: false,
    hold: { kind: 'idle', targetId: null, progress: 0, need: 0 },
    carriedId: null,
    fireAcc: 0,
    fireIntensity: 0,
    inHeat: false,
    lastReveal: null,
    evacuees: [],
  }
}
