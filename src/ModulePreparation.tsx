import { useState } from 'react'
import { getBaseTrack } from './domain/base-tracks'
import { type Championship } from './domain/championship'
import {
  finishGarage,
  getOwnedUpgrades,
  pickUpgrade,
  prepareRace,
  remainingMarket,
} from './domain/preparation'
import { describeUpgrade, getUpgradeCard } from './domain/upgrades'
import { getCarSetup, getRoadToken, getWeatherToken } from './domain/weather'

function UpgradeCard({
  cardId,
  onPick,
}: {
  cardId: string
  onPick?: () => void
}) {
  const { upgrade } = getUpgradeCard(cardId)
  return (
    <article className="upgrade-card">
      <span className="eyebrow">
        N° {upgrade.number} ·{' '}
        {upgrade.level === 'regular' ? 'ORDINAIRE' : 'AVANCÉE'} ·{' '}
        {cardId.endsWith('a') ? 'A' : 'B'}
      </span>
      <h4>{upgrade.name}</h4>
      <p className="upgrade-speed">
        {upgrade.speed === null
          ? 'Heat'
          : `Vitesse ${upgrade.speed.replaceAll('|', ' / ')}`}
      </p>
      <ul>
        {describeUpgrade(upgrade).map((effect) => (
          <li key={effect}>{effect}</li>
        ))}
      </ul>
      {onPick && (
        <button
          className="secondary"
          onClick={onPick}
          aria-label={`Choisir l’amélioration ${cardId}`}
        >
          Choisir cette carte
        </button>
      )}
    </article>
  )
}

export function ModulePreparation({
  championship,
  raceIndex,
  onUpdate,
}: {
  championship: Championship
  raceIndex: number
  onUpdate: (updated: Championship) => boolean
}) {
  const [error, setError] = useState('')
  const [give, setGive] = useState('')
  const [take, setTake] = useState('')
  const race = championship.races[raceIndex]
  const preparation = race.preparation
  const track = getBaseTrack(race.circuitId)
  const garage = preparation?.garage
  const weather = preparation?.weather
    ? getWeatherToken(preparation.weather.tokenId)
    : null
  const setup = getCarSetup(track, weather)
  const owned = getOwnedUpgrades(championship, raceIndex)
  const nextPlayer =
    garage &&
    championship.participants.find(
      (p) => p.id === garage.order[garage.picks.length],
    )
  const swapPlayer =
    garage && championship.participants.find((p) => p.id === garage.order[0])
  const readyToSwap =
    garage && !garage.closed && garage.picks.length === garage.order.length

  function apply(change: () => Championship) {
    setError('')
    try {
      return onUpdate(change())
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Préparation impossible.',
      )
      return false
    }
  }

  return (
    <section
      className="module-preparation"
      aria-label={`Modules de la course ${raceIndex + 1}`}
    >
      <p className="eyebrow">MODULES / COURSE {raceIndex + 1}</p>
      <h3>Préparer les voitures et la piste</h3>
      <p className="muted">
        {track.laps} tours · {track.spaces} cases par tour ·{' '}
        {track.cornerLimits.length} virages
      </p>
      {!preparation ? (
        <>
          <p>
            Le tirage est enregistré une seule fois. Les choix du Garage et les
            conditions restent disponibles après rechargement.
          </p>
          <button
            className="primary"
            onClick={() => apply(() => prepareRace(championship, raceIndex))}
          >
            Préparer la course
          </button>
        </>
      ) : (
        <>
          {garage && !garage.closed && weather && (
            <p className="field-help">
              En championnat, la météo et l’état de la piste sont révélés après
              les choix du Garage.
            </p>
          )}
          {(!garage || garage.closed) && (
            <section
              className="weather-setup"
              aria-label="Conditions de course"
            >
              <h4>
                {weather ? `Météo : ${weather.name}` : 'Préparation de base'}
              </h4>
              <p>
                Par pilote humain :{' '}
                <strong>{setup.heatInEngine} Heat dans le moteur</strong>,{' '}
                {setup.stress} Stress dans le paquet
                {setup.heatInDeck
                  ? `, ${setup.heatInDeck} Heat à mélanger dans le paquet`
                  : ''}
                {setup.heatInDiscard
                  ? `, ${setup.heatInDiscard} Heat dans la défausse`
                  : ''}
                .
              </p>
              {weather && (
                <p className="field-help">
                  Uniquement dans les secteurs marqués Météo :{' '}
                  {weather.sectorEffect}
                </p>
              )}
              <ol className="road-conditions">
                {track.cornerLimits.map((limit, index) => {
                  const token = preparation.weather
                    ? getRoadToken(preparation.weather.roadTokenIds[index])
                    : null
                  return (
                    <li key={index}>
                      <strong>
                        Virage {index + 1} · limite{' '}
                        {limit + (token?.limitDelta ?? 0)}
                      </strong>
                      {token && (
                        <>
                          <span>
                            {token.name} ·{' '}
                            {token.scope === 'corner'
                              ? 'ce virage'
                              : `secteur après le virage ${index + 1}, jusqu’au virage ${((index + 1) % track.cornerLimits.length) + 1}`}
                          </span>
                          <p>
                            {token.name === 'Météo'
                              ? weather?.sectorEffect
                              : token.effect}
                          </p>
                        </>
                      )}
                    </li>
                  )
                })}
              </ol>
            </section>
          )}
          {garage && (
            <section className="garage-setup" aria-label="Garage">
              <h4>
                Garage ·{' '}
                {garage.closed
                  ? 'préparation terminée'
                  : 'choix des améliorations'}
              </h4>
              <p className="field-help">
                Une carte par pilote humain et par course, du dernier au premier
                sur la grille. Les Légendes ne choisissent pas d’amélioration.
              </p>
              {nextPlayer && !garage.closed && (
                <p className="draft-turn" role="status">
                  À {nextPlayer.name} de choisir · {garage.picks.length + 1} /{' '}
                  {garage.order.length}
                </p>
              )}
              {!garage.closed && (
                <div
                  className="upgrade-market"
                  aria-label="Marché des améliorations"
                >
                  {remainingMarket(garage).map((cardId) => (
                    <UpgradeCard
                      key={cardId}
                      cardId={cardId}
                      onPick={
                        nextPlayer && !race.result
                          ? () =>
                              apply(() =>
                                pickUpgrade(championship, raceIndex, cardId),
                              )
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
              {readyToSwap && swapPlayer && (
                <div className="garage-swap">
                  <p>
                    <strong>{swapPlayer.name}</strong>, dernier humain sur la
                    grille, peut échanger une de ses améliorations contre une
                    carte restante.
                  </p>
                  <div className="form-columns">
                    <label>
                      Carte à rendre
                      <select
                        value={give}
                        onChange={(event) => setGive(event.target.value)}
                      >
                        <option value="">Choisir une carte</option>
                        {owned.get(swapPlayer.id)?.map((id) => (
                          <option key={id} value={id}>
                            N° {getUpgradeCard(id).upgrade.number} ·{' '}
                            {getUpgradeCard(id).upgrade.name} ({id})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Carte à prendre
                      <select
                        value={take}
                        onChange={(event) => setTake(event.target.value)}
                      >
                        <option value="">Choisir une carte</option>
                        {remainingMarket(garage).map((id) => (
                          <option key={id} value={id}>
                            N° {getUpgradeCard(id).upgrade.number} ·{' '}
                            {getUpgradeCard(id).upgrade.name} ({id})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="button-row">
                    <button
                      className="primary"
                      disabled={!give || !take}
                      onClick={() =>
                        apply(() =>
                          finishGarage(championship, raceIndex, { give, take }),
                        )
                      }
                    >
                      Échanger et terminer le Garage
                    </button>
                    <button
                      className="secondary"
                      onClick={() =>
                        apply(() => finishGarage(championship, raceIndex))
                      }
                    >
                      Terminer sans échange
                    </button>
                  </div>
                </div>
              )}
              <h4>Améliorations des pilotes</h4>
              {[...owned.entries()].map(([id, cards]) => (
                <details
                  className="driver-upgrades"
                  key={id}
                  open={garage.order.length === 1}
                >
                  <summary>
                    {championship.participants.find((p) => p.id === id)?.name} ·{' '}
                    {cards.length} amélioration(s)
                  </summary>
                  {cards.length ? (
                    <div className="upgrade-market">
                      {cards.map((cardId) => (
                        <UpgradeCard key={cardId} cardId={cardId} />
                      ))}
                    </div>
                  ) : (
                    <p>Aucune amélioration choisie.</p>
                  )}
                </details>
              ))}
              {garage.swap && (
                <p className="field-help">
                  Échange enregistré : {garage.swap.give} rendu,{' '}
                  {garage.swap.take} pris. Les cartes restantes retournent dans
                  le paquet.
                </p>
              )}
            </section>
          )}
          <p className="field-help">
            Les effets des cartes et les déplacements se résolvent sur le
            plateau. Les Sponsors et Événements restent gérés avec votre
            matériel.
          </p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
