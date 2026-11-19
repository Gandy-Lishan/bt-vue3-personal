export interface CustomHeatmapData {
  selected: { url: string; chart_name: string }[]
  heatmap: [string, string, number, number][][]
}

import { toolsEndpoint } from '@/shared/api/tools.api'

export interface CustomHeatmapOption {
  url: string
  chart_name: string
  type: string
}

export async function fetchCustomHeatmapOptions(signal?: AbortSignal): Promise<CustomHeatmapOption[]> {
  const endpoint = toolsEndpoint('heatmap_user_select_options?include_selected=1')
  const response = await fetch(endpoint, { credentials: 'include', signal })
  if (!response.ok) throw new Error(`Heatmap options request failed: ${response.status}`)
  const payload = await response.json()
  if (payload.code !== 200 || !Array.isArray(payload.data)) throw new Error(payload.msg || 'Unable to load Optix options')
  return payload.data
}

export async function fetchCustomHeatmap(signal?: AbortSignal): Promise<CustomHeatmapData> {
  const endpoint = toolsEndpoint('heatmap_user_select')
  const response = await fetch(endpoint, { credentials: 'include', signal })
  if (!response.ok) throw new Error(`Heatmap request failed: ${response.status}`)
  const payload = await response.json()
  if (payload.code !== 200 || !payload.data) throw new Error(payload.msg || 'Heatmap request failed')
  return {
    selected: Array.isArray(payload.data.selected) ? payload.data.selected : [],
    heatmap: Array.isArray(payload.data.heatmap) ? payload.data.heatmap : [],
  }
}

export async function updateCustomHeatmap(url: string, method: 'POST' | 'DELETE'): Promise<void> {
  const endpoint = toolsEndpoint('heatmap_user_select')
  const response = await fetch(endpoint, {
    method, credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) throw new Error(`Heatmap request failed: ${response.status}`)
  const payload = await response.json()
  if (payload.code !== 200) throw new Error(payload.msg || 'Unable to update heatmap')
}
