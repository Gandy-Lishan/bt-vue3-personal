export function isReportPublic(userLevel: string, publishedAt: string, now = new Date()) {
  const normalizedLevel = userLevel.trim().toLowerCase()
  if (['public', 'lite'].includes(normalizedLevel)) return true

  const postDate = new Date(publishedAt)
  if (Number.isNaN(postDate.getTime())) return false

  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  return postDate < threeMonthsAgo
}

export function canAccessReport(userLevels: string[], reportLevel: string, publishedAt: string, now = new Date()) {
  if (isReportPublic(reportLevel, publishedAt, now)) return true

  const normalizedLevels = userLevels.map((level) => level.trim().toLowerCase()).filter(Boolean)
  return normalizedLevels.length > 0
    && !normalizedLevels.includes('none')
    && !normalizedLevels.some((level) => level.includes('datalite'))
}
