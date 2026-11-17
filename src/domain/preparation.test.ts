import { describe, expect, it, vi, afterEach } from 'vitest'
import { createChampionship, getGrid, recordResult } from './championship'
import {
  finishGarage,
  getOwnedUpgrades,
  pickUpgrade,
  prepareRace,
  remainingMarket,
} from './preparation'
import { isRacePrepared, type ModuleSettings } from './module-settings'
import { UPGRADE_CARDS, UPGRADES, getUpgradeCard } from './upgrades'
import { getBaseTrack } from './base-tracks'
import {
  getCarSetup,
  getWeatherToken,
  ROAD_TOKENS,
  WEATHER_TOKENS,
} from './weather'
import { fixture } from '../test/fixtures'
import { loadLibrary, parseLibrary, saveLibrary } from '../storage'

afterEach(() => vi.unstubAllGlobals())

function season(modules: ModuleSettings = { garage: 'all', weather: true }) {
  const original = fixture()
  return createChampionship({
    name: 'Modules',
    seed: 'modules-2026',
    participants: [
      ...original.participants,
      { id: 'human-2', name: 'Alex', kind: 'human', color: 'yellow' },
    ],
    circuitIds: ['usa', 'great-britain', 'italy', 'france'],
    raceCount: 4,
    legendSettings: original.legendSettings,
    modules,
  })
}

function completeDraft(championship = season(), index = 0) {
  let next = prepareRace(championship, index)
  while (next.races[index].preparation!.garage!.picks.length < 2)
    next = pickUpgrade(
      next,
      index,
      remainingMarket(next.races[index].preparation!.garage!)[0],
    )
  return next
}

function restore(championship: ReturnType<typeof season>) {
  return parseLibrary(
    JSON.stringify({ version: 1, championships: [championship] }),
  ).championships[0]
}

describe('Catalogue fourni et jetons du jeu de base', () => {
  it('représente 34 cartes ordinaires et 62 avancées, en exemplaires distincts', () => {
    expect(UPGRADES).toHaveLength(48)
    expect(
      UPGRADE_CARDS.filter((card) => card.upgrade.level === 'regular'),
    ).toHaveLength(34)
    expect(
      UPGRADE_CARDS.filter((card) => card.upgrade.level === 'advanced'),
    ).toHaveLength(62)
    expect(new Set(UPGRADE_CARDS.map((card) => card.id)).size).toBe(96)
    expect(getUpgradeCard('28-a').upgrade.effects).toEqual({
      acceleration: true,
      directPlay: true,
      scrap: 5,
    })
    expect(getUpgradeCard('36-a').upgrade.effects).toEqual({
      cooling: 3,
      cornerSpeed: -1,
    })
    expect(getUpgradeCard('17-b').upgrade.speed).toBeNull()
    expect(() => getUpgradeCard('49-a')).toThrow()
  })
  it('respecte les quatre circuits du référentiel', () => {
    expect(getBaseTrack('great-britain').cornerLimits).toEqual([10, 6, 5, 3, 4])
    expect(getBaseTrack('italy')).toEqual({
      laps: 3,
      spaces: 54,
      cornerLimits: [5, 2, 3],
      heat: 6,
      stress: 3,
    })
    expect(() => getBaseTrack('japan')).toThrow()
    expect(() => getBaseTrack('constructor')).toThrow()
  })
  it('applique chaque météo sans créer de Heat lors des transferts', () => {
    const track = getBaseTrack('usa')
    expect(getCarSetup(track, getWeatherToken('clouds'))).toEqual({
      heatInEngine: 6,
      heatInDeck: 0,
      heatInDiscard: 0,
      stress: 2,
    })
    expect(getCarSetup(track, getWeatherToken('snow')).heatInEngine).toBe(5)
    expect(getCarSetup(track, getWeatherToken('fog')).heatInEngine).toBe(7)
    expect(getCarSetup(track, getWeatherToken('heavy-rain')).stress).toBe(4)
    expect(getCarSetup(track, getWeatherToken('rain'))).toEqual({
      heatInEngine: 3,
      heatInDeck: 3,
      heatInDiscard: 0,
      stress: 3,
    })
    expect(getCarSetup(track, getWeatherToken('sun'))).toEqual({
      heatInEngine: 3,
      heatInDeck: 0,
      heatInDiscard: 3,
      stress: 3,
    })
    expect(WEATHER_TOKENS).toHaveLength(6)
    expect(ROAD_TOKENS).toHaveLength(12)
    for (const name of new Set(ROAD_TOKENS.map((token) => token.name)))
      expect(ROAD_TOKENS.filter((token) => token.name === name)).toHaveLength(2)
  })
})

describe('Préparation et Garage de championnat', () => {
  it('conserve les anciens championnats sans activer de module', () => {
    const old = fixture()
    expect(old.modules).toBeUndefined()
    expect(restore(old)).toEqual(old)
    expect(isRacePrepared(old, 0)).toBe(true)
  })
  it('limite les modules aux circuits de base', () => {
    const source = season()
    expect(() =>
      createChampionship({ ...source, circuitIds: ['japan'], raceCount: 1 }),
    ).toThrow(/base/)
    const invalid = {
      ...source,
      races: [{ id: 'japan', circuitId: 'japan', result: null }],
    }
    expect(() => restore(invalid)).toThrow(/base/)
  })
  it('prépare un marché humains + 3, sans carte pour les Légendes, et tire un jeton par virage sans remise', () => {
    const source = season()
    const next = prepareRace(source, 0)
    const preparation = next.races[0].preparation!
    expect(preparation.garage!.market).toHaveLength(5)
    expect(new Set(preparation.garage!.market).size).toBe(5)
    expect(preparation.garage!.order).toEqual(
      [...getGrid(source, 0)].reverse().filter((id) => id.startsWith('human')),
    )
    expect(preparation.weather!.roadTokenIds).toHaveLength(
      getBaseTrack(next.races[0].circuitId).cornerLimits.length,
    )
    expect(new Set(preparation.weather!.roadTokenIds).size).toBe(
      preparation.weather!.roadTokenIds.length,
    )
    expect(source.races[0].preparation).toBeUndefined()
    expect(prepareRace(season(), 0).races[0].preparation).toEqual(preparation)
  })
  it.each(['regular', 'advanced'] as const)(
    'ne tire que les cartes du mode %s',
    (garage) => {
      const next = prepareRace(season({ garage, weather: false }), 0)
      expect(
        next.races[0].preparation!.garage!.market.every(
          (id) => getUpgradeCard(id).upgrade.level === garage,
        ),
      ).toBe(true)
      expect(next.races[0].preparation!.weather).toBeNull()
    },
  )
  it('permet la météo seule, avec arrivée possible dès le tirage', () => {
    let next = season({ garage: 'off', weather: true })
    expect(isRacePrepared(next, 0)).toBe(false)
    next = prepareRace(next, 0)
    expect(next.races[0].preparation!.garage).toBeNull()
    expect(isRacePrepared(next, 0)).toBe(true)
    expect(restore(recordResult(next, 0, getGrid(next, 0)))).toBeDefined()
  })
  it('interdit les retirages, préparations hors séquence et résultats avant la fin du Garage', () => {
    const next = prepareRace(season(), 0)
    expect(() => prepareRace(next, 0)).toThrow(/déjà/)
    expect(() => prepareRace(next, 1)).toThrow()
    expect(() => prepareRace(next, -1)).toThrow()
    expect(() => recordResult(next, 0, getGrid(next, 0))).toThrow(/préparation/)
    expect(() => finishGarage(next, 0)).toThrow()
  })
  it('enregistre les choix dans l’ordre et refuse une carte déjà choisie', () => {
    const source = prepareRace(season(), 0)
    const card = source.races[0].preparation!.garage!.market[0]
    const next = pickUpgrade(source, 0, card)
    expect(next.races[0].preparation!.garage!.picks).toEqual([
      {
        participantId: source.races[0].preparation!.garage!.order[0],
        cardId: card,
      },
    ])
    expect(() => pickUpgrade(next, 0, card)).toThrow(/disponible/)
    expect(() => pickUpgrade(next, 0, 'unknown')).toThrow()
    expect(restore(next)).toEqual(next)
    expect(source.races[0].preparation!.garage!.picks).toEqual([])
  })
  it('autorise un seul échange pour le dernier humain, puis remet la carte rendue en réserve', () => {
    const drafted = completeDraft()
    const garage = drafted.races[0].preparation!.garage!
    const swap = {
      give: garage.picks[0].cardId,
      take: remainingMarket(garage)[0],
    }
    expect(() =>
      finishGarage(drafted, 0, { ...swap, give: garage.picks[1].cardId }),
    ).toThrow(/Échange/)
    const finished = finishGarage(drafted, 0, swap)
    expect(getOwnedUpgrades(finished, 0).get(garage.order[0])).toEqual([
      swap.take,
    ])
    expect(getOwnedUpgrades(drafted, 0).get(garage.order[0])).toEqual([
      swap.give,
    ])
    expect(isRacePrepared(finished, 0)).toBe(true)
    expect(() => finishGarage(finished, 0)).toThrow()
    expect(() => pickUpgrade(finished, 0, remainingMarket(garage)[0])).toThrow()
    expect(restore(finished)).toEqual(finished)
  })
  it('conserve les améliorations au fil des courses, sans retirer les cartes possédées', () => {
    let next = season()
    for (let index = 0; index < 4; index++) {
      const held = new Set(
        [...getOwnedUpgrades(next, index - 1).values()].flat(),
      )
      next = completeDraft(next, index)
      expect(
        next.races[index].preparation!.garage!.market.some((id) =>
          held.has(id),
        ),
      ).toBe(false)
      next = finishGarage(next, index)
      expect(
        [...getOwnedUpgrades(next, index).values()].every(
          (cards) => cards.length === index + 1,
        ),
      ).toBe(true)
      next = recordResult(next, index, getGrid(next, index))
      expect(restore(next)).toEqual(next)
    }
  })
  it('conserve les tirages et l’ordre déjà joués après correction d’un résultat', () => {
    let next = finishGarage(completeDraft(), 0)
    next = recordResult(next, 0, getGrid(next, 0))
    next = prepareRace(next, 1)
    const before = next.races[1].preparation
    const corrected = recordResult(next, 0, [...getGrid(next, 0)].reverse())
    expect(corrected.races[1].preparation).toEqual(before)
    expect(getGrid(corrected, 1)).toEqual(before!.grid)
    expect(restore(corrected)).toEqual(corrected)
  })
})

describe('Sauvegardes des modules', () => {
  it('restaure une préparation en cours depuis localStorage', () => {
    const source = prepareRace(season(), 0)
    const partial = pickUpgrade(
      source,
      0,
      source.races[0].preparation!.garage!.market[0],
    )
    let stored = ''
    vi.stubGlobal('localStorage', {
      getItem: () => stored,
      setItem: (_key: string, raw: string) => {
        stored = raw
      },
    })
    saveLibrary({ version: 1, championships: [partial] })
    expect(loadLibrary().library.championships[0]).toEqual(partial)
  })
  it.each([
    (next: ReturnType<typeof season>) => {
      next.races[0].preparation!.garage!.market[0] = 'unknown'
    },
    (next: ReturnType<typeof season>) => {
      next.races[0].preparation!.garage!.picks.push({
        participantId: 'legend-a',
        cardId: next.races[0].preparation!.garage!.market[0],
      })
    },
    (next: ReturnType<typeof season>) => {
      next.races[0].preparation!.garage!.closed = true
    },
    (next: ReturnType<typeof season>) => {
      next.races[0].preparation!.garage!.swap = { give: '1-a', take: '2-b' }
    },
    (next: ReturnType<typeof season>) => {
      next.races[0].preparation!.weather!.tokenId = 'unknown'
    },
    (next: ReturnType<typeof season>) => {
      next.races[0].preparation!.weather!.roadTokenIds[1] =
        next.races[0].preparation!.weather!.roadTokenIds[0]
    },
    (next: ReturnType<typeof season>) => {
      next.races[1].preparation = structuredClone(next.races[0].preparation)
    },
    (next: ReturnType<typeof season>) => {
      next.races[0].preparation!.grid[0] = 'unknown'
    },
  ])('refuse une préparation importée incohérente (%#)', (corrupt) => {
    const next = prepareRace(season(), 0)
    corrupt(next)
    expect(() => restore(next)).toThrow()
  })
})
