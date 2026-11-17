import { getBaseTrack } from './base-tracks'
import type { Championship } from './championship'

export type GarageMode = 'off' | 'regular' | 'advanced' | 'all'

export interface ModuleSettings {
  garage: GarageMode
  weather: boolean
}

export interface GarageDraft {
  market: string[]
  order: string[]
  picks: { participantId: string; cardId: string }[]
  swap: { give: string; take: string } | null
  closed: boolean
}

export interface RaceModulePreparation {
  /** Grille figée au moment de la préparation, même après correction d’un résultat. */
  grid: string[]
  weather: { tokenId: string; roadTokenIds: string[] } | null
  garage: GarageDraft | null
}

export function modulesEnabled(settings?: ModuleSettings): boolean {
  return Boolean(settings && (settings.garage !== 'off' || settings.weather))
}

export function validateModuleSettings(
  value: unknown,
): asserts value is ModuleSettings {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('garage' in value) ||
    typeof value.garage !== 'string' ||
    !['off', 'regular', 'advanced', 'all'].includes(value.garage) ||
    !('weather' in value) ||
    typeof value.weather !== 'boolean'
  )
    throw new Error('Configuration des modules invalide.')
}

export function validateModuleCompatibility(
  championship: Pick<Championship, 'modules' | 'participants' | 'races'>,
) {
  if (championship.modules === undefined) return
  validateModuleSettings(championship.modules)
  if (!modulesEnabled(championship.modules)) return
  for (const race of championship.races) getBaseTrack(race.circuitId)
  if (
    championship.modules.garage !== 'off' &&
    championship.participants.filter((p) => p.kind === 'human').length > 6
  )
    throw new Error(
      'Le Garage du jeu de base accepte au maximum six pilotes humains.',
    )
}

export function isRacePrepared(
  championship: Championship,
  raceIndex: number,
): boolean {
  if (!modulesEnabled(championship.modules)) return true
  const preparation = championship.races[raceIndex]?.preparation
  return Boolean(
    preparation &&
    (!championship.modules?.weather || preparation.weather) &&
    (championship.modules?.garage === 'off' || preparation.garage?.closed),
  )
}
