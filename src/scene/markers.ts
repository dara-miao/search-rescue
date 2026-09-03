import type { Group } from 'three'
import type { Extraction } from '../run/types'
import { attachExtractionMarkers, defaultExtractionPoints, type ExtractionPoint } from './extraction-markers.js'

export function pointsFromExtractions(group: Group, extractions: Extraction[]): ExtractionPoint[] {
  const windows = (group.userData.windows ?? []) as Array<{
    userData: { facade: string; floor: number; bayIndex: number }
  }>
  const points: ExtractionPoint[] = []

  for (const ext of extractions) {
    const floor = Math.min(ext.floor, 1)
    const bays = [
      ...new Set(
        windows
          .filter((w) => w.userData.facade === ext.facade && w.userData.floor === floor)
          .map((w) => w.userData.bayIndex),
      ),
    ].sort((a, b) => a - b)
    if (!bays.length) continue
    const bayIndex = bays[Math.min(ext.col, bays.length - 1)] ?? bays[0]
    points.push({
      cellId: ext.cellId,
      facade: ext.facade,
      bayIndex,
      floor,
      openingType: ext.opening,
      selfExtract: ext.fast,
    })
  }

  return points.length ? points : defaultExtractionPoints(group)
}

export function mountExtractionMarkers(group: Group, extractions: Extraction[]) {
  return attachExtractionMarkers(group, pointsFromExtractions(group, extractions))
}
