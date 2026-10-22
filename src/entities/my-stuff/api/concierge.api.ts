export interface ConciergeRequest {
  name: string
  email: string
  message: string
}

export async function submitConciergeRequest(data: ConciergeRequest, signal?: AbortSignal) {
  const response = await fetch('/dev/st_data/contact_us_ticket/', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa('9IcPQw5rCrNkZ6tVaSMm')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      message: `Name: ${data.name}\n\n${data.message}`,
      subject: 'My Stuff Concierge Setup Service',
    }),
    signal,
  })

  if (!response.ok) throw new Error('Your request could not be sent. Please try again.')
}
