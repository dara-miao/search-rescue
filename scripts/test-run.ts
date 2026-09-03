import { createRun, generateVictims, rollCondition } from '../src/run/generate'
import { allVented, stepFireTick, ventedCount } from '../src/run/fire'
import { debriefRows, debriefSummary } from '../src/run/debrief'
import { batteryBand, batterySpeedScale } from '../src/run/battery'
import { holdAnchor, holdFrac } from '../src/run/hold'
import { makeExtractions, nearVentedFacade, outsidePoint, siteCells, speedScaleAt } from '../src/run/layout'
import { parseSeed, seedQuery } from '../src/run/seed'
import { cardinal, dohenyOffset, headingDeg, offsetTo } from '../src/run/heading'
import { nearestLiveOpening, revealLine } from '../src/run/opening'
import { useRun } from '../src/run/store'
import { stepRun } from '../src/run/tick'
import { stagingPose } from '../src/drive/spawn'
import { pointInPoly } from '../src/drive/hull'
import { site } from '../src/data/site'
import { smokeSocketOutside } from '../src/scene/WindowSmoke'
import type { RunInput } from '../src/run/types'

function assert(ok: boolean, msg: string) {
  if (!ok) {
    console.error(`fail: ${msg}`)
    process.exitCode = 1
  } else {
    console.log(`ok  ${msg}`)
  }
}

function inputAt(x: number, z: number, extra: Partial<RunInput> = {}): RunInput {
  return { x, z, speed: 0, moving: false, thermal: false, hold: false, forceRescue: false, ...extra }
}

function holdFor(state: ReturnType<typeof createRun>, input: RunInput, seconds: number) {
  const steps = Math.max(1, Math.ceil(seconds / 0.05))
  for (let i = 0; i < steps; i++) stepRun(state, input, 0.05)
}

function guarantees(seed: number) {
  const v = generateVictims(seed)
  return {
    n: v.length,
    group: v.some((x) => (x.type === 'GROUP' || x.type === 'SELF_EXTRACT') && x.count >= 3),
    faintCrit: v.some(
      (x) =>
        x.signature === 'FAINT' &&
        x.condition === 'CRITICAL' &&
        (x.col === 0 ||
          siteCells()
            .find((c) => c.id === x.cellId)
            ?.facades.some((f) => f === 'west' || f === 'north')),
    ),
    decoy: v.some((x) => x.signature === 'STRONG' && x.condition === 'STABLE' && x.type === 'ASSISTED'),
    floor0: v.some((x) => x.floor === 0),
    unreach: v.filter((x) => x.type === 'UNREACHABLE' && x.floor >= 2).length,
  }
}

for (const seed of [1, 7, 42, 99, 2026]) {
  const g = guarantees(seed)
  assert(g.n >= 8 && g.n <= 10, `seed ${seed} has ${g.n} victims`)
  assert(g.group, `seed ${seed} has a group/self-extract of 3+`)
  assert(g.faintCrit, `seed ${seed} has FAINT+CRITICAL on west/north`)
  assert(g.decoy, `seed ${seed} has STRONG+STABLE+ASSISTED decoy`)
  assert(g.floor0, `seed ${seed} has a floor-0 victim`)
  assert(g.unreach >= 1 && g.unreach <= 2, `seed ${seed} has 1–2 unreachable upstairs (${g.unreach})`)
}

let faintCrit = 0
let strongCrit = 0
{
  let a = 1
  const r = () => {
    a = (a * 1664525 + 1013904223) >>> 0
    return a / 4294967296
  }
  for (let i = 0; i < 400; i++) {
    if (rollCondition('FAINT', r) === 'CRITICAL') faintCrit++
    if (rollCondition('STRONG', r) === 'CRITICAL') strongCrit++
  }
  assert(faintCrit > strongCrit * 2, `FAINT is more often CRITICAL than STRONG (${faintCrit} vs ${strongCrit})`)
}

const floor0 = generateVictims(3).find((v) => v.floor === 0 && v.type === 'ASSISTED')
const floor1 = generateVictims(3).find((v) => v.floor === 1 && v.type === 'ASSISTED')
if (floor0 && floor1) {
  assert(floor0.rescueTime > floor1.rescueTime, 'floor 0 assisted rescue is slower (light well)')
} else {
  assert(generateVictims(3).some((v) => v.floor === 0 && v.rescueTime > 6), 'floor 0 rescue times are stretched')
}

assert(parseSeed('?seed=42') === 42, 'parses ?seed=')
assert(parseSeed('seed=99') === 99, 'parses seed without question mark')
assert(parseSeed('?seed=nope') == null, 'rejects a non-numeric seed')
assert(seedQuery(42) === '?seed=42', 'seed query is stable')
assert(createRun(11).ignitionCellId === createRun(11).ignitionCellId, 'same seed same ignition cell')
assert(new Set([11, 12, 13, 14, 15].map((s) => createRun(s).ignitionCellId)).size > 1, 'seed moves the ignition cell')

const run = createRun(11)
assert(run.cells.some((c) => c.floor === 3 && c.heat === 60), 'ignition seeds a floor-3 cell at 60')
assert(run.extractions.every((e) => e.floor <= 1), 'extractions only on floors 0–1')
assert(!run.extractions.some((e) => run.cells.find((c) => c.id === e.cellId)?.isCore), 'no core extractions')

let firstLowCore: number | null = null
let lastVent = 0
const fire = createRun(11)
for (let i = 0; i < 9 * 60 * 4; i++) {
  const ev = stepFireTick(fire.cells)
  const t = (i + 1) / 4
  for (const e of ev) {
    if (e.kind === 'vent') {
      lastVent = t
      if (e.cell.isCore && e.cell.floor <= 1 && firstLowCore == null) firstLowCore = t
    }
  }
}
const vc = ventedCount(fire.cells)
assert(
  firstLowCore != null && firstLowCore > 150 && firstLowCore < 360,
  `a lower-floor core vents around 4:00 (got ${firstLowCore?.toFixed(0)}s)`,
)
assert(
  allVented(fire.cells) || vc.vented / vc.total > 0.85,
  `most cells vent by 9:00 (${vc.vented}/${vc.total}, last ${lastVent.toFixed(0)}s)`,
)
assert(lastVent > 300, `last vent is late in the run (t=${lastVent.toFixed(0)})`)

const telegraph = createRun(11)
let firstPre: number | null = null
let firstVentAt: number | null = null
for (let i = 0; i < 9 * 60 * 4; i++) {
  const ev = stepFireTick(telegraph.cells)
  const t = (i + 1) / 4
  for (const e of ev) {
    if (e.kind === 'pre' && firstPre == null) firstPre = t
    if (e.kind === 'vent' && firstVentAt == null) firstVentAt = t
  }
}
assert(firstPre != null && firstVentAt != null, 'pre-vent and vent both occur')
assert(firstPre < firstVentAt, 'smoke telegraph happens before the first vent')
assert(firstVentAt - firstPre >= 2, `pre-vent leads vent by a few seconds (got ${(firstVentAt - firstPre).toFixed(1)}s)`)

const lit = createRun(11).cells.find((c) => c.facades.length && !c.isCore)
if (lit) {
  const sock = smokeSocketOutside(lit)[0]
  assert(sock != null, 'pre-vent smoke has a facade socket')
  assert(!pointInPoly(sock.x, sock.z, site.building.footprint), 'smoke sits outside the OSM hull')
}

const live = createRun(5)
const self = live.victims.find((v) => v.type === 'SELF_EXTRACT')!
stepRun(live, inputAt(self.x, self.z, { thermal: true }), 0.05)
assert(self.seenAt != null, 'thermal encounter records the victim')
holdFor(live, inputAt(self.x, self.z, { hold: true }), 6.1)
assert(self.scanned, '6s hold in range completes a scan')
assert(self.condition && self.type, 'scan reveals hidden fields (still on the object)')
assert(live.lastReveal?.kind === 'scan', 'scan writes a reveal')
assert(live.lastReveal?.condition === self.condition && live.lastReveal?.type === self.type, 'reveal has condition and type')
assert(live.lastReveal?.count === self.count, 'reveal has count')
assert(!('clock' in (live.lastReveal ?? {})), 'reveal never carries the clock')
assert(!revealLine(live.lastReveal!).includes('clock'), 'reveal line does not name the clock')

const moved = createRun(5)
const scanMe = moved.victims.find((v) => v.type !== 'UNREACHABLE')!
holdFor(moved, inputAt(scanMe.x, scanMe.z, { hold: true }), 3)
assert(moved.hold.kind === 'scan' && moved.hold.progress > 2, 'scan accumulates while still')
assert(holdAnchor(moved)?.kind === 'scan', 'scan ring sits on the victim')
assert(holdFrac(moved.hold) > 0.3, 'scan ring is partly filled after 3s')
stepRun(moved, inputAt(scanMe.x, scanMe.z, { hold: true, moving: true, speed: 1 }), 0.05)
assert(moved.hold.kind === 'idle', 'moving interrupts a scan')

const rescueRun = createRun(8)
const easy = rescueRun.victims.find((v) => v.type === 'SELF_EXTRACT' || v.type === 'GROUP')!
easy.rescueTime = 1.2
easy.clock = 400
const easyExt = rescueRun.extractions.find((e) => e.cellId === easy.cellId) ?? {
  x: easy.x,
  z: easy.z,
  cellId: easy.cellId,
}
holdFor(rescueRun, inputAt(easyExt.x, easyExt.z, { hold: true, forceRescue: true }), 1.3)
assert(easy.state === 'RESCUED', `self/group extract resolves without a carry (${easy.state})`)

const carryRun = createRun(12)
const assisted = carryRun.victims.find((v) => v.type === 'ASSISTED')!
assisted.rescueTime = 1
assisted.clock = 400
const aext = carryRun.extractions.find((e) => e.cellId === assisted.cellId)
if (aext) {
  holdFor(carryRun, inputAt(aext.x, aext.z, { hold: true, forceRescue: true }), 1.1)
  assert(assisted.state === 'CARRIED' && carryRun.carriedId === assisted.id, 'assisted victim is carried')
  const st = stagingPose()
  stepRun(carryRun, inputAt(st.x, st.z), 0.05)
  assert(assisted.state === 'RESCUED', 'staging drop-off completes the rescue')
} else {
  assert(false, 'assisted victim has an extraction')
}

const clockRun = createRun(4)
const dying = clockRun.victims[0]
dying.clock = 0.4
dying.state = 'WAITING'
holdFor(clockRun, inputAt(0, 40), 0.5)
assert(dying.state === 'LOST' && dying.lostReason === 'clock', 'expired clock marks LOST')

const ventRun = createRun(4)
const cell = ventRun.cells.find((c) => !c.isCore)!
cell.heat = 80
cell.vented = true
const trapped = ventRun.victims.find((v) => v.cellId === cell.id) ?? ventRun.victims[0]
trapped.cellId = cell.id
trapped.state = 'WAITING'
stepRun(ventRun, inputAt(0, 40), 0.05)
assert(trapped.state === 'LOST' && trapped.lostReason === 'vent', 'vented cell loses its victim')

const markRun = createRun(6)
const up = markRun.victims.find((v) => v.type === 'UNREACHABLE')!
holdFor(markRun, inputAt(up.x, up.z, { hold: true }), 2.1)
assert(up.state === 'MARKED', 'unreachable mark completes in 2s')

const batt = createRun(2)
const startBatt = batt.battery
holdFor(batt, inputAt(80, 80, { moving: true, speed: 3 }), 2)
assert(batt.battery < startBatt - 0.8, 'moving drains battery')
const st = stagingPose()
batt.battery = 40
holdFor(batt, inputAt(st.x, st.z), 1)
assert(batt.battery > 50, 'staging recharges')
assert(batterySpeedScale(100) === 1 && batterySpeedScale(20) === 1, 'full battery is full speed')
assert(batterySpeedScale(10) < 0.42 && batterySpeedScale(10) > 0.16, 'mid limp interpolates')
assert(batterySpeedScale(0) === 0.16, 'empty still crawls')
assert(batteryBand(0) === 'empty' && batteryBand(12) === 'limp' && batteryBand(40) === 'ok', 'battery bands')
assert(holdFrac({ kind: 'idle', targetId: null, progress: 0, need: 0 }) === 0, 'idle hold has no fill')
assert(Math.abs(holdFrac({ kind: 'scan', targetId: 'v', progress: 3, need: 6 }) - 0.5) < 1e-9, 'scan fill is progress/need')

const heatRun = createRun(2)
const faceCell = heatRun.cells.find((c) => !c.isCore && c.facades.length > 0 && c.floor <= 1)
if (faceCell) {
  faceCell.vented = true
  const lip = outsidePoint(faceCell)
  assert(nearVentedFacade(lip.x, lip.z, heatRun.cells), '8m of a vented facade is heat')
  assert(!nearVentedFacade(lip.x + 40, lip.z + 40, heatRun.cells), 'far lawn is not heat')
  heatRun.battery = 100
  holdFor(heatRun, inputAt(lip.x, lip.z, { moving: true, speed: 3 }), 2)
  const hotDrain = 100 - heatRun.battery
  const cool = createRun(2)
  cool.battery = 100
  holdFor(cool, inputAt(80, 80, { moving: true, speed: 3 }), 2)
  const coolDrain = 100 - cool.battery
  assert(hotDrain > coolDrain * 2, `heat multiplies drain (hot ${hotDrain.toFixed(2)} vs cool ${coolDrain.toFixed(2)})`)
  assert(heatRun.inHeat, 'tick flags inHeat on a vented lip')
}

const north = siteCells().find((c) => c.floor === 0 && c.facades.includes('north'))
if (north) {
  const ex = makeExtractions(siteCells()).find((e) => e.cellId === north.id)
  if (ex) assert(speedScaleAt(ex.x, ex.z, siteCells()) <= 0.61, 'north lip is 60% speed')
}

const end = createRun(9)
for (const c of end.cells) {
  c.heat = 100
  c.vented = true
}
stepRun(end, inputAt(0, 40), 0.05)
assert(end.phase === 'debrief', 'run ends when every cell has vented')
const rows = debriefRows(end)
const sum = debriefSummary(end)
assert(rows.length === end.victims.length, 'debrief lists every victim')
assert(rows.every((r) => r.seen && r.did && r.truth), 'each row has saw / did / was')
assert(!JSON.stringify(sum).toLowerCase().includes('grade'), 'debrief summary has no grade')
assert(sum.ignitionRoom.length > 2, `ignition is a room name (${sum.ignitionRoom})`)
assert(typeof sum.peopleSaved === 'number' && typeof sum.peopleLost === 'number', 'saved/lost are plain counts')

assert(cardinal(0) === 'N', 'yaw 0 is north')
assert(Math.abs(headingDeg(Math.PI) - 180) < 1, 'yaw π is south')
const pose = stagingPose()
assert(Math.abs(dohenyOffset(pose.x, pose.z, pose.yaw)) < 0.55, 'spawn compass pip sits near the notch')
const near = nearestLiveOpening(pose.x, pose.z, createRun(42))
assert(near != null && near.ext.facade === 'south', 'nearest live opening from spawn is on the south face')
assert(near != null && near.dist > 15 && near.dist < 55, `nearest opening is across the lawn (${near?.dist.toFixed(0)} m)`)
assert(
  near != null && Math.abs(offsetTo(pose.x, pose.z, pose.yaw, near.ext.x, near.ext.z)) < 0.7,
  'cyan opening pip sits near the notch at spawn',
)

useRun.getState().start(11)
assert(useRun.getState().phase === 'briefing', 'start holds the clock')
const heldT = useRun.getState().t
useRun.getState().tick(inputAt(0, 40, { moving: true, speed: 3 }), 1)
assert(useRun.getState().t === heldT, 'briefing does not tick the fire')
useRun.getState().begin()
assert(useRun.getState().phase === 'playing', 'roll out starts the run')

if (process.exitCode) {
  console.error('run tests failed')
  process.exit(process.exitCode)
}
console.log('run tests passed')
