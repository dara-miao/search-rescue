export type Site = {
  id: string
  name: string
  ready: boolean
  hint: string
  match: RegExp
}

export const SITES: Site[] = [
  {
    id: 'doheny',
    name: 'Doheny Memorial Library',
    ready: true,
    hint: 'Times-Mirror interior',
    match: /Doheny/,
  },
  {
    id: 'bovard',
    name: 'Bovard Administration',
    ready: false,
    hint: 'No interior imagery',
    match: /Bovard/,
  },
  {
    id: 'leavey',
    name: 'Leavey Library',
    ready: false,
    hint: 'No interior imagery',
    match: /Leavey/,
  },
  {
    id: 'tutor',
    name: 'Tutor Campus Center',
    ready: false,
    hint: 'No interior imagery',
    match: /Tutor/,
  },
]

export const DEFAULT_SCENARIO = 'Structure fire in the Times-Mirror room'

export function siteForName(name: string) {
  return SITES.find((s) => s.match.test(name)) ?? null
}

export const DOOR_SPAWN = { x: 119.4, z: 49.2, yaw: 1.29 }
