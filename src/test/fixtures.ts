import { CIRCUITS } from '../domain/catalog'
import { createChampionship } from '../domain/championship'

export function fixture() {
  return createChampionship({
    name: 'Saison test',
    seed: 'heat-2026',
    participants: [
      { id: 'human', name: 'Camille', kind: 'human', color: 'red' },
      { id: 'legend-a', name: 'Légende A', kind: 'legend', color: 'blue' },
      { id: 'legend-b', name: 'Légende B', kind: 'legend', color: 'green' },
    ],
    circuitIds: CIRCUITS.map((circuit) => circuit.id),
    raceCount: 4,
    legendSettings: { difficulty: 2, progressive: false, rivals: true },
  })
}
