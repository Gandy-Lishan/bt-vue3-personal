/**
 * Time formatting utilities — adapted from Vue2 project utils/index.js
 */

/**
 * Converts a date string (YYYY-MM-DD) to a local Date object at 00:00:00.
 * Avoids timezone offset issues that occur with ISO string parsing.
 */
export function formatStandardTime(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null

  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      return new Date(year, month - 1, day) // local 00:00:00
    }
  }

  if (dateInput instanceof Date) return dateInput

  return null
}

/**
 * Converts a timestamp to a readable time string.
 */
export function timestampToTime(timestamp: number): string {
  const date = new Date(timestamp)
  const Y = date.getFullYear()
  const M = String(date.getMonth() + 1).padStart(2, '0')
  const D = String(date.getDate()).padStart(2, '0')
  return `${Y}-${M}-${D}`
}
