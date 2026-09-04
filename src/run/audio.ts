import type { FireCell, HoldKind, Reveal } from './types'

type AudioApi = {
  ctx: AudioContext
  master: GainNode
  rumbleGain: GainNode
  motorGain: GainNode
  holdGain: GainNode
}

export type AudioSnap = {
  cells: FireCell[]
  holdKind: HoldKind
  holdFrac: number
  speed: number
  playing: boolean
  lastReveal: Reveal | null
}

let api: AudioApi | null = null
let muted = false
let noise: AudioBuffer | null = null
let seenPre = new Set<string>()
let seenVent = new Set<string>()
let lastRevealAt = -1

function makeNoise(ctx: AudioContext) {
  const n = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let acc = 0
  for (let i = 0; i < n; i++) {
    acc = acc * 0.97 + (Math.random() * 2 - 1) * 0.03
    data[i] = acc * 6
  }
  return buf
}

function loopNoise(ctx: AudioContext, dest: AudioNode, freq: number, q = 0.7) {
  if (!noise) return
  const src = ctx.createBufferSource()
  src.buffer = noise
  src.loop = true
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = freq
  filter.Q.value = q
  src.connect(filter)
  filter.connect(dest)
  src.start()
  return { src, filter }
}

function makeApi(): AudioApi | null {
  const AC = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  const ctx = new AC()
  noise = makeNoise(ctx)

  const master = ctx.createGain()
  master.gain.value = 0.42
  const shelf = ctx.createBiquadFilter()
  shelf.type = 'lowshelf'
  shelf.frequency.value = 180
  shelf.gain.value = 3
  shelf.connect(master)
  master.connect(ctx.destination)

  const rumbleGain = ctx.createGain()
  rumbleGain.gain.value = 0
  rumbleGain.connect(shelf)
  const rumbleA = ctx.createOscillator()
  rumbleA.type = 'sine'
  rumbleA.frequency.value = 39
  const rumbleB = ctx.createOscillator()
  rumbleB.type = 'sine'
  rumbleB.frequency.value = 46.5
  rumbleA.connect(rumbleGain)
  rumbleB.connect(rumbleGain)
  rumbleA.start()
  rumbleB.start()
  loopNoise(ctx, rumbleGain, 88, 0.4)

  const motorGain = ctx.createGain()
  motorGain.gain.value = 0
  motorGain.connect(shelf)
  loopNoise(ctx, motorGain, 140, 0.8)

  const holdGain = ctx.createGain()
  holdGain.gain.value = 0
  holdGain.connect(shelf)
  loopNoise(ctx, holdGain, 320, 0.55)

  return { ctx, master, rumbleGain, motorGain, holdGain }
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
  if (api) api.master.gain.setTargetAtTime(muted ? 0 : 0.42, api.ctx.currentTime, 0.05)
}

export function resetRunAudio() {
  seenPre = new Set()
  seenVent = new Set()
  lastRevealAt = -1
  if (!api) return
  const now = api.ctx.currentTime
  api.rumbleGain.gain.setTargetAtTime(0, now, 0.08)
  api.motorGain.gain.setTargetAtTime(0, now, 0.08)
  api.holdGain.gain.setTargetAtTime(0, now, 0.05)
}

function hit(kind: 'pre' | 'vent' | 'done' | 'mark') {
  if (!api || muted || !noise) return
  const { ctx, master } = api
  const now = ctx.currentTime

  if (kind === 'pre') {
    const src = ctx.createBufferSource()
    src.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(210, now)
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.7)
    filter.Q.value = 0.9
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    src.start(now)
    src.stop(now + 0.78)
    return
  }

  if (kind === 'vent') {
    const thud = ctx.createOscillator()
    thud.type = 'sine'
    thud.frequency.setValueAtTime(78, now)
    thud.frequency.exponentialRampToValueAtTime(28, now + 0.32)
    const thudGain = ctx.createGain()
    thudGain.gain.setValueAtTime(0.0001, now)
    thudGain.gain.exponentialRampToValueAtTime(0.16, now + 0.02)
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36)
    thud.connect(thudGain)
    thudGain.connect(master)
    thud.start(now)
    thud.stop(now + 0.38)

    const src = ctx.createBufferSource()
    src.buffer = noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(900, now)
    filter.frequency.exponentialRampToValueAtTime(120, now + 0.4)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    src.start(now)
    src.stop(now + 0.44)
    return
  }

  const high = kind === 'mark' ? 420 : kind === 'done' ? 196 : 260
  const low = kind === 'mark' ? 280 : 110
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(high, now)
  osc.frequency.exponentialRampToValueAtTime(low, now + 0.16)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.07, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)
  osc.connect(gain)
  gain.connect(master)
  osc.start(now)
  osc.stop(now + 0.22)
}

export function tickRunAudio(snap: AudioSnap) {
  if (!api) return
  const { ctx } = api
  const now = ctx.currentTime

  let rumbling = 0
  for (const cell of snap.cells) {
    if (cell.preVent && !cell.vented) {
      rumbling++
      if (!seenPre.has(cell.id)) {
        seenPre.add(cell.id)
        hit('pre')
      }
    }
    if (cell.vented && !seenVent.has(cell.id)) {
      seenVent.add(cell.id)
      hit('vent')
    }
  }

  const rumble = muted || !snap.playing ? 0 : Math.min(0.055, rumbling * 0.016)
  api.rumbleGain.gain.setTargetAtTime(rumble, now, 0.22)

  const motor = muted || !snap.playing ? 0 : Math.min(0.035, Math.abs(snap.speed) * 0.005)
  api.motorGain.gain.setTargetAtTime(motor, now, 0.08)

  const holding = snap.playing && snap.holdKind !== 'idle'
  const hold = muted || !holding ? 0 : 0.02
  api.holdGain.gain.setTargetAtTime(hold, now, 0.06)

  const reveal = snap.lastReveal
  if (reveal && reveal.at !== lastRevealAt) {
    lastRevealAt = reveal.at
    hit(reveal.kind === 'mark' ? 'mark' : 'done')
  }
}
