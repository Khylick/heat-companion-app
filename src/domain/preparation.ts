import { getBaseTrack } from './base-tracks'
import {
  getGrid,
  randomFromSeed,
  shuffle,
  type Championship,
} from './championship'
import {
  modulesEnabled,
  isRacePrepared,
  validateModuleCompatibility,
  type RaceModulePreparation,
} from './module-settings'
import { UPGRADE_CARDS, getUpgradeCard } from './upgrades'
import { ROAD_TOKENS, WEATHER_TOKENS } from './weather'

export function getOwnedUpgrades(
  championship: Championship,
  throughRace: number,
) {
  const owned = new Map(
    championship.participants
      .filter((p) => p.kind === 'human')
      .map((p) => [p.id, [] as string[]]),
  )
  for (const race of championship.races.slice(0, throughRace + 1)) {
    const garage = race.preparation?.garage
    if (!garage) continue
    for (const pick of garage.picks)
      owned.get(pick.participantId)!.push(pick.cardId)
    if (garage.swap) {
      const cards = owned.get(garage.order[0])!
      cards.splice(cards.indexOf(garage.swap.give), 1, garage.swap.take)
    }
  }
  return owned
}

function generatePreparation(
  championship: Championship,
  raceIndex: number,
  grid: string[],
): RaceModulePreparation {
  const settings = championship.modules!
  const track = getBaseTrack(championship.races[raceIndex].circuitId)
  const held = new Set(
    [...getOwnedUpgrades(championship, raceIndex - 1).values()].flat(),
  )
  const order = [...grid]
    .reverse()
    .filter((id) =>
      championship.participants.some((p) => p.id === id && p.kind === 'human'),
    )
  const deck = UPGRADE_CARDS.filter(
    (card) =>
      !held.has(card.id) &&
      (settings.garage === 'all' || card.upgrade.level === settings.garage),
  )
  if (settings.garage !== 'off' && deck.length < order.length + 3)
    throw new Error(
      'Le paquet ne contient plus assez d’améliorations pour préparer cette course.',
    )
  return {
    grid: [...grid],
    weather: settings.weather
      ? {
          tokenId: shuffle(
            WEATHER_TOKENS,
            randomFromSeed(`${championship.seed}:weather:${raceIndex}`),
          )[0].id,
          roadTokenIds: shuffle(
            ROAD_TOKENS,
            randomFromSeed(`${championship.seed}:road:${raceIndex}`),
          )
            .slice(0, track.cornerLimits.length)
            .map((token) => token.id),
        }
      : null,
    garage:
      settings.garage !== 'off'
        ? {
            market: shuffle(
              deck,
              randomFromSeed(`${championship.seed}:garage:${raceIndex}`),
            )
              .slice(0, order.length + 3)
              .map((card) => card.id),
            order,
            picks: [],
            swap: null,
            closed: false,
          }
        : null,
  }
}

function ensureCurrentRace(championship: Championship, raceIndex: number) {
  if (
    !Number.isInteger(raceIndex) ||
    raceIndex < 0 ||
    raceIndex !== championship.races.findIndex((race) => !race.result)
  )
    throw new Error('Seule la prochaine course peut être préparée.')
  if (!modulesEnabled(championship.modules))
    throw new Error('Les modules sont désactivés.')
}

function withPreparation(
  championship: Championship,
  raceIndex: number,
  preparation: RaceModulePreparation,
): Championship {
  return {
    ...championship,
    races: championship.races.map((race, index) =>
      index === raceIndex ? { ...race, preparation } : race,
    ),
  }
}

export function prepareRace(
  championship: Championship,
  raceIndex: number,
): Championship {
  ensureCurrentRace(championship, raceIndex)
  validateModuleCompatibility(championship)
  if (championship.races[raceIndex].preparation)
    throw new Error(
      'Cette course a déjà été préparée. Son tirage est conservé.',
    )
  return withPreparation(
    championship,
    raceIndex,
    generatePreparation(
      championship,
      raceIndex,
      getGrid(championship, raceIndex),
    ),
  )
}

export function remainingMarket(
  garage: NonNullable<RaceModulePreparation['garage']>,
): string[] {
  return garage.market.filter(
    (id) => !garage.picks.some((pick) => pick.cardId === id),
  )
}

export function pickUpgrade(
  championship: Championship,
  raceIndex: number,
  cardId: string,
): Championship {
  ensureCurrentRace(championship, raceIndex)
  const preparation = championship.races[raceIndex].preparation
  const garage = preparation?.garage
  if (
    !preparation ||
    !garage ||
    garage.closed ||
    garage.picks.length >= garage.order.length
  )
    throw new Error(
      'Le choix des améliorations est terminé ou le marché n’est pas préparé.',
    )
  if (!remainingMarket(garage).includes(cardId))
    throw new Error('Cette carte n’est pas disponible dans le marché.')
  const participantId = garage.order[garage.picks.length]
  return withPreparation(championship, raceIndex, {
    ...preparation,
    garage: { ...garage, picks: [...garage.picks, { participantId, cardId }] },
  })
}

export function finishGarage(
  championship: Championship,
  raceIndex: number,
  swap: { give: string; take: string } | null = null,
): Championship {
  ensureCurrentRace(championship, raceIndex)
  const preparation = championship.races[raceIndex].preparation
  const garage = preparation?.garage
  if (
    !preparation ||
    !garage ||
    garage.closed ||
    garage.picks.length !== garage.order.length
  )
    throw new Error(
      'Chaque pilote doit choisir une amélioration avant de terminer le Garage.',
    )
  if (
    swap &&
    (!remainingMarket(garage).includes(swap.take) ||
      !getOwnedUpgrades(championship, raceIndex)
        .get(garage.order[0])
        ?.includes(swap.give))
  )
    throw new Error(
      'Échange invalide : seul le dernier pilote humain peut échanger une de ses cartes avec le marché restant.',
    )
  return withPreparation(championship, raceIndex, {
    ...preparation,
    garage: { ...garage, closed: true, swap },
  })
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function sameIds(actual: unknown, expected: string[]): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((id, index) => id === expected[index])
  )
}

/** Validation des imports : tirages reproductibles, ordre des choix et conservation des cartes. */
export function validatePreparations(championship: Championship): void {
  validateModuleCompatibility(championship)
  const nextIndex = championship.races.findIndex((race) => !race.result)
  for (const [index, race] of championship.races.entries()) {
    const raw: unknown = race.preparation
    if (raw === undefined) {
      if (race.result && modulesEnabled(championship.modules))
        throw new Error('Préparation manquante pour une course terminée.')
      continue
    }
    if (
      !modulesEnabled(championship.modules) ||
      (nextIndex !== -1 && index > nextIndex) ||
      !isObject(raw) ||
      !Array.isArray(raw.grid) ||
      raw.grid.length !== championship.participants.length ||
      new Set(raw.grid).size !== raw.grid.length ||
      !raw.grid.every((id) =>
        championship.participants.some((p) => p.id === id),
      )
    )
      throw new Error('Préparation de course invalide.')
    const expected = generatePreparation(
      championship,
      index,
      raw.grid as string[],
    )
    if (expected.weather) {
      if (
        !isObject(raw.weather) ||
        raw.weather.tokenId !== expected.weather.tokenId ||
        !sameIds(raw.weather.roadTokenIds, expected.weather.roadTokenIds)
      )
        throw new Error('Tirage météo ou état de la piste invalide.')
    } else if (raw.weather !== null) throw new Error('Module météo désactivé.')
    if (expected.garage) {
      const garage = raw.garage
      if (
        !isObject(garage) ||
        !sameIds(garage.market, expected.garage.market) ||
        !sameIds(garage.order, expected.garage.order) ||
        !Array.isArray(garage.picks) ||
        garage.picks.length > expected.garage.order.length ||
        typeof garage.closed !== 'boolean'
      )
        throw new Error('Marché du Garage invalide.')
      const used = new Set<string>()
      for (const [pickIndex, pick] of garage.picks.entries()) {
        if (
          !isObject(pick) ||
          pick.participantId !== expected.garage.order[pickIndex] ||
          typeof pick.cardId !== 'string' ||
          !expected.garage.market.includes(pick.cardId) ||
          used.has(pick.cardId)
        )
          throw new Error('Choix du Garage invalide.')
        used.add(pick.cardId)
        getUpgradeCard(pick.cardId)
      }
      if (garage.closed && garage.picks.length !== expected.garage.order.length)
        throw new Error('Garage terminé avant la fin des choix.')
      if (garage.swap !== null) {
        const swap = garage.swap
        const owner = expected.garage.order[0]
        const owned = getOwnedUpgrades(championship, index - 1).get(owner) ?? []
        const firstPick = garage.picks[0]
        if (isObject(firstPick) && typeof firstPick.cardId === 'string')
          owned.push(firstPick.cardId)
        if (
          !garage.closed ||
          !isObject(swap) ||
          typeof swap.give !== 'string' ||
          !owned.includes(swap.give) ||
          typeof swap.take !== 'string' ||
          !expected.garage.market.includes(swap.take) ||
          used.has(swap.take)
        )
          throw new Error('Échange du Garage invalide.')
      }
    } else if (raw.garage !== null) throw new Error('Module Garage désactivé.')
    if (race.result && !isRacePrepared(championship, index))
      throw new Error('Préparation inachevée pour une course terminée.')
  }
}
