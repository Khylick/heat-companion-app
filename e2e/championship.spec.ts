import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('créer une saison, enregistrer une course et reprendre après rechargement', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page
    .getByRole('button', { name: '+ Nouveau championnat', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByLabel('Nom du championnat').fill('Grand Prix des amis')
  await page.getByLabel('Module Rivaux', { exact: true }).check()
  await page.getByLabel('Augmenter le niveau').check()
  await page.getByRole('button', { name: 'Générer le championnat' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Grand Prix des amis', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Aucun rival à la première course.'),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Saisir l’arrivée', exact: true })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  const originallySecond = await dialog.locator('li strong').nth(1).innerText()
  await dialog
    .getByRole('button', { name: `Monter ${originallySecond}`, exact: true })
    .click()
  await dialog.getByRole('button', { name: 'Confirmer l’arrivée' }).click()
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '1',
  )
  await expect(
    page.getByText('Legends · niveau 3', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Rivaux :', { exact: false })).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Grand Prix des amis', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '1',
  )
  await expect(
    page.getByRole('button', { name: 'Corriger', exact: true }),
  ).toHaveCount(1)
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('consulter les dix circuits et les règles de préparation Legends', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Circuits', exact: true }).click()
  await expect(page.locator('.circuit-card')).toHaveCount(10)
  await expect(
    page.getByRole('heading', { name: 'Afrique du Sud' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Legends', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Six niveaux de difficulté' }),
  ).toBeVisible()
  await expect(
    page.getByRole('cell', { name: 'Vert + jaune', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('refuser une sauvegarde invalide sans perdre un championnat existant', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: '+ Nouveau championnat', exact: true })
    .click()
  await page.getByRole('button', { name: 'Générer le championnat' }).click()
  await page.getByLabel('Importer une sauvegarde JSON').setInputFiles({
    name: 'incorrect.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":2,"championships":[]}'),
  })
  await expect(page.getByRole('alert')).toContainText(
    'Format de sauvegarde incompatible',
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Mon premier championnat', exact: true }),
  ).toBeVisible()
})

test('terminer une saison puis la restaurer depuis un export', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: '+ Nouveau championnat', exact: true })
    .click()
  await page.getByLabel('Nombre de courses').fill('1')
  await page.getByRole('button', { name: 'Générer le championnat' }).click()
  await page
    .getByRole('button', { name: 'Saisir l’arrivée', exact: true })
    .click()
  await page.getByRole('button', { name: 'Confirmer l’arrivée' }).click()
  await expect(page.getByText('SAISON TERMINÉE', { exact: true })).toBeVisible()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '↧ Exporter', exact: true }).click()
  const file = await downloaded
  const path = await file.path()
  if (!path) throw new Error('Le fichier exporté est introuvable.')
  const backup = await readFile(path)
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Une grille de départ à remplir.' }),
  ).toBeVisible()
  await page.getByLabel('Importer une sauvegarde JSON').setInputFiles({
    name: 'restauration.json',
    mimeType: 'application/json',
    buffer: backup,
  })
  await expect(page.getByText('SAISON TERMINÉE', { exact: true })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '1',
  )
})
