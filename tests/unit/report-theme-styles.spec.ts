import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileStyle, parse } from '@vue/compiler-sfc'

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

function compiledStyle(relativePath: string) {
  const filename = resolve(process.cwd(), relativePath)
  const component = readFileSync(filename, 'utf8')
  const { descriptor } = parse(component, { filename })
  const style = descriptor.styles[0]
  if (!style) throw new Error(`Missing style block in ${relativePath}`)
  const result = compileStyle({ filename, id: 'report-theme-test', source: style.content, scoped: style.scoped })
  expect(result.errors).toEqual([])
  return result.code
}

describe('report theme styles', () => {
  it('uses theme tokens for the list status bars', () => {
    const list = source('src/pages/reports/ui/ReportListTable.vue')
    const grid = source('src/pages/reports/ui/ReportCardGrid.vue')

    for (const component of [list, grid]) {
      expect(component).toContain('var(--app-report-bar-bg)')
      expect(component).toContain('var(--app-report-bar-text)')
      expect(component).toContain('var(--app-report-public-bar-bg)')
      expect(component).toContain('var(--app-report-public-bar-text)')
    }
  })

  it('uses theme tokens throughout Previous Research', () => {
    const detail = source('src/pages/reports/ReportDetailPage.vue')

    expect(detail).toMatch(/\.report-related h2 \{[^}]*color: var\(--app-text\)/)
    expect(detail).toMatch(/\.report-related a strong \{[^}]*color: var\(--app-text\)/)
    expect(detail).toMatch(/\.report-related__all[^}]*color: var\(--app-report-bar-text\)[^}]*background: var\(--app-report-bar-bg\)/)
  })

  it('neutralizes light-only rich-text styles in dark mode', () => {
    const detail = source('src/pages/reports/ReportDetailPage.vue')
    const css = compiledStyle('src/pages/reports/ReportDetailPage.vue')

    expect(detail).toContain(":global(:root[data-theme='dark'] .report-rich-text")
    expect(detail).toContain('.report-rich-text [bgcolor]')
    expect(detail).toContain('.report-rich-text [style*="background"]')
    expect(detail).toContain('.report-rich-text [style*="color"]')
    expect(detail).toContain('background: transparent !important')
    expect(detail).toContain('color: var(--app-text-secondary) !important')
    expect(css).toContain(":root[data-theme='dark'] .report-rich-text [bgcolor]")
    expect(css).toContain(":root[data-theme='dark'] .report-rich-text [style*=\"background\"]")
  })

  it('gives Daily Report details a dedicated dark reading treatment', () => {
    const detail = source('src/pages/reports/ReportDetailPage.vue')

    expect(detail).toContain('const isDailyReport = computed')
    expect(detail).toContain("'report-detail-page--daily': isDailyReport")
    expect(detail).not.toContain('report-article__eyebrow')
    expect(detail).toContain(":global(:root[data-theme='dark'] .report-detail-page--daily)")
    expect(detail).toContain('.report-detail-page--daily .report-rich-text img)')
    expect(detail).not.toContain('.report-detail-page--daily .report-rich-text table) { border: 1px')
    expect(detail).not.toContain('.report-detail-page--daily .report-rich-text tr + tr) { border-top: 1px')
  })

  it('forces semantic Daily Report typography onto theme colors', () => {
    const detail = source('src/pages/reports/ReportDetailPage.vue')

    for (const heading of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
      expect(detail).toContain(`.report-detail-page--daily .report-rich-text :deep(${heading})`)
    }
    expect(detail).toContain('color: var(--app-text) !important')
    expect(detail).toContain('font-size: 1.3rem !important')
    expect(detail).toContain('font-size: 1.16rem !important')
    expect(detail).toContain(":global(:root[data-theme='dark'] .report-detail-page--daily .report-rich-text h1)")
    expect(detail).toContain('.report-detail-page--daily .report-rich-text :deep(p)')
    expect(detail).toContain('.report-detail-page--daily .report-rich-text :deep(li)')
    expect(detail).toContain('.report-detail-page--daily .report-rich-text :deep(small)')
  })
})
