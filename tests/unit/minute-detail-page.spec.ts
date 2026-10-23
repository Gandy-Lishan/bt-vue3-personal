import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('Minute detail page', () => {
  it('has a dedicated route', () => {
    const router = source('src/app/router/index.ts')
    expect(router).toContain("path: '/MR/minutes/:minuteId'")
    expect(router).toContain("name: 'minute-detail'")
  })

  it('loads the selected Minute and renders its full content', () => {
    const detail = source('src/pages/reports/MinuteDetailPage.vue')
    expect(detail).toContain('minutes.find((item) => item.id === minuteId.value)')
    expect(detail).toContain('class="minute-detail-content"')
    expect(detail).toContain('v-html="safeContent(minute.contentHtml)"')
    expect(detail).toContain(':src="minutePlaceholderImage"')
    expect(detail).toContain('Back to Latest Minutes')
  })
})
