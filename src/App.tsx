import { useRef, useState } from 'react'
import {
  ChampionshipForm,
  CircuitCatalog,
  DriverDot,
  ResultForm,
  TrackDrawing,
} from './components'
import { getCircuit } from './domain/catalog'
import {
  DEFAULT_POINTS,
  getGrid,
  getLegendSetup,
  getStandings,
  recordResult,
  type Championship,
} from './domain/championship'
import {
  loadLibrary,
  parseLibrary,
  saveLibrary,
  STORAGE_KEY,
  type Library,
} from './storage'

type Tab = 'championships' | 'circuits' | 'legends'

function download(raw: string, filename: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function App() {
  const [initial] = useState(loadLibrary)
  const [library, setLibrary] = useState(initial.library)
  const [storageIssue, setStorageIssue] = useState(initial.error)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('championships')
  const [activeId, setActiveId] = useState(
    initial.library.championships[0]?.id ?? '',
  )
  const [creating, setCreating] = useState(false)
  const [editingRace, setEditingRace] = useState<number | null>(null)
  const importRef = useRef<HTMLInputElement>(null)
  const active = library.championships.find((item) => item.id === activeId)
  const completed = active?.races.filter((race) => race.result).length ?? 0
  const nextIndex = active ? active.races.findIndex((race) => !race.result) : -1

  function persist(next: Library): boolean {
    setMessage('')
    setError('')
    if (storageIssue) {
      setError(
        'La sauvegarde existante doit être exportée puis son remplacement autorisé.',
      )
      return false
    }
    try {
      saveLibrary(next)
      setLibrary(next)
      return true
    } catch {
      setError(
        'Sauvegarde impossible : vérifiez l’espace disponible et les autorisations du navigateur. Vos dernières modifications n’ont pas été appliquées.',
      )
      return false
    }
  }

  function exportLibrary() {
    try {
      download(
        storageIssue
          ? (localStorage.getItem(STORAGE_KEY) ?? '{}')
          : JSON.stringify(library, null, 2),
        'heat-championnats.json',
      )
      setMessage('Export téléchargé.')
    } catch {
      setError('Le navigateur ne permet pas de lire la sauvegarde locale.')
    }
  }

  async function importLibrary(file: File) {
    setError('')
    try {
      if (file.size > 2_000_000) throw new Error('Le fichier dépasse 2 Mo.')
      const imported = parseLibrary(await file.text())
      if (
        imported.championships.some((item) =>
          library.championships.some((current) => current.id === item.id),
        )
      ) {
        throw new Error(
          'Ce fichier contient un championnat déjà présent. Aucun championnat n’a été remplacé.',
        )
      }
      if (library.championships.length + imported.championships.length > 100)
        throw new Error('La bibliothèque est limitée à 100 championnats.')
      if (
        persist({
          version: 1,
          championships: [...library.championships, ...imported.championships],
        })
      ) {
        setActiveId(imported.championships[0]?.id ?? activeId)
        setTab('championships')
        setMessage(
          `${imported.championships.length} championnat(s) importé(s).`,
        )
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import impossible.')
    }
  }

  function saveResult(result: string[]) {
    if (!active || editingRace === null) return false
    try {
      const updated = recordResult(active, editingRace, result)
      if (
        !persist({
          ...library,
          championships: library.championships.map((item) =>
            item.id === active.id ? updated : item,
          ),
        })
      )
        return false
      setMessage('Résultat enregistré. Le classement est à jour.')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Résultat invalide.')
      return false
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#main"
          className="brand"
          aria-label="Heat Companion — aller au contenu"
        >
          <span className="brand-word">
            HEAT<span className="brand-stripe">///</span>
          </span>
          <span className="brand-subtitle">COMPANION</span>
        </a>
        <div className="sidebar-rule" />
        <p className="nav-caption">VOTRE PADDOCK</p>
        <nav aria-label="Navigation principale">
          {(
            [
              ['championships', '⚑', 'Championnats'],
              ['circuits', '⌁', 'Circuits'],
              ['legends', '✦', 'Legends'],
            ] as const
          ).map(([value, symbol, label]) => (
            <button
              key={value}
              className={`nav-item ${tab === value ? 'active' : ''}`}
              aria-current={tab === value ? 'page' : undefined}
              onClick={() => setTab(value)}
            >
              <span aria-hidden="true">{symbol}</span>
              {label}
              {value === 'championships' && (
                <span className="nav-count">
                  {library.championships.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          Sauvegarde sur cet appareil<p>Votre prochaine course commence ici.</p>
          <span className="version">ÉDITION PADDOCK / 0.1</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            LE GARAGE{' '}
            <span className="breadcrumb">
              /{' '}
              {tab === 'circuits'
                ? 'Circuits'
                : tab === 'legends'
                  ? 'Legends'
                  : 'Championnats'}
            </span>
          </span>
          <span className="topbar-badge">COMPAGNON NON OFFICIEL</span>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <p className="eyebrow">À VOUS DE PRENDRE LE DÉPART</p>
              <h1>
                {tab === 'circuits'
                  ? 'Tour du monde.'
                  : tab === 'legends'
                    ? 'Des rivaux de légende.'
                    : 'Votre paddock.'}
              </h1>
            </div>
            <button
              className="primary"
              onClick={() => setCreating(true)}
              disabled={library.championships.length >= 100}
            >
              + Nouveau championnat
            </button>
          </div>
          {storageIssue && (
            <div className="error" role="alert">
              <p>{storageIssue}</p>
              <div className="button-row">
                <button className="secondary" onClick={exportLibrary}>
                  Exporter la sauvegarde existante
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Autoriser le remplacement de la sauvegarde locale lors du prochain enregistrement ? Exportez-la d’abord pour en conserver une copie.',
                      )
                    )
                      setStorageIssue(null)
                  }}
                >
                  Autoriser le remplacement
                </button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div role="status" className={message ? 'success' : 'sr-only'}>
            {message}
          </div>
          {tab === 'circuits' ? (
            <CircuitCatalog />
          ) : tab === 'legends' ? (
            <LegendsOverview />
          ) : (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-label">
                    <span className="status-dot" /> LA SAISON VOUS ATTEND
                  </span>
                  <h2>
                    La course se joue sur table.
                    <br />
                    <em>La saison se prépare ici.</em>
                  </h2>
                  <p>
                    Réunissez vos pilotes, laissez le hasard dessiner le
                    calendrier et gardez le cap jusqu’au dernier Grand Prix.
                  </p>
                  <button
                    className="hero-link"
                    onClick={() => setCreating(true)}
                    disabled={library.championships.length >= 100}
                  >
                    Préparer une saison <span aria-hidden="true">↗</span>
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="racing-circle" />
                  <svg viewBox="0 0 320 240">
                    <path
                      className="hero-track-shadow"
                      d="M50 150 Q15 65 100 50 L230 45 Q290 45 265 105 L210 145 L190 195 Q160 225 120 185 L95 135 Q65 185 50 150Z"
                    />
                    <path
                      className="hero-track"
                      d="M50 150 Q15 65 100 50 L230 45 Q290 45 265 105 L210 145 L190 195 Q160 225 120 185 L95 135 Q65 185 50 150Z"
                    />
                    <path
                      className="hero-track-line"
                      d="M50 150 Q15 65 100 50 L230 45 Q290 45 265 105 L210 145 L190 195 Q160 225 120 185 L95 135 Q65 185 50 150Z"
                    />
                    <g transform="translate(158 39) rotate(-2)">
                      <rect
                        x="0"
                        y="0"
                        width="38"
                        height="17"
                        rx="7"
                        fill="#e37843"
                      />
                      <rect
                        x="10"
                        y="-4"
                        width="9"
                        height="25"
                        rx="3"
                        fill="#efd8b0"
                      />
                      <rect
                        x="25"
                        y="-4"
                        width="9"
                        height="25"
                        rx="3"
                        fill="#efd8b0"
                      />
                      <rect
                        x="13"
                        y="4"
                        width="10"
                        height="9"
                        rx="4"
                        fill="#193d36"
                      />
                    </g>
                  </svg>
                  <span className="art-caption">
                    10 CIRCUITS. UNE SEULE AMBITION.
                  </span>
                </div>
              </section>
              <div className="stats-strip">
                <div>
                  <span className="stat-number">
                    {String(library.championships.length).padStart(2, '0')}
                  </span>
                  <span>Championnats créés</span>
                </div>
                <div>
                  <span className="stat-number">10</span>
                  <span>Circuits disponibles</span>
                </div>
                <div>
                  <span className="stat-number">06</span>
                  <span>Niveaux Legends</span>
                </div>
                <div>
                  <span className="stat-icon">↺</span>
                  <span>Reprenez à votre rythme</span>
                </div>
              </div>
              <section className="championship-section">
                <div className="section-title">
                  <div>
                    <p className="eyebrow">DE LA GRILLE AU PODIUM</p>
                    <h2>Mes championnats</h2>
                  </div>
                  <div className="button-row">
                    <button
                      className="text-button"
                      onClick={() => importRef.current?.click()}
                    >
                      ↥ Importer
                    </button>
                    <button className="text-button" onClick={exportLibrary}>
                      ↧ Exporter
                    </button>
                  </div>
                </div>
                <input
                  ref={importRef}
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Importer une sauvegarde JSON"
                  type="file"
                  accept=".json,application/json"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void importLibrary(file)
                    event.target.value = ''
                  }}
                />
                {library.championships.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-flag" aria-hidden="true">
                      ⚑
                    </span>
                    <h3>Une grille de départ à remplir.</h3>
                    <p>
                      Un groupe d’amis, quelques Légendes et une série de Grands
                      Prix.
                      <br />
                      Il ne manque plus que votre premier championnat.
                    </p>
                    <button
                      className="primary"
                      onClick={() => setCreating(true)}
                    >
                      Créer mon championnat <span aria-hidden="true">↗</span>
                    </button>
                    <span className="empty-footnote">
                      Sans compte · Sauvegarde locale · Toutes les extensions
                    </span>
                  </div>
                ) : (
                  <>
                    <div
                      className="season-tabs"
                      aria-label="Choisir un championnat"
                    >
                      {library.championships.map((championship) => (
                        <button
                          key={championship.id}
                          className={
                            championship.id === activeId ? 'selected' : ''
                          }
                          aria-pressed={championship.id === activeId}
                          onClick={() => setActiveId(championship.id)}
                        >
                          {championship.name}
                          <span>
                            {
                              championship.races.filter((race) => race.result)
                                .length
                            }
                            /{championship.races.length}
                          </span>
                        </button>
                      ))}
                    </div>
                    {active && (
                      <>
                        <div className="season-heading">
                          <div>
                            <span className="pill">
                              {nextIndex === -1
                                ? 'SAISON TERMINÉE'
                                : completed === 0
                                  ? 'PRÊT AU DÉPART'
                                  : 'SAISON EN COURS'}
                            </span>
                            <h3>{active.name}</h3>
                            <p className="muted">
                              {active.participants.length} pilotes ·{' '}
                              {active.races.length} courses · Format
                              personnalisé · Graine {active.seed}
                            </p>
                          </div>
                          <button
                            className="text-button danger"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Supprimer « ${active.name} » et ses résultats ? Cette action est définitive sur cet appareil.`,
                                ) &&
                                persist({
                                  ...library,
                                  championships: library.championships.filter(
                                    (item) => item.id !== active.id,
                                  ),
                                })
                              )
                                setActiveId(
                                  library.championships.find(
                                    (item) => item.id !== active.id,
                                  )?.id ?? '',
                                )
                            }}
                          >
                            Supprimer
                          </button>
                        </div>
                        <div
                          className="progress-track"
                          role="progressbar"
                          aria-label="Progression du championnat"
                          aria-valuemin={0}
                          aria-valuemax={active.races.length}
                          aria-valuenow={completed}
                        >
                          <span
                            style={{
                              width: `${(completed / active.races.length) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="season-layout">
                          <div>
                            <div className="subsection-heading">
                              <h3>Le calendrier</h3>
                              <span>
                                {completed} / {active.races.length} terminées
                              </span>
                            </div>
                            <div className="race-list">
                              {active.races.map((race, index) => {
                                const circuit = getCircuit(race.circuitId)
                                const unlocked =
                                  index <= nextIndex || nextIndex === -1
                                return (
                                  <article
                                    key={race.id}
                                    className={`race-card ${index === nextIndex ? 'next-race' : ''}`}
                                  >
                                    <span className="race-number">
                                      {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <TrackDrawing circuit={circuit} />
                                    <div className="grow">
                                      <p className="eyebrow">
                                        {race.result
                                          ? 'TERMINÉE'
                                          : index === nextIndex
                                            ? 'PROCHAIN DÉPART'
                                            : 'À VENIR'}
                                      </p>
                                      <h4>{circuit.name}</h4>
                                      <p className="muted">
                                        {race.result
                                          ? `Victoire : ${active.participants.find((participant) => participant.id === race.result?.[0])?.name}`
                                          : circuit.feature}
                                      </p>
                                    </div>
                                    <button
                                      className="secondary"
                                      disabled={!unlocked}
                                      onClick={() => setEditingRace(index)}
                                    >
                                      {race.result
                                        ? 'Corriger'
                                        : 'Saisir l’arrivée'}
                                    </button>
                                  </article>
                                )
                              })}
                            </div>
                            {nextIndex !== -1 && (
                              <RacePreparation
                                championship={active}
                                raceIndex={nextIndex}
                              />
                            )}
                          </div>
                          <Standings championship={active} />
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
              <div className="bottom-note">
                <span aria-hidden="true">✦</span>
                <div>
                  <strong>Vos Légendes prennent aussi le départ.</strong>
                  <p>
                    Configurez leur difficulté et leurs rivaux. Jouez leurs
                    cartes et déplacements sur le plateau.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab('legends')}
                >
                  Découvrir Legends ↗
                </button>
              </div>
            </>
          )}
          <footer>
            <span>HEAT COMPANION</span>
            <p>
              Application non officielle pour Heat: Pedal to the Metal. Heat et
              ses illustrations appartiennent à leurs ayants droit.
            </p>
            <span>FAIT POUR JOUER.</span>
          </footer>
        </main>
      </div>
      {creating && (
        <ChampionshipForm
          onClose={() => setCreating(false)}
          onCreate={(championship) => {
            if (library.championships.length >= 100) {
              setError('La bibliothèque est limitée à 100 championnats.')
              return false
            }
            if (
              !persist({
                ...library,
                championships: [championship, ...library.championships],
              })
            )
              return false
            setActiveId(championship.id)
            setTab('championships')
            setMessage('Votre calendrier est prêt. Bon championnat !')
            return true
          }}
        />
      )}
      {active && editingRace !== null && (
        <ResultForm
          championship={active}
          raceIndex={editingRace}
          onClose={() => setEditingRace(null)}
          onSave={saveResult}
        />
      )}
    </div>
  )
}

function Standings({ championship }: { championship: Championship }) {
  const standings = getStandings(championship)
  const started = championship.races.some((race) => race.result)
  return (
    <section className="standings">
      <div className="subsection-heading">
        <h3>Classement général</h3>
        <span>PTS</span>
      </div>
      <ol>
        {standings.map((standing, index) => (
          <li key={standing.participant.id}>
            <span className="standing-position">{index + 1}</span>
            <DriverDot participant={standing.participant} />
            <div className="grow">
              <strong>{standing.participant.name}</strong>
              <span>
                {standing.participant.kind === 'legend'
                  ? 'Légende'
                  : 'Pilote humain'}
              </span>
            </div>
            <strong className="standing-points">{standing.points}</strong>
          </li>
        ))}
      </ol>
      <p className="field-help">
        {started
          ? 'Égalité de points : meilleur résultat dans la dernière course disputée.'
          : 'Avant la première course, l’ordre correspond à la grille tirée au sort.'}
      </p>
      <div className="scoring-note">
        POINTS PAR PLACE
        <br />
        <strong>
          {championship.points.every(
            (point, index) => point === DEFAULT_POINTS[index],
          )
            ? '9 · 6 · 4 · 3 · 2 · 1 · puis 0'
            : championship.points.join(' · ')}
        </strong>
      </div>
    </section>
  )
}

function RacePreparation({
  championship,
  raceIndex,
}: {
  championship: Championship
  raceIndex: number
}) {
  const setup = getLegendSetup(championship, raceIndex)
  const hasLegends = championship.participants.some(
    (participant) => participant.kind === 'legend',
  )
  return (
    <section className="preparation">
      <p className="eyebrow">AVANT LE DÉPART / COURSE {raceIndex + 1}</p>
      <h3>La grille est prête.</h3>
      <ol className="grid-order">
        {getGrid(championship, raceIndex).map((id, index) => {
          const participant = championship.participants.find(
            (item) => item.id === id,
          )!
          return (
            <li key={id}>
              <span>{index + 1}</span>
              <DriverDot participant={participant} />
              {participant.name}
            </li>
          )
        })}
      </ol>
      {hasLegends && (
        <div className="legend-setup">
          <strong>Legends · niveau {setup.level}</strong>
          <p>
            {setup.deck} ·{' '}
            {setup.stars ? 'module Étoile actif' : 'sans module Étoile'}
          </p>
          <p>
            {setup.rivals.length
              ? `Rivaux : ${setup.rivals.map((participant) => participant.name).join(' et ')}`
              : championship.legendSettings.rivals && raceIndex === 0
                ? 'Aucun rival à la première course.'
                : 'Module Rivaux désactivé.'}
          </p>
        </div>
      )}
      <p className="field-help">
        Préparez les événements, le garage et la météo sur table. L’application
        n’automatise pas encore les cartes ni les déplacements.
      </p>
    </section>
  )
}

function LegendsOverview() {
  return (
    <>
      <section className="legend-intro">
        <span className="legend-symbol" aria-hidden="true">
          ✦
        </span>
        <div>
          <p className="eyebrow">HEAT: LEGENDS / EXTENSION 2026</p>
          <h2>De la concurrence à chaque virage.</h2>
          <p>
            Le socle prend en charge la difficulté et la désignation des rivaux
            en championnat. Les cartes, capacités et déplacements restent à
            résoudre sur table.
          </p>
        </div>
      </section>
      <div className="legend-columns">
        <section className="info-card">
          <h3>Six niveaux de difficulté</h3>
          <table>
            <caption className="sr-only">Paquets à utiliser par niveau</caption>
            <thead>
              <tr>
                <th>Niveau</th>
                <th>Paquets Légendes</th>
              </tr>
            </thead>
            <tbody>
              {[
                'Vert, étoiles ignorées',
                'Vert',
                'Vert + jaune',
                'Jaune',
                'Jaune + rouge',
                'Rouge',
              ].map((deck, index) => (
                <tr key={deck}>
                  <td>
                    <span className="level-badge">{index + 1}</span>
                  </td>
                  <td>{deck}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="field-help">
            Au niveau 1, tout paquet convient. Le vert est proposé ici par
            défaut.
          </p>
        </section>
        <section className="info-card">
          <h3>Les règles de votre saison</h3>
          <ul className="rule-list">
            <li>
              <strong>Jusqu’à 12 bolides</strong>
              <p>La limite de l’extension Legends est prise en compte.</p>
            </li>
            <li>
              <strong>Module Rivaux</strong>
              <p>
                Disponible à partir du niveau 2. Aucun rival en première course
                ; ensuite, les deux Légendes les mieux classées deviennent les
                rivaux.
              </p>
            </li>
            <li>
              <strong>Difficulté progressive, en option</strong>
              <p>
                Le niveau augmente d’un cran entre les courses, plafonné à 6
                dans cette application.
              </p>
            </li>
            <li>
              <strong>Assistant de déplacement à venir</strong>
              <p>
                L’adrénaline, les Manœuvres, les capacités et leurs interactions
                seront intégrées dans un prochain lot.
              </p>
            </li>
          </ul>
        </section>
      </div>
      <p className="notice">
        Référence : livret français Heat: Legends fourni par vos soins, édition
        2026, pages 2 à 7. Le barème et les circuits sont configurés séparément
        du moteur Legends.
      </p>
    </>
  )
}
