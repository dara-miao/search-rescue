import { RUN, type AutoBeat } from './auto'
import type { SurvivorDef } from './world'

export type Hazard = 'fire' | 'quake' | 'search'
export type FieldSeed = 'doheny' | 'bovard' | 'none'

export type Scenario = {
  id: string
  title: string
  kicker: string
  lede: string
  why: string
  hazard: Hazard
  seed: FieldSeed
  failTommy: boolean
  people: number
  deploy: { x: number; z: number; yaw: number }
  opening: string
  victims: SurvivorDef[]
  run: AutoBeat[]
}

/** Idle pose on the quad so both feeds read the campus before a pick. */
export const IDLE = { x: 8, z: 22, yaw: 0.35 }

export const SCENARIOS: Scenario[] = [
  {
    id: 'doheny-fire',
    title: 'Doheny is on fire',
    kicker: 'Structure fire',
    lede: 'The fire is inside the library. Four people are still on the west side.',
    why: 'The robot does not go in. It sweeps the door, the steps, Tommy, then Bovard.',
    hazard: 'fire',
    seed: 'doheny',
    failTommy: true,
    people: 4,
    deploy: { x: 94, z: 52, yaw: 1.37 },
    opening: 'Leaving the plaza. Heading for the west door.',
    victims: [
      { id: 'v1', name: 'Victim 1', role: 'Unaccounted', x: 111.4, z: 48.2, y: 0, note: 'Doheny west door' },
      { id: 'v2', name: 'Victim 2', role: 'Unaccounted', x: 112.81, z: 41.13, y: 0, note: 'Doheny west steps' },
      { id: 'v3', name: 'Victim 3', role: 'Unaccounted', x: -6.2, z: 4, y: 0, note: 'Behind Tommy Trojan' },
      { id: 'v4', name: 'Victim 4', role: 'Unaccounted', x: -48, z: -18, y: 0, note: 'Lawn west of Bovard' },
    ],
    run: RUN,
  },
  {
    id: 'bovard-quake',
    title: 'Aftershock at Bovard',
    kicker: 'Earthquake',
    lede: 'Masonry came down on the west lawn. Three people are in the open.',
    why: 'Stay off the debris. The robot works the lawn, not the building.',
    hazard: 'quake',
    seed: 'bovard',
    failTommy: false,
    people: 3,
    deploy: { x: 12, z: 14, yaw: -1.05 },
    opening: 'Tommy is clear. Sweeping west toward Bovard.',
    victims: [
      { id: 'q1', name: 'Victim 1', role: 'Unaccounted', x: -6.2, z: 4, y: 0, note: 'Behind Tommy Trojan' },
      { id: 'q2', name: 'Victim 2', role: 'Unaccounted', x: -28, z: -8, y: 0, note: 'Walk west of Tommy' },
      { id: 'q3', name: 'Victim 3', role: 'Unaccounted', x: -48, z: -18, y: 0, note: 'Lawn west of Bovard' },
    ],
    run: [
      { kind: 'goto', x: 0, z: 6, line: 'Someone is still behind Tommy.' },
      { kind: 'mark', id: 'q1', line: 'Contact behind Tommy.' },
      { kind: 'goto', x: -18, z: -2, line: 'West walk. Debris on the lawn.' },
      { kind: 'goto', x: -28, z: -8, line: 'Second person on the walk.' },
      { kind: 'mark', id: 'q2', line: 'Contact on the west walk.' },
      { kind: 'goto', x: -40, z: -14, line: 'Closing on the Bovard lawn.' },
      { kind: 'mark', id: 'q3', line: 'Third contact. Lawn is clear.' },
    ],
  },
  {
    id: 'quad-search',
    title: 'Missing on the quad',
    kicker: 'Night search',
    lede: 'Two people never made it back after dark. The robot sweeps on thermal.',
    why: 'No fire. Find them in the open before they walk into a closed building.',
    hazard: 'search',
    seed: 'none',
    failTommy: false,
    people: 2,
    deploy: { x: 40, z: 28, yaw: -0.7 },
    opening: 'Quad is quiet. Sweeping west on thermal.',
    victims: [
      { id: 's1', name: 'Victim 1', role: 'Unaccounted', x: 12, z: 14, y: 0, note: 'South of Tommy Trojan' },
      { id: 's2', name: 'Victim 2', role: 'Unaccounted', x: 72, z: 42, y: 0, note: 'West of Doheny plaza' },
    ],
    run: [
      { kind: 'goto', x: 24, z: 20, line: 'Heading for Tommy.' },
      { kind: 'goto', x: 12, z: 14, line: 'Heat by the statue.' },
      { kind: 'mark', id: 's1', line: 'Contact south of Tommy.' },
      { kind: 'goto', x: 40, z: 28, line: 'Turning east across the quad.' },
      { kind: 'goto', x: 72, z: 42, line: 'West plaza. Second contact.' },
      { kind: 'mark', id: 's2', line: 'Second contact. Quad is clear.' },
    ],
  },
]

export const DEFAULT_SCENARIO = SCENARIOS[0]

export function scenarioById(id: string | null | undefined): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? DEFAULT_SCENARIO
}
