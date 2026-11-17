import { expect, test } from '@playwright/test'

test('préparer le Garage, reprendre les choix et conserver les cartes entre deux courses', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await page
    .getByRole('button', { name: '+ Nouveau championnat', exact: true })
    .click()
  await page.getByLabel('Nom du championnat').fill('Saison des modules')
  await page
    .getByRole('combobox', { name: 'Garage', exact: true })
    .selectOption('all')
  await page.getByLabel('Météo et état de la piste').check()
  await page.getByLabel('Nombre de courses').fill('2')
  await expect(page.getByLabel('Japon', { exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Générer le championnat' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Saisir l’arrivée', exact: true }).first(),
  ).toBeDisabled()
  let modules = page.getByRole('region', {
    name: 'Modules de la course 1',
    exact: true,
  })
  await modules
    .getByRole('button', { name: 'Préparer la course', exact: true })
    .click()
  await expect(
    modules.getByRole('region', { name: 'Conditions de course', exact: true }),
  ).toHaveCount(0)
  await expect(
    modules.getByLabel('Marché des améliorations').locator('.upgrade-card'),
  ).toHaveCount(4)
  await modules
    .getByRole('button', { name: /^Choisir l’amélioration/ })
    .first()
    .click()
  const saved = await page.evaluate(() =>
    localStorage.getItem('heat-companion:v1'),
  )
  await page.reload()
  modules = page.getByRole('region', {
    name: 'Modules de la course 1',
    exact: true,
  })
  await expect(
    modules.getByRole('button', { name: 'Terminer sans échange' }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('heat-companion:v1')),
  ).toBe(saved)
  await modules.getByLabel('Carte à rendre').selectOption({ index: 1 })
  await modules.getByLabel('Carte à prendre').selectOption({ index: 1 })
  await modules
    .getByRole('button', { name: 'Échanger et terminer le Garage' })
    .click()
  await expect(
    modules.getByText('Échange enregistré :', { exact: false }),
  ).toBeVisible()
  await expect(modules.getByRole('heading', { name: /^Météo :/ })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Saisir l’arrivée', exact: true }).first(),
  ).toBeEnabled()
  const firstCards = await page.evaluate(() => {
    const season = JSON.parse(localStorage.getItem('heat-companion:v1')!)
      .championships[0]
    return season.races[0].preparation.garage.swap.take as string
  })
  await page
    .getByRole('button', { name: 'Saisir l’arrivée', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Confirmer l’arrivée' }).click()
  const second = page.getByRole('region', {
    name: 'Modules de la course 2',
    exact: true,
  })
  await second
    .getByRole('button', { name: 'Préparer la course', exact: true })
    .click()
  await expect(
    second.getByRole('button', {
      name: `Choisir l’amélioration ${firstCards}`,
      exact: true,
    }),
  ).toHaveCount(0)
  await second
    .getByRole('button', { name: /^Choisir l’amélioration/ })
    .first()
    .click()
  await second.getByRole('button', { name: 'Terminer sans échange' }).click()
  await expect(
    second.getByText('Pilote 1 · 2 amélioration(s)', { exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Saisir l’arrivée', exact: true })
    .click()
  await page.getByRole('button', { name: 'Confirmer l’arrivée' }).click()
  await expect(page.getByText('SAISON TERMINÉE', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Préparation de la course 1', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(page.getByText('SAISON TERMINÉE', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('tirer la météo seule et restaurer la préparation depuis un import', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('button', { name: '+ Nouveau championnat', exact: true })
    .click()
  await page.getByLabel('Nom du championnat').fill('Météo seule')
  await page.getByLabel('Météo et état de la piste').check()
  await page.getByLabel('Nombre de courses').fill('1')
  await page.getByRole('button', { name: 'Générer le championnat' }).click()
  await page
    .getByRole('button', { name: 'Préparer la course', exact: true })
    .click()
  const conditions = page.getByRole('region', {
    name: 'Conditions de course',
    exact: true,
  })
  const original = await conditions.innerText()
  await expect(
    page.getByRole('button', { name: 'Saisir l’arrivée', exact: true }),
  ).toBeEnabled()
  const saved = await page.evaluate(() => {
    const raw = localStorage.getItem('heat-companion:v1')!
    localStorage.clear()
    return raw
  })
  await page.reload()
  await page.getByLabel('Importer une sauvegarde JSON').setInputFiles({
    name: 'modules.json',
    mimeType: 'application/json',
    buffer: Buffer.from(saved),
  })
  await expect(
    page.getByRole('heading', { name: 'Météo seule', exact: true }),
  ).toBeVisible()
  await expect(conditions).toHaveText(original, { useInnerText: true })
  await expect(
    page.getByRole('button', { name: 'Préparer la course', exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Saisir l’arrivée', exact: true })
    .click()
  await page.getByRole('button', { name: 'Confirmer l’arrivée' }).click()
  await expect(page.getByText('SAISON TERMINÉE', { exact: true })).toBeVisible()
})
