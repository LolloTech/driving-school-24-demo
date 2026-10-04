/**
 * API boundary. Today every call is served by a mock; set VITE_API_URL to
 * switch to the real backend without touching the UI.
 */

export interface ContactRequest {
  nome: string
  email: string
  telefono: string
  corso: CourseType
  messaggio: string
  privacy: boolean
}

export type CourseType = 'B' | 'AM' | 'A' | 'recupero-punti' | 'altro'

export interface ContactResponse {
  id: string
  receivedAt: string
}

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface ApiClient {
  sendContact(req: ContactRequest): Promise<ContactResponse>
}

class HttpApiClient implements ApiClient {
  private readonly baseUrl: string
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async sendContact(req: ContactRequest): Promise<ContactResponse> {
    const res = await fetch(`${this.baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new ApiError(res.status, await res.text())
    return (await res.json()) as ContactResponse
  }
}

class MockApiClient implements ApiClient {
  async sendContact(req: ContactRequest): Promise<ContactResponse> {
    await new Promise((r) => setTimeout(r, 900))
    console.info('[mock api] contact request', req)
    return { id: crypto.randomUUID(), receivedAt: new Date().toISOString() }
  }
}

const baseUrl = import.meta.env.VITE_API_URL as string | undefined

export const api: ApiClient = baseUrl ? new HttpApiClient(baseUrl) : new MockApiClient()
