import { conditionLabel, thermalRead } from './opening'
import { counts } from './tick'
import type { Condition, RescueType, RunState, Victim } from './types'

export type DebriefRow = {
  id: string
  order: number
  seen: string
  did: string
  truth: string
  room: string
  highlight: string | null
}

function an(word: string) {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`
}

function cap(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function whoPhrase(count: number, type: RescueType, condition: Condition) {
  const cond = conditionLabel(condition)
  if (type === 'GROUP') return `${an(cond)} group of ${count}`
  if (type === 'ASSISTED') {
    return count === 1 ? `${an(cond)} person who needed help` : `${count} ${cond} people who needed help`
  }
  if (type === 'SELF_EXTRACT') {
    return count === 1 ? `${an(cond)} walk-out` : `${count} ${cond} walk-outs`
  }
  return count === 1 ? `${an(cond)} unreachable person` : `${count} ${cond} unreachable people`
}

function isPlural(v: Victim) {
  return v.type !== 'GROUP' && v.count !== 1
}

function seenLine(v: Victim) {
  if (v.seenAt == null && !v.scanned) return 'They never showed on thermal.'
  if (!v.scanned) return `Thermal showed them ${thermalRead(v.signature)}. You did not size them up.`
  return `Thermal showed them ${thermalRead(v.signature)}. You sized them up as ${whoPhrase(v.count, v.type, v.condition)}.`
}

function didLine(v: Victim) {
  if (v.scanLost) return 'You sized them up after they were already gone.'
  if (v.action === 'rescued') {
    return v.type === 'ASSISTED' ? 'You helped them out.' : 'You cleared the opening.'
  }
  if (v.action === 'marked') return 'You marked them for crews.'
  if (v.action === 'scanned') return 'You sized them up, then left.'
  if (v.action === 'skipped') return 'You saw them and did not engage.'
  if (v.state === 'LOST' && v.lostReason === 'vent') return 'They were still inside when the room vented.'
  if (v.state === 'LOST' && v.lostReason === 'clock') return 'They ran out of time.'
  return 'You never reached them.'
}

function truthLine(v: Victim) {
  const who = cap(whoPhrase(v.count, v.type, v.condition))
  const were = isPlural(v) ? 'were' : 'was'
  if (v.state === 'RESCUED') return `${who} got out.`
  if (v.state === 'MARKED') return `${who} ${were} marked for crews.`
  if (v.state === 'LOST') return `${who} ${were} lost.`
  return `${who} ${isPlural(v) ? 'are' : 'is'} still inside.`
}

export function debriefRows(state: RunState): DebriefRow[] {
  const seen = state.victims
    .filter((v) => v.seenAt != null)
    .sort((a, b) => (a.seenAt ?? 0) - (b.seenAt ?? 0))
  const unseen = state.victims.filter((v) => v.seenAt == null)
  const ordered = seen.concat(unseen)

  const skippedFast = ordered.filter(
    (v) =>
      (v.action === 'skipped' || v.action === 'none' || v.action === 'never' || v.action === 'scanned') &&
      v.state !== 'RESCUED' &&
      v.type === 'SELF_EXTRACT' &&
      v.rescueTime < 8,
  )
  const wastedScan = ordered.filter((v) => v.scanLost)
  const clockLost = ordered.filter((v) => v.state === 'LOST' && v.lostReason === 'clock')
  const closest = clockLost.slice().sort((a, b) => a.clock0 - b.clock0)[0] ?? null

  return ordered.map((v, i) => {
    let highlight: string | null = null
    if (skippedFast.includes(v)) {
      highlight = `${cap(whoPhrase(v.count, v.type, v.condition))}. ${Math.round(v.rescueTime)} seconds at the glass would have cleared them.`
    } else if (wastedScan.includes(v)) {
      highlight = 'You sized up someone who was already gone.'
    } else if (closest && v.id === closest.id) {
      highlight = 'This was the closest miss.'
    }
    return {
      id: v.id,
      order: i + 1,
      seen: seenLine(v),
      did: didLine(v),
      truth: truthLine(v),
      room: v.roomName,
      highlight,
    }
  })
}

export function debriefSummary(state: RunState) {
  const c = counts(state)
  return {
    ...c,
    ignitionRoom: state.ignitionRoom,
    seed: state.seed,
    duration: state.t,
  }
}
