import { BUILDINGS, DOHENY, DOHENY_DOOR } from './world'

function pickDoorEdge(ring: Array<[number, number]>) {
  let best = { ax: 0, az: 0, bx: 1, bz: 0, score: Infinity }
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = ring[i][0]
    const az = ring[i][1]
    const bx = ring[i + 1][0]
    const bz = ring[i + 1][1]
    const mx = (ax + bx) / 2
    const mz = (az + bz) / 2
    const score = mx * mx + mz * mz
    const len = Math.hypot(bx - ax, bz - az)
    if (len > 4 && score < best.score) {
      best = { ax, az, bx, bz, score }
    }
  }
  return { ax: best.ax, az: best.az, bx: best.bx, bz: best.bz }
}

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
  credit: string
  fallback: string
  hall: Hall
  mark?: string
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

export function sideOf(hall: Hall, x: number, z: number) {
  return (x - hall.x) * hall.px + (z - hall.z) * hall.pz
}

/** Through the door into a room — not the west steps. */
export function insideInterior(x: number, z: number): InteriorDef | null {
  for (const room of INTERIORS) {
    const along = alongOf(room.hall, x, z)
    const side = sideOf(room.hall, x, z)
    if (along > 0.15 && along < 16 && Math.abs(side) < 5.2) return room
  }
  return null
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
const bovardDoor = bovard ? pickDoorEdge(bovard.outer) : undefined
const bovardHall =
  bovard && bovardDoor ? hallFromDoor(bovardDoor, bovard.cx, bovard.cz) : null

export const INTERIORS: InteriorDef[] = [
  {
    id: 'times-mirror',
    title: 'Times-Mirror reading room',
    still: '/interiors/times-mirror-hall.jpg',
    stillLeft: '/interiors/times-mirror-stacks.jpg',
    stillRight: '/interiors/times-mirror-aisle.jpg',
    credit: 'Times-Mirror stills',
    fallback: '/doheny-times-mirror.jpg',
    hall: dohenyHall,
    mark: 'WEST DOOR',
    labels: [
      { text: 'EVAC — west door', color: '#6ee0b0', along: -3, side: 0, y: 3.6 },
      { text: 'HOT — stacks', color: '#ff6a1a', along: 14, side: 1.4, y: 3.1 },
    ],
  },
  {
    id: 'doheny-lobby',
    title: 'Doheny rotunda',
    still: '/interiors/doheny-rotunda.jpg',
    stillLeft: '/interiors/doheny-nave.jpg',
    stillRight: '/doheny-lobby.jpg',
    credit: 'Rotunda stills',
    fallback: '/doheny-lobby.jpg',
    hall: offsetHall(dohenyHall, 28, 0),
    mark: 'ROTUNDA',
    labels: [{ text: 'NO GO — rotunda', color: '#ff3355', along: 6, side: 0, y: 3.2 }],
  },
  {
    id: 'doheny-stairs',
    title: 'Doheny stair hall',
    still: '/interiors/doheny-stairs.jpg',
    credit: 'Stair hall still',
    fallback: '/interiors/doheny-stairs.jpg',
    hall: offsetHall(dohenyHall, 16, -7),
    mark: 'STAIRS',
    labels: [{ text: 'EVAC — stairs', color: '#6ee0b0', along: 4, side: 0, y: 3.0 }],
  },
  {
    id: 'doheny-dining',
    title: 'Doheny dining hall',
    still: '/interiors/doheny-dining.jpg',
    credit: 'Dining hall still',
    fallback: '/interiors/doheny-dining.jpg',
    hall: offsetHall(dohenyHall, 34, 7),
    mark: 'DINING',
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

export function nearInterior(x: number, z: number) {
  return INTERIORS.some((room) => Math.hypot(x - room.hall.x, z - room.hall.z) < 36)
}

export function nearTimesMirror(x: number, z: number) {
  const room = INTERIORS.find((r) => r.id === 'times-mirror')
  if (!room) return false
  return Math.hypot(x - room.hall.x, z - room.hall.z) < 40
}
