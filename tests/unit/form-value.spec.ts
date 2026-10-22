import { describe, expect, it } from 'vitest'
import { formValueText, hasFormValue } from '@/shared/utils/form-value'

describe('form value normalization', () => {
  it('accepts numeric values written by number inputs without calling string-only methods', () => {
    expect(hasFormValue(12.5)).toBe(true)
    expect(hasFormValue(0)).toBe(true)
    expect(formValueText(12.5)).toBe('12.5')
  })

  it('rejects empty text and missing values', () => {
    expect(hasFormValue('  ')).toBe(false)
    expect(hasFormValue(null)).toBe(false)
    expect(hasFormValue(undefined)).toBe(false)
  })
})
