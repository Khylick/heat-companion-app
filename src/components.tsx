import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  modulesEnabled,
  type ModuleSettings,
  type GarageMode,
} from './domain/module-settings'
import {
  CAR_COLORS,
  CIRCUITS,
  EXPANSIONS,
  type Circuit,
} from './domain/catalog'
import {
  createChampionship,
  getGrid,
  type Championship,
  type Participant,
} from './domain/championship'

export function TrackDrawing({
  circuit,
  className = '',
}: {
  circuit: Circuit
  className?: string
}) {
  return (
    <svg className={className} viewBox="0 0 180 110" aria-hidden="true">
      <path
        d={circuit.path}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M25 62 l15 0" stroke="var(--paper)" strokeWidth="3" />
    </svg>
  )
}

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={onClose}>
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Fermer"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}

function makeParticipant(
  index: number,
  kind: Participant['kind'],
): Participant {
  return {
    id: crypto.randomUUID(),
    name: kind === 'human' ? 'Pilote 1' : `Légende ${index}`,
    kind,
    color: CAR_COLORS[index].id,
  }
}

export function ChampionshipForm({
  onCreate,
  onClose,
}: {
  onCreate: (championship: Championship) => boolean
  onClose: () => void
}) {
  const [name, setName] = useState('Mon premier championnat')
  const [seed, setSeed] = useState(() => crypto.randomUUID().slice(0, 8))
  const [participants, setParticipants] = useState<Participant[]>(() => [
    makeParticipant(0, 'human'),
    makeParticipant(1, 'legend'),
    makeParticipant(2, 'legend'),
  ])
  const [circuitIds, setCircuitIds] = useState(
    CIRCUITS.map((circuit) => circuit.id),
  )
  const [raceCount, setRaceCount] = useState(4)
  const [difficulty, setDifficulty] = useState(2)
  const [progressive, setProgressive] = useState(false)
  const [rivals, setRivals] = useState(false)
  const [error, setError] = useState('')
  const [modules, setModules] = useState<ModuleSettings>({
    garage: 'off',
    weather: false,
  })
  function updateModules(next: ModuleSettings) {
    if (modulesEnabled(next) && !modulesEnabled(modules)) {
      const baseIds = CIRCUITS.filter(
        (circuit) => circuit.expansion === 'base',
      ).map((circuit) => circuit.id)
      const selected = circuitIds.filter((id) => baseIds.includes(id))
      const nextIds = selected.length ? selected : baseIds
      setCircuitIds(nextIds)
      setRaceCount(Math.min(raceCount, nextIds.length))
    }
    setModules(next)
  }
  const legends = participants.filter(
    (participant) => participant.kind === 'legend',
  ).length

  function addParticipant(kind: Participant['kind']) {
    const color = CAR_COLORS.find(
      (candidate) =>
        !participants.some((participant) => participant.color === candidate.id),
    )
    if (!color) return
    setParticipants([
      ...participants,
      {
        id: crypto.randomUUID(),
        name: `${kind === 'human' ? 'Pilote' : 'Légende'} ${participants.length + 1}`,
        kind,
        color: color.id,
      },
    ])
  }

  return (
    <Dialog title="Créer un championnat" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          try {
            const championship = createChampionship({
              name,
              seed,
              participants,
              circuitIds,
              raceCount,
              legendSettings: { difficulty, progressive, rivals },
              modules,
            })
            if (onCreate(championship)) onClose()
            else
              setError(
                'La sauvegarde a échoué. Consultez le message affiché dans le paddock.',
              )
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : 'Création impossible.',
            )
          }
        }}
      >
        <p className="muted">
          Une saison sur mesure, jouée sur votre plateau. Tous les circuits sont
          disponibles.
        </p>
        <label>
          Nom du championnat
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
        </label>
        <fieldset>
          <legend>
            01 / Les pilotes <span>{participants.length} / 12</span>
          </legend>
          <div className="participant-editor">
            {participants.map((participant, index) => (
              <div className="participant-row" key={participant.id}>
                <span className="driver-number">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <label className="grow">
                  <span className="sr-only">Nom du pilote {index + 1}</span>
                  <input
                    value={participant.name}
                    maxLength={40}
                    required
                    onChange={(event) =>
                      setParticipants(
                        participants.map((item) =>
                          item.id === participant.id
                            ? { ...item, name: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <span className="kind-label">
                  {participant.kind === 'human' ? 'Humain' : 'Légende'}
                </span>
                <label>
                  <span className="sr-only">Couleur du pilote {index + 1}</span>
                  <select
                    value={participant.color}
                    onChange={(event) =>
                      setParticipants(
                        participants.map((item) =>
                          item.id === participant.id
                            ? { ...item, color: event.target.value }
                            : item,
                        ),
                      )
                    }
                  >
                    {CAR_COLORS.map((color) => (
                      <option
                        key={color.id}
                        value={color.id}
                        disabled={participants.some(
                          (item) =>
                            item.id !== participant.id &&
                            item.color === color.id,
                        )}
                      >
                        {color.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Retirer ${participant.name}`}
                  onClick={() => {
                    setParticipants(
                      participants.filter((item) => item.id !== participant.id),
                    )
                    if (participant.kind === 'legend' && legends <= 2)
                      setRivals(false)
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="button-row">
            <button
              className="secondary"
              type="button"
              disabled={participants.length >= 12}
              onClick={() => addParticipant('human')}
            >
              + Joueur
            </button>
            <button
              className="secondary"
              type="button"
              disabled={participants.length >= 12}
              onClick={() => addParticipant('legend')}
            >
              + Légende
            </button>
          </div>
        </fieldset>
        <fieldset>
          <legend>02 / Le calendrier</legend>
          <div className="form-columns">
            <label>
              Nombre de courses
              <input
                type="number"
                min="1"
                max={Math.max(1, circuitIds.length)}
                value={raceCount}
                onChange={(event) => setRaceCount(Number(event.target.value))}
                required
              />
            </label>
            <label>
              Graine du tirage
              <input
                value={seed}
                maxLength={100}
                onChange={(event) => setSeed(event.target.value)}
                required
              />
            </label>
          </div>
          <p className="field-help">
            Sans répétition. La même sélection et la même graine reproduisent le
            calendrier.
          </p>
          <div className="circuit-options">
            {CIRCUITS.map((circuit) => (
              <label className="check-label" key={circuit.id}>
                <input
                  type="checkbox"
                  checked={circuitIds.includes(circuit.id)}
                  disabled={
                    modulesEnabled(modules) && circuit.expansion !== 'base'
                  }
                  onChange={(event) =>
                    setCircuitIds(
                      event.target.checked
                        ? [...circuitIds, circuit.id]
                        : circuitIds.filter((id) => id !== circuit.id),
                    )
                  }
                />
                {circuit.name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>03 / Heat: Legends</legend>
          <label>
            Niveau de départ
            <select
              value={difficulty}
              onChange={(event) => {
                const level = Number(event.target.value)
                setDifficulty(level)
                if (level === 1) setRivals(false)
              }}
            >
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <option key={level} value={level}>
                  Niveau {level}
                  {level === 1 ? ' — sans étoiles' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={progressive}
              onChange={(event) => setProgressive(event.target.checked)}
            />
            Augmenter le niveau à chaque course (maximum 6)
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={rivals}
              disabled={difficulty < 2 || legends < 2}
              onChange={(event) => setRivals(event.target.checked)}
            />
            Module Rivaux
          </label>
          <p className="field-help">
            Rivaux : niveau 2 minimum et au moins deux Légendes. Les
            déplacements et les cartes restent gérés sur table.
          </p>
        </fieldset>
        <fieldset>
          <legend>04 / Modules du jeu de base</legend>
          <label>
            Garage
            <select
              value={modules.garage}
              onChange={(event) =>
                updateModules({
                  ...modules,
                  garage: event.target.value as GarageMode,
                })
              }
            >
              <option value="off">Désactivé</option>
              <option value="regular">Améliorations ordinaires</option>
              <option value="advanced">Améliorations avancées</option>
              <option value="all">Ordinaires et avancées</option>
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={modules.weather}
              onChange={(event) =>
                updateModules({ ...modules, weather: event.target.checked })
              }
            />
            Météo et état de la piste
          </label>
          <p className="field-help">
            Ces modules utilisent les quatre circuits du jeu de base. Le Garage
            gère jusqu’à six pilotes humains, une amélioration par course et les
            échanges. Les tirages sont sauvegardés.
          </p>
        </fieldset>
        <div className="notice">
          Format personnalisé · Barème : 9, 6, 4, 3, 2, 1, puis 0 point. Les
          événements et les Sponsors restent gérés sur table.
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button className="secondary" type="button" onClick={onClose}>
            Annuler
          </button>
          <button className="primary" type="submit">
            Générer le championnat <span aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export function ResultForm({
  championship,
  raceIndex,
  onSave,
  onClose,
}: {
  championship: Championship
  raceIndex: number
  onSave: (result: string[]) => boolean
  onClose: () => void
}) {
  const race = championship.races[raceIndex]
  const [order, setOrder] = useState(() => [
    ...(race.result ?? getGrid(championship, raceIndex)),
  ])
  const [error, setError] = useState('')
  function move(index: number, offset: number) {
    const next = [...order]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    setOrder(next)
  }
  return (
    <Dialog
      title={`${race.result ? 'Corriger' : 'Saisir'} l’arrivée — course ${raceIndex + 1}`}
      onClose={onClose}
    >
      <p className="muted">
        Classez tous les pilotes dans leur ordre d’arrivée sur le plateau.
        L’ordre proposé reprend{' '}
        {race.result ? 'le résultat enregistré' : 'la grille de départ'}.
      </p>
      <ol className="result-editor">
        {order.map((id, index) => {
          const participant = championship.participants.find(
            (item) => item.id === id,
          )!
          return (
            <li key={id}>
              <span className="driver-number">{index + 1}</span>
              <DriverDot participant={participant} />
              <strong className="grow">{participant.name}</strong>
              <span className="muted">{championship.points[index]} pts</span>
              <button
                className="icon-button"
                disabled={index === 0}
                aria-label={`Monter ${participant.name}`}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                className="icon-button"
                disabled={index === order.length - 1}
                aria-label={`Descendre ${participant.name}`}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
            </li>
          )
        })}
      </ol>
      {race.result && (
        <p className="notice">
          Le classement général et les grilles suivantes seront recalculés. Les
          résultats des courses déjà disputées seront conservés.
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          Annuler
        </button>
        <button
          className="primary"
          onClick={() => {
            if (onSave(order)) onClose()
            else
              setError(
                'Enregistrement impossible. Consultez le message dans le paddock.',
              )
          }}
        >
          Confirmer l’arrivée
        </button>
      </div>
    </Dialog>
  )
}

export function DriverDot({ participant }: { participant: Participant }) {
  return (
    <span
      className="driver-dot"
      style={{
        backgroundColor: CAR_COLORS.find(
          (color) => color.id === participant.color,
        )?.hex,
      }}
      aria-hidden="true"
    />
  )
}

export function CircuitCatalog() {
  return (
    <>
      <div className="section-title">
        <div>
          <p className="eyebrow">LE MONDE EST VOTRE PISTE</p>
          <h2>Les circuits</h2>
        </div>
        <span className="pill">10 Grands Prix</span>
      </div>
      <p className="muted">
        Les quatre boîtes de circuits sont incluses. Les tracés ci-dessous sont
        décoratifs ; référez-vous aux plateaux pour jouer.
      </p>
      <div className="circuit-grid">
        {CIRCUITS.map((circuit) => (
          <article className="circuit-card" key={circuit.id}>
            <div className="circuit-top">
              <span>{circuit.country}</span>
              <span>{EXPANSIONS[circuit.expansion]}</span>
            </div>
            <TrackDrawing circuit={circuit} />
            <h3>{circuit.name}</h3>
            <p>{circuit.feature}</p>
          </article>
        ))}
      </div>
    </>
  )
}
