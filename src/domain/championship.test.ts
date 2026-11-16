import { describe, expect, it } from 'vitest'
import { CAR_COLORS, CIRCUITS } from './catalog'
import {
  createChampionship,
  getGrid,
  getLegendSetup,
  getStandings,
  initialGrid,
  recordResult,
  type Participant,
} from './championship'
import { fixture } from '../test/fixtures'

const participants: Participant[] = [
  { id: 'human', name: 'Camille', kind: 'human', color: 'red' },
  { id: 'legend-a', name: 'Légende A', kind: 'legend', color: 'blue' },
  { id: 'legend-b', name: 'Légende B', kind: 'legend', color: 'green' },
]

describe('Génération du championnat', () => {
  it('génère un calendrier reproductible sans doublons et ne modifie pas les entrées', () => {
    const input = CIRCUITS.map((circuit) => circuit.id)
    const first = fixture()
    const second = fixture()
    expect(first.races.map((race) => race.circuitId)).toEqual(
      second.races.map((race) => race.circuitId),
    )
    expect(new Set(first.races.map((race) => race.circuitId)).size).toBe(4)
    expect(CIRCUITS.map((circuit) => circuit.id)).toEqual(input)
    expect(initialGrid(first)).toEqual(initialGrid(second))
    expect(new Set(initialGrid(first))).toEqual(
      new Set(participants.map((participant) => participant.id)),
    )
  })
  it('refuse un calendrier plus long que la sélection et les circuits inconnus', () => {
    const base = {
      name: 'Test',
      seed: 'a',
      participants,
      legendSettings: { difficulty: 2, progressive: false, rivals: false },
    }
    expect(() =>
      createChampionship({ ...base, circuitIds: ['usa'], raceCount: 2 }),
    ).toThrow()
    expect(() =>
      createChampionship({ ...base, circuitIds: ['unknown'], raceCount: 1 }),
    ).toThrow()
  })
  it('normalise la graine et l’ordre de sélection des circuits', () => {
    const input = {
      name: 'Test',
      seed: 'même-graine',
      participants,
      raceCount: 3,
      legendSettings: { difficulty: 2, progressive: false, rivals: false },
    }
    const first = createChampionship({
      ...input,
      circuitIds: ['usa', 'france', 'italy'],
    })
    const second = createChampionship({
      ...input,
      seed: '  même-graine  ',
      circuitIds: ['italy', 'usa', 'france'],
    })
    expect(first.races.map((race) => race.circuitId)).toEqual(
      second.races.map((race) => race.circuitId),
    )
    expect(initialGrid(first)).toEqual(initialGrid(second))
  })
  it('autorise douze bolides avec Legends', () => {
    const drivers = CAR_COLORS.map((color, index) => ({
      id: color.id,
      name: `Pilote ${index}`,
      kind: index === 0 ? ('human' as const) : ('legend' as const),
      color: color.id,
    }))
    const championship = createChampionship({
      name: 'Douze',
      seed: '12',
      participants: drivers,
      circuitIds: ['usa'],
      raceCount: 1,
      legendSettings: { difficulty: 6, progressive: false, rivals: true },
    })
    expect(championship.participants).toHaveLength(12)
    const finished = recordResult(
      championship,
      0,
      drivers.map((driver) => driver.id),
    )
    expect(getStandings(finished)[11].points).toBe(0)
  })
  it('refuse les couleurs dupliquées et les saisons sans humain', () => {
    const base = {
      name: 'Test',
      seed: 'a',
      circuitIds: ['usa'],
      raceCount: 1,
      legendSettings: { difficulty: 2, progressive: false, rivals: false },
    }
    expect(() =>
      createChampionship({
        ...base,
        participants: participants.map((participant) => ({
          ...participant,
          color: 'red',
        })),
      }),
    ).toThrow()
    expect(() =>
      createChampionship({
        ...base,
        participants: participants.map((participant) => ({
          ...participant,
          kind: 'legend',
        })),
      }),
    ).toThrow()
  })
})

describe('Résultats, grilles et départages', () => {
  it('attribue les points et utilise le classement pour la grille suivante', () => {
    const original = fixture()
    const updated = recordResult(original, 0, ['legend-b', 'human', 'legend-a'])
    expect(
      getStandings(updated).map((standing) => [
        standing.participant.id,
        standing.points,
      ]),
    ).toEqual([
      ['legend-b', 9],
      ['human', 6],
      ['legend-a', 4],
    ])
    expect(getGrid(updated, 1)).toEqual(['legend-b', 'human', 'legend-a'])
    expect(original.races[0].result).toBeNull()
  })
  it('départage les égalités sur la dernière course, sans utiliser les victoires', () => {
    let championship = recordResult(fixture(), 0, [
      'human',
      'legend-a',
      'legend-b',
    ])
    championship = recordResult(championship, 1, [
      'legend-a',
      'human',
      'legend-b',
    ])
    expect(
      getStandings(championship)
        .slice(0, 2)
        .map((standing) => [standing.participant.id, standing.points]),
    ).toEqual([
      ['legend-a', 15],
      ['human', 15],
    ])
    expect(getGrid(championship, 2)[0]).toBe('legend-a')
  })
  it('une correction recalcule les totaux tout en conservant les résultats suivants', () => {
    let championship = recordResult(fixture(), 0, [
      'human',
      'legend-a',
      'legend-b',
    ])
    championship = recordResult(championship, 1, [
      'human',
      'legend-b',
      'legend-a',
    ])
    const corrected = recordResult(championship, 0, [
      'legend-b',
      'legend-a',
      'human',
    ])
    expect(corrected.races[1].result).toEqual(championship.races[1].result)
    expect(
      getStandings(corrected).map((standing) => [
        standing.participant.id,
        standing.points,
      ]),
    ).toEqual([
      ['legend-b', 15],
      ['human', 13],
      ['legend-a', 10],
    ])
  })
  it('refuse les doublons, les pilotes inconnus et les courses hors séquence', () => {
    expect(() =>
      recordResult(fixture(), 0, ['human', 'human', 'legend-b']),
    ).toThrow()
    expect(() =>
      recordResult(fixture(), 0, ['human', 'legend-a', 'unknown']),
    ).toThrow()
    expect(() => recordResult(fixture(), 0, ['human'])).toThrow()
    expect(() =>
      recordResult(fixture(), 1, ['human', 'legend-a', 'legend-b']),
    ).toThrow()
    expect(() =>
      recordResult(fixture(), -1, ['human', 'legend-a', 'legend-b']),
    ).toThrow()
  })
})

describe('Préparation Legends — livret français pages 2 à 5', () => {
  it.each([
    [1, 'Paquet vert, étoiles ignorées'],
    [2, 'Paquet vert'],
    [3, 'Paquets vert + jaune'],
    [4, 'Paquet jaune'],
    [5, 'Paquets jaune + rouge'],
    [6, 'Paquet rouge'],
  ])('configure le niveau %i', (difficulty, deck) => {
    const championship = fixture()
    championship.legendSettings = {
      difficulty: Number(difficulty),
      progressive: false,
      rivals: false,
    }
    expect(getLegendSetup(championship, 0).deck).toBe(deck)
    expect(getLegendSetup(championship, 0).stars).toBe(Number(difficulty) >= 2)
  })
  it('ne désigne aucun rival en première course puis sélectionne les deux meilleures Légendes', () => {
    const championship = fixture()
    expect(getLegendSetup(championship, 0).rivals).toEqual([])
    const updated = recordResult(championship, 0, [
      'legend-b',
      'human',
      'legend-a',
    ])
    expect(getLegendSetup(updated, 1).rivals.map((rival) => rival.id)).toEqual([
      'legend-b',
      'legend-a',
    ])
  })
  it('plafonne la progression à six', () => {
    const championship = fixture()
    championship.legendSettings = {
      difficulty: 5,
      progressive: true,
      rivals: false,
    }
    expect(getLegendSetup(championship, 0).level).toBe(5)
    expect(getLegendSetup(championship, 1).level).toBe(6)
    expect(getLegendSetup(championship, 3).level).toBe(6)
  })
  it('refuse le module Rivaux au niveau 1', () => {
    expect(() =>
      createChampionship({
        name: 'Test',
        seed: 'a',
        participants,
        circuitIds: ['usa'],
        raceCount: 1,
        legendSettings: { difficulty: 1, progressive: false, rivals: true },
      }),
    ).toThrow(/Rivaux/)
  })
})
