import { describe, expect, it } from 'vitest'
import { socialIconPaths, socialLinks } from '@/shared/ui/socialIcons'

describe('footer social icons', () => {
  it('has a path for every link', () => {
    // A name with no matching path renders an empty <svg> — invisible, and easy to miss.
    for (const link of socialLinks) {
      expect(socialIconPaths[link.name], `no icon path for "${link.name}"`).toBeTruthy()
    }
  })

  it('draws each mark with real geometry', () => {
    for (const [name, path] of Object.entries(socialIconPaths)) {
      expect(path.startsWith('M'), `${name} does not start with a move command`).toBe(true)
      expect(path.length, `${name} looks too short to be a mark`).toBeGreaterThan(100)
    }
  })

  it('covers the four accounts the footer links to', () => {
    expect(socialLinks.map((link) => link.name)).toEqual(['facebook', 'linkedin', 'youtube', 'x'])
  })

  it('labels every link for screen readers and tooltips', () => {
    for (const link of socialLinks) {
      expect(link.label.trim()).not.toBe('')
      expect(link.href).toMatch(/^https:\/\//)
    }
  })
})
