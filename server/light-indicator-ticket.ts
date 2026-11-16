import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PluginOption, ViteDevServer, PreviewServer } from 'vite'

type Mode = 'indicators' | 'recommendations' | 'guided'
type TicketInput = Record<string, unknown> & { mode?: Mode }

const titles: Record<Mode, string> = {
  indicators: 'Pick Your Own Indicators',
  recommendations: 'Get Recommendations',
  guided: 'Start with a Guided Set',
}

function stringField(input: TicketInput, key: string, required = true): string {
  const value = input[key]
  if (typeof value !== 'string' || value.length > 4000 || (required && !value.trim())) {
    throw new Error(`Invalid ${key}`)
  }
  return value.trim()
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll(/\r?\n/g, '<br>')
}

function buildTicket(input: TicketInput) {
  const mode = input.mode
  if (mode !== 'indicators' && mode !== 'recommendations' && mode !== 'guided') throw new Error('Invalid form')
  const name = stringField(input, 'name')
  const email = stringField(input, 'email')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Invalid email')
  const rows: [string, string][] = [['Name', name], ['Email', email]]
  if (mode === 'guided') {
    rows.push(['Timeframe', stringField(input, 'timeframe')])
    rows.push(['Assets You Focus On', stringField(input, 'assets')])
    rows.push(['Primary Focus', stringField(input, 'primaryFocus')])
  } else {
    rows.push(['Selected Indicators', stringField(input, 'selectedIndicators')])
    if (mode === 'recommendations') rows.push(['Primary Use Case', stringField(input, 'primaryUseCase', false)])
  }
  rows.push(['Intended Use for the Data', stringField(input, 'intendedUse')])
  const subject = `Light Indicator API - ${titles[mode]}`
  const description = [subject, '', ...rows.map(([label, value]) => `${label}: ${escapeHtml(value)}`)].join('<br>')
  return { email, subject, description }
}

async function readBody(request: IncomingMessage): Promise<TicketInput> {
  let body = ''
  for await (const chunk of request) {
    body += chunk.toString()
    if (body.length > 20000) throw new Error('Request too large')
  }
  return JSON.parse(body) as TicketInput
}

function json(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(data))
}

export function lightIndicatorTicketPlugin(auth?: string): PluginOption {
  const handler = async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    if (request.url?.split('?')[0] !== '/internal/light-indicator-ticket') return next()
    if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' })
    const origin = request.headers.origin
    if (origin && new URL(origin).host !== request.headers.host) return json(response, 403, { error: 'Invalid origin' })
    if (!auth) return json(response, 503, { error: 'Ticket service is not configured' })
    try {
      const { email, subject, description } = buildTicket(await readBody(request))
      const fields = new FormData()
      fields.set('description', description)
      fields.set('subject', subject)
      fields.set('email', email)
      fields.set('priority', '1')
      fields.set('status', '2')
      fields.set('source', '2')
      const result = await fetch('https://sentimentrader.freshdesk.com/api/v2/tickets', {
        method: 'POST',
        headers: { Authorization: `Basic ${Buffer.from(auth).toString('base64')}` },
        body: fields,
        signal: AbortSignal.timeout(15000),
      })
      if (!result.ok) {
        console.error('Freshdesk ticket request failed:', result.status)
        return json(response, 502, { error: 'Ticket submission failed' })
      }
      return json(response, 200, { ok: true })
    } catch (error) {
      if (error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('Invalid'))) {
        return json(response, 400, { error: 'Invalid form data' })
      }
      console.error('Freshdesk ticket request error:', error instanceof Error ? error.message : error)
      return json(response, 502, { error: 'Ticket submission failed' })
    }
  }
  const install = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(handler)
  }
  return { name: 'light-indicator-ticket', configureServer: install, configurePreviewServer: install }
}
