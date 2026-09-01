import { CAMPUS } from './world'
import type { SimState } from '../sim/types'

export type AutoGoto = {
  kind: 'goto'
  x: number
  z: number
  line: string
}

export type AutoMark = {
  kind: 'mark'
  id: string
  line: string
}

export type AutoBeat = AutoGoto | AutoMark

/** Outdoor sweep the mast already walks: door, steps, Tommy, Bovard. */
export const RUN: AutoBeat[] = [
  { kind: 'goto', x: 104, z: 50, line: 'West door. Someone is still on the apron.' },
  { kind: 'mark', id: 'v1', line: 'Contact at the west door.' },
  { kind: 'goto', x: 106, z: 43, line: 'West steps next.' },
  { kind: 'mark', id: 'v2', line: 'Second contact on the steps.' },
  { kind: 'goto', x: 72, z: 42, line: 'Leaving the fire. Sweeping west.' },
  { kind: 'goto', x: 40, z: 28, line: 'Quad toward Tommy Trojan.' },
  { kind: 'goto', x: 12, z: 14, line: 'Behind Tommy.' },
  { kind: 'mark', id: 'v3', line: 'Third contact behind Tommy.' },
  { kind: 'goto', x: -22, z: -2, line: 'West toward Bovard.' },
  { kind: 'goto', x: -38, z: -12, line: 'Lawn west of Bovard.' },
  { kind: 'mark', id: 'v4', line: 'Fourth contact. Lawn is clear.' },
]
