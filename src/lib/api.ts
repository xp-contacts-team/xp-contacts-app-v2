import type { Contact } from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || '/api'

interface ContactsResponse {
  contacts: Contact[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `API request failed with HTTP ${response.status}`
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) message = payload.error
    } catch {
      // Keep the HTTP status message when the response is not JSON.
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function fetchContacts(): Promise<Contact[]> {
  const payload = await request<ContactsResponse>('/contacts')
  return Array.isArray(payload.contacts) ? payload.contacts : []
}

export async function replaceAllContacts(contacts: Contact[]): Promise<void> {
  await request<ContactsResponse>('/contacts', {
    method: 'PUT',
    body: JSON.stringify({ contacts }),
  })
}

export async function checkApiHealth(): Promise<{ status: string; contacts: number }> {
  return request<{ status: string; contacts: number }>('/health')
}
