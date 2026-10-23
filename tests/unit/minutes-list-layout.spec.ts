import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/pages/reports/MinutesPage.vue'), 'utf8')

describe('Latest Minutes list layout', () => {
  it('renders compact report-style cards linking to detail pages', () => {
    expect(page).toContain('class="minute-list" role="list"')
    expect(page).toContain('class="minute-list-card"')
    expect(page).toContain('minute-list-card__image-link')
    expect(page).toContain(':src="minutePlaceholderImage"')
    expect(page).toContain('minute-list-card__bar')
    expect(page).toContain('minute-list-card__action')
    expect(page).toContain('Read Minute <ArrowRight')
    expect(page).toContain("name: 'minute-detail'")
  })

  it('navigates quick access to the selected detail page', () => {
    expect(page).toContain('void router.push(minuteDetailRoute(minute))')
    expect(page).not.toContain('expandedMinutes')
  })

  it('uses report theme tokens and a mobile layout', () => {
    expect(page).toContain('var(--app-report-bar-bg)')
    expect(page).toContain('var(--app-report-bar-text)')
    expect(page).toContain('@media (max-width: 639px)')
  })
})
