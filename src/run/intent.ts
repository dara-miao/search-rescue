import { stagingPose } from '../drive/spawn'
import { MARKER_CONFIG } from '../scene/extraction-markers.js'
import { dist } from './layout'
import { conditionLabel, nearestPlayOpening, typeLabel } from './opening'
import type { Extraction, RunState, Victim } from './types'

export const SCAN_RANGE = 7
export const RESCUE_RANGE = MARKER_CONFIG.rescueRadius

export type IntentKind = 'coach' | 'drive' | 'scan' | 'rescue' | 'mark' | 'deliver' | 'wait'

export type Intent = {
  kind: IntentKind
  title: string
  detail: string
  dist: number | null
  inRange: boolean
  hold: 'scan' | 'rescue' | 'mark' | null
  step: string
}

function withStep(intent: Omit<Intent, 'step'>): Intent {
  const step =
    intent.kind === 'deliver'
      ? '4 · Staging'
      : intent.kind === 'rescue'
        ? '3 · Rescue'
        : intent.kind === 'scan' || intent.kind === 'mark'
          ? '2 · Assess'
          : intent.kind === 'wait'
            ? 'Wait'
            : '1 · Drive'
  return { ...intent, step }
}

function extractionOf(state: RunState, victim: Victim): Extraction | null {
  if (victim.type === 'UNREACHABLE') return null
  return (
    state.extractions.find((e) => e.cellId === victim.cellId) ??
    state.extractions.find((e) => e.floor === Math.min(victim.floor, 1) && e.row === victim.row && e.col === victim.col) ??
    null
  )
}

/** Distance to the place you actually stand to act on this victim. */
export function actDist(state: RunState, victim: Victim, x: number, z: number) {
  const ext = extractionOf(state, victim)
  const toBody = dist(x, z, victim.x, victim.z)
  if (!ext) return toBody
  return Math.min(toBody, dist(x, z, ext.x, ext.z))
}

export function playIntent(state: RunState, x: number, z: number): Intent {
  const staging = stagingPose()
  const toStaging = dist(x, z, staging.x, staging.z)

  if (state.carriedId) {
    const carried = state.victims.find((v) => v.id === state.carriedId)
    return withStep({
      kind: 'deliver',
      title: toStaging < 7 ? 'Drop at staging' : 'Back to staging',
      detail: carried
        ? `${carried.roomName} · ${carried.count} · ${toStaging.toFixed(0)} m`
        : `${toStaging.toFixed(0)} m to staging`,
      dist: toStaging,
      inRange: toStaging < 7,
      hold: null,
    })
  }

  let scan: Victim | null = null
  let scanD = Infinity
  let rescue: Victim | null = null
  let rescueD = Infinity
  let mark: Victim | null = null
  let markD = Infinity

  for (const victim of state.victims) {
    if (victim.state !== 'WAITING') continue
    const d = actDist(state, victim, x, z)
    if (victim.type === 'UNREACHABLE' && d <= SCAN_RANGE && d < markD) {
      mark = victim
      markD = d
    }
    const ext = extractionOf(state, victim)
    const cell = ext ? state.cells.find((c) => c.id === ext.cellId) : null
    if (ext && cell && !cell.vented && victim.type !== 'UNREACHABLE' && d <= RESCUE_RANGE && d < rescueD) {
      rescue = victim
      rescueD = d
    }
    if (!victim.scanned && d <= SCAN_RANGE && d < scanD) {
      scan = victim
      scanD = d
    }
  }

  if (state.hold.kind !== 'idle') {
    const victim = state.victims.find((v) => v.id === state.hold.targetId)
    const pct = state.hold.need > 0 ? Math.round((state.hold.progress / state.hold.need) * 100) : 0
    const verb = state.hold.kind === 'scan' ? 'Assessing' : state.hold.kind === 'mark' ? 'Marking' : 'Rescuing'
    return withStep({
      kind: state.hold.kind,
      title: `${verb} ${pct}%`,
      detail: victim ? `${victim.roomName} · hold still` : 'Hold still',
      dist: victim ? actDist(state, victim, x, z) : 0,
      inRange: true,
      hold: state.hold.kind,
    })
  }

  if (scan) {
    return withStep({
      kind: 'scan',
      title: 'Hold Space to assess',
      detail: scan.roomName,
      dist: scanD,
      inRange: true,
      hold: 'scan',
    })
  }

  if (mark) {
    return withStep({
      kind: 'mark',
      title: 'Hold Space to mark',
      detail: mark.roomName,
      dist: markD,
      inRange: true,
      hold: 'mark',
    })
  }

  if (rescue) {
    const ready = rescue.scanned
    return withStep({
      kind: 'rescue',
      title: 'Hold F to rescue',
      detail: ready
        ? `${conditionLabel(rescue.condition)} · ${typeLabel(rescue.type)} · ${rescue.count}`
        : `${rescue.roomName} · size up first if you can`,
      dist: rescueD,
      inRange: true,
      hold: 'rescue',
    })
  }

  const near = nearestPlayOpening(x, z, state)
  if (near) {
    const who = near.waiting ? `${near.waiting} waiting` : 'no one waiting'
    const scannedWait = state.victims.find(
      (v) =>
        v.cellId === near.ext.cellId &&
        v.state === 'WAITING' &&
        v.scanned &&
        v.type !== 'UNREACHABLE',
    )
    if (scannedWait && near.dist > RESCUE_RANGE) {
      return withStep({
        kind: 'drive',
        title: near.dist <= 8 ? 'Hold F to rescue' : 'To the opening',
        detail: `${near.ext.opening} · ${conditionLabel(scannedWait.condition)}`,
        dist: near.dist,
        inRange: false,
        hold: null,
      })
    }
    if (state.t < 7 && near.dist > 12) {
      return withStep({
        kind: 'coach',
        title: 'Marked opening',
        detail: near.ext.opening,
        dist: near.dist,
        inRange: false,
        hold: null,
      })
    }
    if (near.dist > 16) {
      return withStep({
        kind: 'drive',
        title: near.ext.opening,
        detail: who,
        dist: near.dist,
        inRange: false,
        hold: null,
      })
    }
    if (near.dist > 8) {
      return withStep({
        kind: 'drive',
        title: 'Keep coming',
        detail: near.ext.opening,
        dist: near.dist,
        inRange: false,
        hold: null,
      })
    }
    return withStep({
      kind: 'drive',
      title: 'Stop on the ring',
      detail: near.ext.opening,
      dist: near.dist,
      inRange: false,
      hold: null,
    })
  }

  return withStep({
    kind: 'wait',
    title: 'No live opening',
    detail: 'Rooms are venting. Keep clear of the heat.',
    dist: null,
    inRange: false,
    hold: null,
  })
}
