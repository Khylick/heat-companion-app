/** Livret avancé FR p. 6–9. Associations vérifiées sur les jetons physiques
 * visibles dans les ressources publiques de bga-devs/bga-heat (img/weather-*).
 */
import type { TrackSetup } from './base-tracks'

export interface WeatherToken {
  id: string
  name: string
  heatDelta: number
  stressDelta: number
  heatInDeck: number
  heatInDiscard: number
  sectorEffect: string
}

export const WEATHER_TOKENS: WeatherToken[] = [
  {
    id: 'clouds',
    name: 'Ciel couvert',
    heatDelta: 0,
    stressDelta: -1,
    heatInDeck: 0,
    heatInDiscard: 0,
    sectorEffect: 'Aucun refroidissement autorisé dans ce secteur.',
  },
  {
    id: 'fog',
    name: 'Brouillard',
    heatDelta: 1,
    stressDelta: 0,
    heatInDeck: 0,
    heatInDiscard: 0,
    sectorEffect:
      'Impossible de commencer une aspiration dans ce secteur (y entrer reste possible).',
  },
  {
    id: 'heavy-rain',
    name: 'Pluie intense',
    heatDelta: 0,
    stressDelta: 1,
    heatInDeck: 0,
    heatInDiscard: 0,
    sectorEffect:
      'Aspiration : jusqu’à 2 cases supplémentaires en partant de ce secteur.',
  },
  {
    id: 'snow',
    name: 'Grand froid',
    heatDelta: -1,
    stressDelta: 0,
    heatInDeck: 0,
    heatInDiscard: 0,
    sectorEffect: 'Refroidissement : +1 pendant la Réaction dans ce secteur.',
  },
  {
    id: 'rain',
    name: 'Pluie',
    heatDelta: 0,
    stressDelta: 0,
    heatInDeck: 3,
    heatInDiscard: 0,
    sectorEffect: 'Refroidissement : +1 pendant la Réaction dans ce secteur.',
  },
  {
    id: 'sun',
    name: 'Soleil',
    heatDelta: 0,
    stressDelta: 0,
    heatInDeck: 0,
    heatInDiscard: 3,
    sectorEffect:
      'Aspiration : jusqu’à 2 cases supplémentaires en partant de ce secteur.',
  },
]

export interface RoadToken {
  id: string
  name: string
  scope: 'corner' | 'sector'
  limitDelta: number
  effect: string
}

const roadTypes: Omit<RoadToken, 'id'>[] = [
  {
    name: 'Météo',
    scope: 'sector',
    limitDelta: 0,
    effect: 'Appliquer l’effet de secteur du jeton Météo.',
  },
  {
    name: 'Virage dangereux',
    scope: 'corner',
    limitDelta: 0,
    effect:
      'En cas de dépassement de la limite, payer 1 Heat supplémentaire au total (obligatoire).',
  },
  {
    name: 'Limite réduite',
    scope: 'corner',
    limitDelta: -1,
    effect:
      'Limite de vitesse diminuée de 1 pour tous les pilotes (obligatoire).',
  },
  {
    name: 'Limite augmentée',
    scope: 'corner',
    limitDelta: 1,
    effect:
      'Limite de vitesse augmentée de 1 pour tous les pilotes (obligatoire).',
  },
  {
    name: 'Régulation de la chaleur',
    scope: 'sector',
    limitDelta: 0,
    effect:
      'Booster sans payer de Heat dans ce secteur ; toujours un seul boost par manche.',
  },
  {
    name: 'Aspiration améliorée',
    scope: 'sector',
    limitDelta: 0,
    effect:
      'Aspiration : jusqu’à 1 case supplémentaire en partant de ce secteur.',
  },
]

// Deux exemplaires par type ; le tirage est effectué sans remise dans la course.
export const ROAD_TOKENS: RoadToken[] = roadTypes.flatMap((type, index) =>
  ['a', 'b'].map((copy) => ({ ...type, id: `${index + 1}-${copy}` })),
)

export function getWeatherToken(id: string): WeatherToken {
  const token = WEATHER_TOKENS.find((item) => item.id === id)
  if (!token) throw new Error('Jeton Météo inconnu.')
  return token
}

export function getRoadToken(id: string): RoadToken {
  const token = ROAD_TOKENS.find((item) => item.id === id)
  if (!token) throw new Error('Jeton État de la piste inconnu.')
  return token
}

export function getCarSetup(track: TrackSetup, weather: WeatherToken | null) {
  const heatInDeck = weather?.heatInDeck ?? 0
  const heatInDiscard = weather?.heatInDiscard ?? 0
  return {
    heatInEngine:
      track.heat + (weather?.heatDelta ?? 0) - heatInDeck - heatInDiscard,
    heatInDeck,
    heatInDiscard,
    stress: track.stress + (weather?.stressDelta ?? 0),
  }
}
