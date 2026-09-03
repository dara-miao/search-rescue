import type { FireCell } from './types'

const GRID: string[][][] = [
  [
    ['Cinematic Arts Library', 'Rotunda north', 'Music Library', 'East light well'],
    ['West stacks', 'Rotunda', 'Rotunda core', 'East stacks'],
    ['South light well', 'Rotunda stair', 'Main well', 'SE light well'],
  ],
  [
    ['Faculty Hall', 'Treasure Room', 'Los Angeles Times Reference Room', 'East Asian Library'],
    ['West corridor', 'Circulation desk', 'Hall of Honor', 'East corridor'],
    ['South doors west', 'Main entrance', 'South windows', 'SE windows'],
  ],
  [
    ['Special Collections north', 'Offices north', 'Event anteroom', 'East offices'],
    ['West offices', 'Special Collections', 'Event space', 'East workroom'],
    ['South offices', 'Collections stair', 'Event gallery', 'SE offices'],
  ],
  [
    ['North stacks', 'Mechanical north', 'Stacks north-east', 'East mechanical'],
    ['West stacks', 'Core stacks', 'Core mechanical', 'East stacks'],
    ['South stacks', 'Stacks stair', 'Mechanical south', 'SE mechanical'],
  ],
]

export function roomName(floor: number, col: number, row: number) {
  return GRID[floor]?.[row]?.[col] || `Floor ${floor} bay ${col},${row}`
}

export function nameCell(cell: Pick<FireCell, 'floor' | 'col' | 'row'>) {
  return roomName(cell.floor, cell.col, cell.row)
}
