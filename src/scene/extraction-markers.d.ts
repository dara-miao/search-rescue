import type { Group } from 'three'

export const MARKER_CONFIG: {
  rescueRadius: number
  color: number
  colorSelfExtract: number
}

export type ExtractionPoint = {
  cellId: string
  facade: string
  bayIndex: number
  floor?: number
  openingType?: string
  selfExtract?: boolean
}

export function attachExtractionMarkers(
  massingGroup: Group,
  extractionPoints: ExtractionPoint[],
  cfg?: typeof MARKER_CONFIG,
): { attached: number; unmatched: string[]; totalWindows: number }

export function defaultExtractionPoints(massingGroup: Group): ExtractionPoint[]
