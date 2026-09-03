import type { FireCell } from './types'

type AudioApi = {
  ctx: AudioContext
  master: GainNode
  rumble: OscillatorNode
  rumbleGain: GainNode
  rumbleFilter: BiquadFilterNode
}

let api: AudioApi | null = null
let muted = false
let seenPre = new Set<string>()
let seenVent = new Set<string>()

function makeApi(): AudioApi | null {
  const AC = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  const ctx = new AC()
  const master = ctx.createGain()
  master.gain.value = 0.55
  master.connect(ctx.destination)

  const rumble = ctx.createOscillator()
  rumble.type = 'sawtooth'
  rumble.frequency.value = 36
  const rumbleFilter = ctx.createBiquadFilter()
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 78
  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0
  rumble.connect(rumbleFilter)
  rumbleFilter.connect(rumbleGain)
  rumbleGain.connect(master)
  rumble.start()

  return { ctx, master, rumble, rumbleGain, rumbleFilter }
}

export function unlockAudio() {
  if (!api) api = makeApi()
  if (!api) return
  if (api.ctx.state === 'suspended') void api.ctx.resume()
}

export function isMuted() {
  return muted
}

export function setMuted(next: boolean) {
  muted = next
  if (api) api.master.gain.setTargetAtTime(muted ? 0 : 0.55, api.ctx.currentTime, 0.04)
}

export function resetRunAudio() {
  seenPre = new Set()
  seenVent = new Set()
  if (api) api.rumbleGain.gain.setTargetAtTime(0, api.ctx.currentTime, 0.05)
}

function burst(kind: 'pre' | 'vent') {
  if (!api || muted) return
  const { ctx, master } = api
  const now = ctx.currentTime
  const dur = kind === 'vent' ? 0.55 : 0.9
  const osc = ctx.createOscillator()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  osc.type = kind === 'vent' ? 'square' : 'triangle'
  osc.frequency.setValueAtTime(kind === 'vent' ? 140 : 62, now)
  osc.frequency.exponentialRampToValueAtTime(kind === 'vent' ? 48 : 38, now + dur)
  filter.type = 'lowpass'
  filter.frequency.value = kind === 'vent' ? 420 : 140
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(kind === 'vent' ? 0.22 : 0.1, now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  osc.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + dur + 0.02)
}

export function tickRunAudio(cells: FireCell[]) {
  if (!api) return
  let rumbling = 0
  for (const cell of cells) {
    if (cell.preVent && !cell.vented) {
      rumbling++
      if (!seenPre.has(cell.id)) {
        seenPre.add(cell.id)
        burst('pre')
      }
    }
    if (cell.vented && !seenVent.has(cell.id)) {
      seenVent.add(cell.id)
      burst('vent')
    }
  }
  const target = muted ? 0 : Math.min(0.09, rumbling * 0.028)
  api.rumbleGain.gain.setTargetAtTime(target, api.ctx.currentTime, 0.18)
}
