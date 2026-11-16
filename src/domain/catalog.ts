export type Expansion = 'base' | 'heavy-rain' | 'tunnel-vision' | 'rocky-roads'

export interface Circuit {
  id: string
  name: string
  country: string
  expansion: Expansion
  feature: string
  path: string
}

export const EXPANSIONS: Record<Expansion, string> = {
  base: 'Jeu de base',
  'heavy-rain': 'Heavy Rain',
  'tunnel-vision': 'Tunnel Vision',
  'rocky-roads': 'Rocky Roads',
}

// Tracés décoratifs originaux : ils ne représentent pas les plateaux de jeu.
export const CIRCUITS: Circuit[] = [
  {
    id: 'usa',
    name: 'États-Unis',
    country: 'US',
    expansion: 'base',
    feature: 'Jeu de base',
    path: 'M30 70 Q10 25 55 25 L135 25 Q165 25 155 55 L135 80 L80 65 Q55 105 30 70Z',
  },
  {
    id: 'great-britain',
    name: 'Grande-Bretagne',
    country: 'GB',
    expansion: 'base',
    feature: 'Jeu de base',
    path: 'M25 70 L55 20 L80 45 L135 20 Q165 25 155 50 L125 60 L115 85 L70 75 Q35 100 25 70Z',
  },
  {
    id: 'france',
    name: 'France',
    country: 'FR',
    expansion: 'base',
    feature: 'Jeu de base',
    path: 'M25 80 L60 20 Q70 10 85 30 L100 55 L150 25 Q170 25 155 50 L120 90 L75 70 Q40 105 25 80Z',
  },
  {
    id: 'italy',
    name: 'Italie',
    country: 'IT',
    expansion: 'base',
    feature: 'Jeu de base',
    path: 'M30 80 L30 35 Q30 15 55 20 L150 50 Q175 65 145 80 L100 65 L65 85 Q40 95 30 80Z',
  },
  {
    id: 'japan',
    name: 'Japon',
    country: 'JP',
    expansion: 'heavy-rain',
    feature: 'Flaques d’eau',
    path: 'M20 65 Q15 25 45 25 L80 35 L110 15 L140 35 L125 55 L155 75 Q140 100 110 75 L75 65 L45 85Z',
  },
  {
    id: 'mexico',
    name: 'Mexique',
    country: 'MX',
    expansion: 'heavy-rain',
    feature: 'Chicanes',
    path: 'M25 75 L25 30 L60 30 L65 45 L95 45 L100 25 L145 25 L155 80 L120 80 L110 65 L80 65 L70 85Z',
  },
  {
    id: 'spain',
    name: 'Espagne',
    country: 'ES',
    expansion: 'tunnel-vision',
    feature: 'Tunnels',
    path: 'M25 75 Q10 40 45 25 L85 20 L100 45 L135 30 Q165 30 155 60 L125 90 L80 70 L60 90Z',
  },
  {
    id: 'netherlands',
    name: 'Pays-Bas',
    country: 'NL',
    expansion: 'tunnel-vision',
    feature: 'Tunnels',
    path: 'M20 70 L45 25 Q55 10 75 30 L90 55 L115 25 L145 30 L155 80 L125 80 L110 65 L80 90 L55 65 L40 85Z',
  },
  {
    id: 'south-africa',
    name: 'Afrique du Sud',
    country: 'ZA',
    expansion: 'rocky-roads',
    feature: 'Graviers',
    path: 'M25 80 L40 25 L80 20 L95 50 L130 25 L155 40 L135 65 L155 85 L105 85 L85 65 L60 90Z',
  },
  {
    id: 'germany',
    name: 'Allemagne',
    country: 'DE',
    expansion: 'rocky-roads',
    feature: 'Chicanes',
    path: 'M25 75 L25 25 L60 25 L70 40 L95 40 L105 25 L150 25 L155 75 L125 90 L95 70 L60 90Z',
  },
]

export const CAR_COLORS = [
  { id: 'red', name: 'Rouge', hex: '#b64032' },
  { id: 'blue', name: 'Bleu', hex: '#3d688c' },
  { id: 'yellow', name: 'Jaune', hex: '#c49428' },
  { id: 'green', name: 'Vert', hex: '#39735c' },
  { id: 'black', name: 'Noir', hex: '#343a3b' },
  { id: 'silver', name: 'Argent', hex: '#899392' },
  { id: 'orange', name: 'Orange', hex: '#d46c2e' },
  { id: 'purple', name: 'Violet', hex: '#88608e' },
  { id: 'white', name: 'Blanc', hex: '#c7bc9e' },
  { id: 'pink', name: 'Rose', hex: '#bd778e' },
  { id: 'cyan', name: 'Turquoise', hex: '#418d94' },
  { id: 'brown', name: 'Marron', hex: '#89634b' },
] as const

export function getCircuit(id: string): Circuit {
  const circuit = CIRCUITS.find((item) => item.id === id)
  if (!circuit) throw new Error('Circuit inconnu.')
  return circuit
}
