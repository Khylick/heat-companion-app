/** Référentiel des circuits fourni, v2.0, p. 2 ; jeu de base uniquement. */
export interface TrackSetup {
  laps: number
  spaces: number
  cornerLimits: number[]
  heat: number
  stress: number
}

export const BASE_TRACKS: Record<string, TrackSetup> = {
  usa: { laps: 2, spaces: 69, cornerLimits: [7, 3, 3, 2], heat: 6, stress: 3 },
  'great-britain': {
    laps: 2,
    spaces: 63,
    cornerLimits: [10, 6, 5, 3, 4],
    heat: 6,
    stress: 3,
  },
  france: {
    laps: 2,
    spaces: 60,
    cornerLimits: [5, 2, 4, 3, 4],
    heat: 6,
    stress: 3,
  },
  italy: { laps: 3, spaces: 54, cornerLimits: [5, 2, 3], heat: 6, stress: 3 },
}

export function getBaseTrack(id: string): TrackSetup {
  if (!Object.hasOwn(BASE_TRACKS, id))
    throw new Error('Ces modules nécessitent un circuit du jeu de base.')
  return BASE_TRACKS[id]
}
