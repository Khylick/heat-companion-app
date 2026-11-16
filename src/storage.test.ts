import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixture } from './test/fixtures'
import { loadLibrary, parseLibrary, saveLibrary, STORAGE_KEY } from './storage'
import { recordResult } from './domain/championship'

afterEach(() => vi.unstubAllGlobals())

describe('Sauvegardes versionnées', () => {
  it('restaure une saison complète sans altérer ses résultats', () => {
    const championship = recordResult(fixture(), 0, [
      'human',
      'legend-a',
      'legend-b',
    ])
    const library = { version: 1, championships: [championship] }
    expect(parseLibrary(JSON.stringify(library))).toEqual(library)
  })
  it('refuse une version inconnue, un JSON invalide et les fichiers trop volumineux', () => {
    expect(() => parseLibrary('{')).toThrow()
    expect(() => parseLibrary('{"version":2,"championships":[]}')).toThrow()
    expect(() => parseLibrary(' '.repeat(2_000_001))).toThrow()
  })
  it('refuse les résultats incomplets et les courses hors séquence importés', () => {
    const championship = fixture()
    championship.races[0].result = ['human']
    expect(() =>
      parseLibrary(
        JSON.stringify({ version: 1, championships: [championship] }),
      ),
    ).toThrow()
    championship.races[0].result = null
    championship.races[1].result = ['human', 'legend-a', 'legend-b']
    expect(() =>
      parseLibrary(
        JSON.stringify({ version: 1, championships: [championship] }),
      ),
    ).toThrow()
  })
  it('refuse les circuits inconnus, les doublons de championnat et les réglages Legends invalides', () => {
    const championship = fixture()
    expect(() =>
      parseLibrary(
        JSON.stringify({
          version: 1,
          championships: [championship, championship],
        }),
      ),
    ).toThrow()
    championship.races[0].circuitId = 'unknown'
    expect(() =>
      parseLibrary(
        JSON.stringify({ version: 1, championships: [championship] }),
      ),
    ).toThrow()
    const invalid = fixture()
    invalid.legendSettings.difficulty = 1
    expect(() =>
      parseLibrary(JSON.stringify({ version: 1, championships: [invalid] })),
    ).toThrow()
  })
  it('conserve une sauvegarde corrompue et remonte une erreur explicite', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: () => '{corrompu', setItem })
    expect(loadLibrary().error).not.toBeNull()
    expect(setItem).not.toHaveBeenCalled()
  })
  it('enregistre et charge la même bibliothèque', () => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    })
    const library = { version: 1 as const, championships: [fixture()] }
    saveLibrary(library)
    expect(memory.has(STORAGE_KEY)).toBe(true)
    expect(loadLibrary()).toEqual({ library, error: null })
  })
})
