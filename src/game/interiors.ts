import { BUILDINGS, DOHENY, DOHENY_DOOR, doorOf } from './world'

export type Hall = {
  x: number
  z: number
  ax: number
  az: number
  px: number
  pz: number
  yaw: number
}

export type InteriorDef = {
  id: string
  title: string
  still: string
  stillLeft?: string
  stillRight?: string
  stillFront?: string
  stillCeiling?: string
  stillFloor?: string
  stillFar?: string
  credit: string
  fallback: string
  hall: Hall
  mark?: string
  depth?: number
  width?: number
  height?: number
  door?: number
  labels: Array<{ text: string; color: string; along: number; side: number; y: number }>
}

export function hallFromDoor(
  door: { ax: number; az: number; bx: number; bz: number },
  cx: number,
  cz: number,
): Hall {
  const x = (door.ax + door.bx) / 2
  const z = (door.az + door.bz) / 2
  const ix = cx - x
  const iz = cz - z
  const len = Math.hypot(ix, iz) || 1
  const ax = ix / len
  const az = iz / len
  return { x, z, ax, az, px: -az, pz: ax, yaw: Math.atan2(ax, az) }
}

export function at(hall: Hall, along: number, side: number, y: number): [number, number, number] {
  return [hall.x + hall.ax * along + hall.px * side, y, hall.z + hall.az * along + hall.pz * side]
}

export function alongOf(hall: Hall, x: number, z: number) {
  return (x - hall.x) * hall.ax + (z - hall.z) * hall.az
}

function offsetHall(hall: Hall, along: number, side: number): Hall {
  return {
    ...hall,
    x: hall.x + hall.ax * along + hall.px * side,
    z: hall.z + hall.az * along + hall.pz * side,
  }
}

const dohenyHall = DOHENY_DOOR
  ? hallFromDoor(DOHENY_DOOR, DOHENY.cx, DOHENY.cz)
  : hallFromDoor({ ax: 115.849, az: 51.246, bx: 113.386, bz: 50.329 }, DOHENY.cx, DOHENY.cz)

const bovard = BUILDINGS.find((b) => /Bovard/.test(b.name))
const bovardDoor = bovard ? doorOf(bovard) : undefined
const bovardHall =
  bovard && bovardDoor ? hallFromDoor(bovardDoor, bovard.cx, bovard.cz) : null

export const INTERIORS: InteriorDef[] = [
  {
    id: 'times-mirror',
    title: 'Times-Mirror reading room',
    still: '/interiors/times-mirror-hall.jpg',
    stillLeft: '/interiors/times-mirror-stacks.jpg',
    stillRight: '/interiors/times-mirror-aisle.jpg',
    stillFront: '/interiors/times-mirror-study.jpg',
    stillCeiling: '/interiors/times-mirror-study.jpg',
    stillFloor: '/interiors/times-mirror-aisle.jpg',
    stillFar: '/interiors/times-mirror-study.jpg',
    credit: 'Times-Mirror stills',
    fallback: '/doheny-times-mirror.jpg',
    hall: dohenyHall,
    mark: 'WEST DOOR',
    depth: 15.4,
    width: 8.6,
    height: 6.6,
    door: 2.7,
    labels: [
      { text: 'EVAC — west door', color: '#6ee0b0', along: -3, side: 0, y: 3.6 },
      { text: 'HOT — stacks', color: '#ff6a1a', along: 11, side: 1.6, y: 3.1 },
    ],
  },
  {
    id: 'doheny-lobby',
    title: 'Doheny rotunda',
    still: '/interiors/doheny-rotunda.jpg',
    stillLeft: '/interiors/doheny-nave.jpg',
    stillRight: '/doheny-lobby.jpg',
    stillFront: '/interiors/doheny-desk.jpg',
    stillCeiling: '/interiors/doheny-desk.jpg',
    stillFloor: '/interiors/doheny-rotunda.jpg',
    stillFar: '/interiors/doheny-desk.jpg',
    credit: 'Rotunda stills',
    fallback: '/doheny-lobby.jpg',
    hall: offsetHall(dohenyHall, 28, 0),
    mark: 'ROTUNDA',
    depth: 12.4,
    width: 10.2,
    height: 7.2,
    door: 2.8,
    labels: [{ text: 'NO GO — rotunda', color: '#ff3355', along: 6, side: 0, y: 3.2 }],
  },
  {
    id: 'doheny-stairs',
    title: 'Doheny stair hall',
    still: '/interiors/doheny-stairs.jpg',
    stillLeft: '/interiors/doheny-stairs.jpg',
    stillRight: '/interiors/doheny-nave.jpg',
    stillCeiling: '/interiors/doheny-stairs.jpg',
    credit: 'Stair hall still',
    fallback: '/interiors/doheny-stairs.jpg',
    hall: offsetHall(dohenyHall, 16, -7),
    mark: 'STAIRS',
    depth: 9.2,
    width: 6.6,
    height: 7.0,
    door: 2.4,
    labels: [{ text: 'EVAC — stairs', color: '#6ee0b0', along: 4, side: 0, y: 3.0 }],
  },
  {
    id: 'doheny-dining',
    title: 'Doheny dining hall',
    still: '/interiors/doheny-dining.jpg',
    stillLeft: '/interiors/doheny-dining.jpg',
    stillRight: '/interiors/times-mirror-aisle.jpg',
    stillCeiling: '/interiors/doheny-dining.jpg',
    stillFloor: '/interiors/doheny-dining.jpg',
    credit: 'Dining hall still',
    fallback: '/interiors/doheny-dining.jpg',
    hall: offsetHall(dohenyHall, 34, 7),
    mark: 'DINING',
    depth: 10.4,
    width: 7.8,
    height: 5.8,
    door: 2.4,
    labels: [{ text: 'HOT — dining', color: '#ff6a1a', along: 5, side: 0, y: 3.0 }],
  },
  {
    id: 'treasure-room',
    title: 'Treasure Room',
    still: '/doheny-treasure.jpg',
    credit: 'Seauton · Wikimedia CC BY 4.0',
    fallback:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Armstrong_doheny_library_treasure_room_mural_and_bust.jpg/960px-Armstrong_doheny_library_treasure_room_mural_and_bust.jpg',
    hall: offsetHall(dohenyHall, 22, 8),
    mark: 'TREASURE',
    depth: 8.6,
    width: 6.8,
    height: 5.6,
    door: 2.2,
    labels: [{ text: 'HOT — treasure room', color: '#ff6a1a', along: 5, side: 0, y: 3.0 }],
  },
]

if (bovardHall) {
  INTERIORS.push({
    id: 'bovard',
    title: 'Bovard Auditorium',
    still: '/bovard-auditorium.jpg',
    credit: 'Justin Higuchi · Wikimedia CC BY 2.0',
    fallback:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Madilyn_Bailey_at_USC_Bovard_Auditorium.jpg/960px-Madilyn_Bailey_at_USC_Bovard_Auditorium.jpg',
    hall: bovardHall,
    mark: 'BOVARD',
    depth: 14,
    width: 11,
    height: 8.4,
    door: 3.2,
    labels: [{ text: 'EVAC — Bovard', color: '#6ee0b0', along: -2.2, side: 0, y: 3.4 }],
  })
}

export function interiorAt(x: number, z: number): InteriorDef | null {
  let best: InteriorDef | null = null
  let bestD = 22
  for (const room of INTERIORS) {
    const d = Math.hypot(x - room.hall.x, z - room.hall.z)
    if (d < bestD) {
      bestD = d
      best = room
    }
  }
  return best
}

export function stillAt(room: InteriorDef, x: number, z: number) {
  if (!room.stillFar) return room.still
  const depth = room.depth ?? 11
  return alongOf(room.hall, x, z) > depth * 0.42 ? room.stillFar : room.still
}

export function nearInterior(x: number, z: number) {
  return INTERIORS.some((room) => Math.hypot(x - room.hall.x, z - room.hall.z) < 36)
}

export function nearTimesMirror(x: number, z: number) {
  const room = INTERIORS.find((r) => r.id === 'times-mirror')
  if (!room) return false
  return Math.hypot(x - room.hall.x, z - room.hall.z) < 40
}
