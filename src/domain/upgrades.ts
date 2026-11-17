/** Données : référentiel des améliorations fourni, v1.0 du 25/03/2025, p. 2.
 * Les évaluations communautaires de puissance ne sont pas des règles de jeu.
 */
export interface UpgradeEffects {
  stress?: number
  cooling?: number
  slipstream?: number
  refresh?: boolean
  acceleration?: boolean
  directPlay?: boolean
  salvage?: number
  cornerSpeed?: number
  heat?: number
  scrap?: number
}

export interface Upgrade {
  number: number
  name: string
  level: 'regular' | 'advanced'
  speed: string | null
  effects: UpgradeEffects
}

type UpgradeRow = [number, string, string | null, UpgradeEffects]

const rows: UpgradeRow[] = [
  [1, '4 roues motrices', '4+', {}],
  [2, '4 roues motrices', '+++', {}],
  [3, '4 roues motrices', '+', { cooling: 3 }],
  [4, 'Carrosserie', '3', { stress: 2 }],
  [5, 'Carrosserie', '5', { stress: 1 }],
  [6, 'Carrosserie', '1', { stress: 3 }],
  [7, 'Freins', '1|2|3|4', { heat: 1 }],
  [8, 'Freins', '1|3', {}],
  [9, 'Freins', '2|4', {}],
  [10, 'Freins', '1|5', {}],
  [11, 'Système de refroidissement', '6', { cooling: 1, heat: 1 }],
  [12, 'Système de refroidissement', '1', { cooling: 2 }],
  [13, 'Système de refroidissement', '3', { cooling: 1 }],
  [14, 'R.P.M.', '1', { slipstream: 2 }],
  [15, 'R.P.M.', '2', { slipstream: 2 }],
  [16, 'R.P.M.', '3', { slipstream: 2 }],
  [17, 'Heat complémentaire', null, {}],
  [18, 'Carrosserie', '6', { stress: 3, heat: 1 }],
  [19, 'Carrosserie', '2', { stress: 1, cooling: 1, scrap: 2 }],
  [20, 'Carrosserie', '2', { stress: 1, slipstream: 1 }],
  [21, 'Système de refroidissement', '4', { cooling: 1, scrap: 2 }],
  [22, 'Carburant', '2', { salvage: 2 }],
  [23, 'Carburant', '+', { cooling: 1, salvage: 2 }],
  [24, 'Pédale de gaz', '1', { directPlay: true, scrap: 1 }],
  [25, 'Pédale de gaz', '2', { directPlay: true, scrap: 2 }],
  [26, 'Pédale de gaz', '3', { directPlay: true, scrap: 3 }],
  [27, 'Pédale de gaz', '4', { cooling: 1, directPlay: true, heat: 1 }],
  [
    28,
    'Pédale de gaz',
    '1',
    { acceleration: true, directPlay: true, scrap: 5 },
  ],
  [29, 'R.P.M.', '+', { slipstream: 3 }],
  [30, 'R.P.M.', '1', { slipstream: 3, heat: 1 }],
  [31, 'R.P.M.', '1|2', { slipstream: 1 }],
  [32, 'Suspension', '2', { stress: 1, refresh: true }],
  [33, 'Suspension', '2', { cooling: 1, refresh: true }],
  [34, 'Suspension', '4', { refresh: true }],
  [35, 'Suspension', '1', { slipstream: 1, refresh: true }],
  [36, 'Pneus', '2', { cooling: 3, cornerSpeed: -1 }],
  [37, 'Pneus', '1', { cornerSpeed: 1, scrap: 2 }],
  [38, 'Pneus', '2', { cornerSpeed: 1, scrap: 2 }],
  [39, 'Pneus', '3', { cooling: 2, cornerSpeed: -1 }],
  [40, 'Pneus', '+', { cooling: 1, slipstream: 1, cornerSpeed: 1 }],
  [41, 'Pneus', '++', { cornerSpeed: 2 }],
  [42, 'Turbo compresseur', '7', { cooling: 3, heat: 2 }],
  [43, 'Turbo compresseur', '8', { heat: 1, scrap: 6 }],
  [44, 'Aileron', '4', { cornerSpeed: 2, heat: 1, scrap: 2 }],
  [45, 'Aileron', '3', { cornerSpeed: 2, heat: 1, scrap: 2 }],
  [46, 'Aileron', '6', { cornerSpeed: 3, heat: 2 }],
  [47, '4 roues motrices', '+', { acceleration: true }],
  [48, 'Heat complémentaire', null, {}],
]

export const UPGRADES: Upgrade[] = rows.map(
  ([number, name, speed, effects]) => ({
    number,
    name,
    level: number <= 17 ? 'regular' : 'advanced',
    speed,
    effects,
  }),
)

// Deux cartes physiques distinctes pour chacune des 48 références.
export const UPGRADE_CARDS = UPGRADES.flatMap((upgrade) =>
  ['a', 'b'].map((copy) => ({ id: `${upgrade.number}-${copy}`, upgrade })),
)

export function getUpgradeCard(id: string) {
  const card = UPGRADE_CARDS.find((item) => item.id === id)
  if (!card) throw new Error('Carte Amélioration inconnue.')
  return card
}

export function describeUpgrade(upgrade: Upgrade): string[] {
  if (upgrade.speed === null)
    return ['Carte Heat : commence dans le paquet, et non dans le moteur.']
  const effects = upgrade.effects
  return [
    ...(upgrade.speed.includes('+')
      ? [
          'Chaque + résout un symbole Stress : révéler jusqu’à une carte de base.',
        ]
      : []),
    ...(effects.stress ? [`Réduction du stress : ${effects.stress}`] : []),
    ...(effects.cooling ? [`Refroidissement : ${effects.cooling}`] : []),
    ...(effects.slipstream
      ? [`Aspiration améliorée : +${effects.slipstream}`]
      : []),
    ...(effects.refresh
      ? ['Récupération : peut retourner sur le paquet.']
      : []),
    ...(effects.acceleration
      ? ['Accélération : +1 par symbole + utilisé.']
      : []),
    ...(effects.directPlay ? ['Jeu direct pendant la Réaction.'] : []),
    ...(effects.salvage ? [`Sauvetage : ${effects.salvage}`] : []),
    ...(effects.cornerSpeed
      ? [
          `Limite de virage : ${effects.cornerSpeed > 0 ? '+' : ''}${effects.cornerSpeed} (obligatoire)`,
        ]
      : []),
    ...(effects.heat
      ? [`Surchauffe : ${effects.heat} Heat (obligatoire)`]
      : []),
    ...(effects.scrap
      ? [`Rebuts : ${effects.scrap} cartes (obligatoire)`]
      : []),
  ]
}
