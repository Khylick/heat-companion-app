import { CAR_COLORS, CIRCUITS } from './catalog'
import {
  modulesEnabled,
  isRacePrepared,
  validateModuleCompatibility,
  type ModuleSettings,
  type RaceModulePreparation,
} from './module-settings'

export interface Participant {
  id: string
  name: string
  kind: 'human' | 'legend'
  color: string
}

export interface Race {
  id: string
  circuitId: string
  result: string[] | null
  preparation?: RaceModulePreparation
}

export interface Championship {
  id: string
  name: string
  createdAt: string
  seed: string
  format: 'custom'
  botRules: 'legends'
  legendSettings: LegendSettings
  participants: Participant[]
  races: Race[]
  points: number[]
  modules?: ModuleSettings
}

export interface Standing {
  participant: Participant
  points: number
  wins: number
  lastPosition: number
}

export interface LegendSettings {
  difficulty: number
  progressive: boolean
  rivals: boolean
}

export const DEFAULT_POINTS = [9, 6, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0]

export function validateLegendSettings(
  settings: LegendSettings,
  participants: Participant[],
): void {
  if (
    !Number.isInteger(settings.difficulty) ||
    settings.difficulty < 1 ||
    settings.difficulty > 6
  ) {
    throw new Error('Le niveau des Légendes doit être compris entre 1 et 6.')
  }
  if (
    settings.rivals &&
    (settings.difficulty < 2 ||
      participants.filter((participant) => participant.kind === 'legend')
        .length < 2)
  ) {
    throw new Error(
      'Le module Rivaux nécessite un niveau de départ d’au moins 2 et au moins deux Légendes.',
    )
  }
}

export function getLegendSetup(championship: Championship, raceIndex: number) {
  const { difficulty, progressive, rivals } = championship.legendSettings
  const level = Math.min(6, difficulty + (progressive ? raceIndex : 0))
  const decks: Record<number, string> = {
    1: 'Paquet vert, étoiles ignorées',
    2: 'Paquet vert',
    3: 'Paquets vert + jaune',
    4: 'Paquet jaune',
    5: 'Paquets jaune + rouge',
    6: 'Paquet rouge',
  }
  return {
    level,
    deck: decks[level],
    stars: level >= 2,
    rivals:
      rivals && raceIndex > 0
        ? getStandings(championship, raceIndex)
            .filter((standing) => standing.participant.kind === 'legend')
            .slice(0, 2)
            .map((standing) => standing.participant)
        : [],
  }
}

/** PRNG stable : le calendrier et la première grille sont reproductibles. */
export function randomFromSeed(seed: string): () => number {
  let state = 2166136261
  for (const character of seed)
    state = Math.imul(state ^ character.charCodeAt(0), 16777619)
  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

export function validateParticipants(participants: Participant[]): void {
  if (participants.length < 2 || participants.length > CAR_COLORS.length) {
    throw new Error('Prévoyez entre 2 et 12 pilotes.')
  }
  if (!participants.some((participant) => participant.kind === 'human')) {
    throw new Error('Ajoutez au moins un pilote humain.')
  }
  if (
    participants.some(
      (participant) => !participant.name.trim() || participant.name.length > 40,
    )
  ) {
    throw new Error('Chaque pilote doit avoir un nom de 1 à 40 caractères.')
  }
  for (const key of ['id', 'color'] as const) {
    if (
      new Set(participants.map((participant) => participant[key])).size !==
      participants.length
    ) {
      throw new Error(
        'Les identifiants et les couleurs des pilotes doivent être uniques.',
      )
    }
  }
  if (
    participants.some(
      (participant) =>
        !CAR_COLORS.some((color) => color.id === participant.color),
    )
  ) {
    throw new Error('Couleur de voiture inconnue.')
  }
}

export function createChampionship(input: {
  name: string
  seed: string
  participants: Participant[]
  circuitIds: string[]
  raceCount: number
  legendSettings: LegendSettings
  modules?: ModuleSettings
}): Championship {
  validateParticipants(input.participants)
  validateLegendSettings(input.legendSettings, input.participants)
  validateModuleCompatibility({
    modules: input.modules,
    participants: input.participants,
    races: input.circuitIds.map((circuitId) => ({
      id: '',
      circuitId,
      result: null,
    })),
  })
  if (!input.name.trim() || input.name.trim().length > 80)
    throw new Error('Le championnat doit avoir un nom de 1 à 80 caractères.')
  if (!input.seed.trim() || input.seed.length > 100)
    throw new Error('La graine doit contenir de 1 à 100 caractères.')
  if (
    !Number.isInteger(input.raceCount) ||
    input.raceCount < 1 ||
    input.raceCount > input.circuitIds.length
  ) {
    throw new Error(
      'Choisissez un nombre de courses compatible avec les circuits sélectionnés.',
    )
  }
  if (
    new Set(input.circuitIds).size !== input.circuitIds.length ||
    input.circuitIds.some(
      (id) => !CIRCUITS.some((circuit) => circuit.id === id),
    )
  ) {
    throw new Error('La sélection des circuits est invalide.')
  }
  const circuits = shuffle(
    [...input.circuitIds].sort(),
    randomFromSeed(`${input.seed.trim()}:calendar`),
  ).slice(0, input.raceCount)
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    createdAt: new Date().toISOString(),
    seed: input.seed.trim(),
    format: 'custom',
    botRules: 'legends',
    legendSettings: { ...input.legendSettings },
    participants: input.participants.map((participant) => ({
      ...participant,
      name: participant.name.trim(),
    })),
    races: circuits.map((circuitId) => ({
      id: crypto.randomUUID(),
      circuitId,
      result: null,
    })),
    points: [...DEFAULT_POINTS],
    ...(modulesEnabled(input.modules)
      ? { modules: { ...input.modules! } }
      : {}),
  }
}

export function initialGrid(championship: Championship): string[] {
  return shuffle(
    championship.participants.map((participant) => participant.id),
    randomFromSeed(`${championship.seed}:grid`),
  )
}

export function getStandings(
  championship: Championship,
  beforeRace = championship.races.length,
): Standing[] {
  const firstGrid = initialGrid(championship)
  const standings = championship.participants.map((participant) => ({
    participant,
    points: 0,
    wins: 0,
    lastPosition: firstGrid.indexOf(participant.id),
  }))
  for (const race of championship.races.slice(0, beforeRace)) {
    if (!race.result) continue
    for (const standing of standings) {
      const position = race.result.indexOf(standing.participant.id)
      standing.points += championship.points[position] ?? 0
      standing.wins += position === 0 ? 1 : 0
      standing.lastPosition = position
    }
  }
  return standings.sort(
    (left, right) =>
      right.points - left.points || left.lastPosition - right.lastPosition,
  )
}

export function getGrid(
  championship: Championship,
  raceIndex: number,
): string[] {
  if (championship.races[raceIndex]?.preparation)
    return [...championship.races[raceIndex].preparation!.grid]
  if (raceIndex === 0) return initialGrid(championship)
  return getStandings(championship, raceIndex).map(
    (standing) => standing.participant.id,
  )
}

export function recordResult(
  championship: Championship,
  raceIndex: number,
  result: string[],
): Championship {
  if (
    !Number.isInteger(raceIndex) ||
    raceIndex < 0 ||
    raceIndex >= championship.races.length
  )
    throw new Error('Course inconnue.')
  if (championship.races.slice(0, raceIndex).some((race) => !race.result))
    throw new Error(
      'Terminez les courses précédentes avant de saisir ce résultat.',
    )
  if (!isRacePrepared(championship, raceIndex))
    throw new Error(
      'Terminez la préparation des modules avant de saisir l’arrivée.',
    )
  const ids = new Set(
    championship.participants.map((participant) => participant.id),
  )
  if (
    result.length !== ids.size ||
    new Set(result).size !== ids.size ||
    result.some((id) => !ids.has(id))
  ) {
    throw new Error(
      'Chaque pilote doit apparaître exactement une fois dans le résultat.',
    )
  }
  return {
    ...championship,
    races: championship.races.map((race, index) =>
      index === raceIndex ? { ...race, result: [...result] } : race,
    ),
  }
}
