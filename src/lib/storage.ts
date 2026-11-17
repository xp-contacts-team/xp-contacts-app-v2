import type { Contact, ContactMethod, ContactMethodKind } from '../types'
import { createSeedContacts } from '../data/seed'
import { METHOD_KINDS } from '../types'

export const STORAGE_KEY = 'atlas.address-book.v1'
const STORAGE_VERSION = 1

interface StoredPayload {
  version: number
  contacts: Contact[]
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeStoredMethod(value: unknown): ContactMethod | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const kind = record.kind
  if (typeof kind !== 'string' || !METHOD_KINDS.includes(kind as ContactMethodKind)) return null
  const methodValue = asString(record.value).trim()
  if (!methodValue) return null
  return {
    id: asString(record.id) || `method-restored-${Math.random().toString(36).slice(2, 9)}`,
    kind: kind as ContactMethodKind,
    label: asString(record.label) || '其他',
    value: methodValue,
  }
}

export function normalizeStoredContact(value: unknown): Contact | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const name = asString(record.name).trim()
  const id = asString(record.id).trim()
  if (!name || !id) return null

  const methods = Array.isArray(record.methods)
    ? record.methods
        .map(normalizeStoredMethod)
        .filter((method): method is ContactMethod => method !== null)
    : []

  const createdAt = asString(record.createdAt) || new Date().toISOString()
  return {
    id,
    name,
    company: asString(record.company),
    jobTitle: asString(record.jobTitle),
    notes: asString(record.notes),
    favorite: Boolean(record.favorite),
    methods,
    createdAt,
    updatedAt: asString(record.updatedAt) || createdAt,
  }
}

export function parseStoredContacts(raw: string | null): Contact[] | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const record = parsed as Partial<StoredPayload>
    if (record.version !== STORAGE_VERSION) return null
    if (!Array.isArray(record.contacts)) return null
    const contacts = record.contacts
      .map(normalizeStoredContact)
      .filter((contact): contact is Contact => contact !== null)
    return contacts
  } catch {
    return null
  }
}

export function loadContacts(storage: Storage = window.localStorage): Contact[] {
  try {
    const parsed = parseStoredContacts(storage.getItem(STORAGE_KEY))
    return parsed ?? createSeedContacts()
  } catch {
    return createSeedContacts()
  }
}

export function saveContacts(contacts: Contact[], storage: Storage = window.localStorage): boolean {
  try {
    const payload: StoredPayload = { version: STORAGE_VERSION, contacts }
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function resetStorage(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable in private mode; the app still works in memory.
  }
}
