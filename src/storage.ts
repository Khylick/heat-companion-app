import { CAR_COLORS, CIRCUITS } from './domain/catalog'
import { validatePreparations } from './domain/preparation'
import {
  validateLegendSettings,
  validateParticipants,
  type Championship,
  type Participant,
} from './domain/championship'

export const STORAGE_KEY = 'heat-companion:v1'
export interface Library {
  version: 1
  championships: Championship[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function isText(value: unknown, limit = 100): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= limit
  )
}
function isParticipant(value: unknown): value is Participant {
  return (
    isObject(value) &&
    isText(value.id) &&
    isText(value.name, 40) &&
    (value.kind === 'human' || value.kind === 'legend') &&
    CAR_COLORS.some((color) => color.id === value.color)
  )
}

/** Vérifie les sauvegardes locales et les fichiers externes avant de les utiliser. */
export function parseLibrary(raw: string): Library {
  if (raw.length > 2_000_000)
    throw new Error('La sauvegarde dépasse la limite de 2 Mo.')
  const value: unknown = JSON.parse(raw)
  if (
    !isObject(value) ||
    value.version !== 1 ||
    !Array.isArray(value.championships) ||
    value.championships.length > 100
  ) {
    throw new Error('Format de sauvegarde incompatible.')
  }
  const championshipIds = new Set<string>()
  for (const item of value.championships) {
    if (
      !isObject(item) ||
      !isText(item.id) ||
      !isText(item.name, 80) ||
      !isText(item.seed) ||
      !isText(item.createdAt) ||
      !Number.isFinite(Date.parse(item.createdAt)) ||
      item.format !== 'custom' ||
      item.botRules !== 'legends' ||
      !Array.isArray(item.participants) ||
      !item.participants.every(isParticipant) ||
      !Array.isArray(item.races) ||
      item.races.length < 1 ||
      item.races.length > 10 ||
      !Array.isArray(item.points) ||
      item.points.length !== 12 ||
      !item.points.every(
        (point) => Number.isSafeInteger(point) && point >= 0 && point <= 1000,
      )
    ) {
      throw new Error('Les données d’un championnat sont invalides.')
    }
    if (championshipIds.has(item.id))
      throw new Error('Identifiant de championnat en double.')
    championshipIds.add(item.id)
    validateParticipants(item.participants)
    if (
      !isObject(item.legendSettings) ||
      typeof item.legendSettings.difficulty !== 'number' ||
      typeof item.legendSettings.progressive !== 'boolean' ||
      typeof item.legendSettings.rivals !== 'boolean'
    ) {
      throw new Error('Configuration Legends invalide.')
    }
    validateLegendSettings(
      {
        difficulty: item.legendSettings.difficulty,
        progressive: item.legendSettings.progressive,
        rivals: item.legendSettings.rivals,
      },
      item.participants,
    )
    const ids = new Set(item.participants.map((participant) => participant.id))
    const raceIds = new Set<string>()
    const circuits = new Set<string>()
    let unfinished = false
    for (const race of item.races) {
      if (
        !isObject(race) ||
        !isText(race.id) ||
        raceIds.has(race.id) ||
        typeof race.circuitId !== 'string' ||
        !CIRCUITS.some((circuit) => circuit.id === race.circuitId) ||
        circuits.has(race.circuitId)
      ) {
        throw new Error('Calendrier invalide.')
      }
      raceIds.add(race.id)
      circuits.add(race.circuitId)
      if (race.result === null) {
        unfinished = true
        continue
      }
      if (
        unfinished ||
        !Array.isArray(race.result) ||
        race.result.length !== ids.size ||
        new Set(race.result).size !== ids.size ||
        !race.result.every((id) => typeof id === 'string' && ids.has(id))
      ) {
        throw new Error('Résultats de course invalides.')
      }
    }
    validatePreparations(item as unknown as Championship)
  }
  return value as unknown as Library
}

export function loadLibrary(): { library: Library; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return {
      library: raw ? parseLibrary(raw) : { version: 1, championships: [] },
      error: null,
    }
  } catch {
    return {
      library: { version: 1, championships: [] },
      error:
        'La sauvegarde locale est inaccessible ou invalide. Elle a été conservée. Exportez-la avant de la remplacer.',
    }
  }
}

export function saveLibrary(library: Library): void {
  const raw = JSON.stringify(library)
  parseLibrary(raw)
  localStorage.setItem(STORAGE_KEY, raw)
}
