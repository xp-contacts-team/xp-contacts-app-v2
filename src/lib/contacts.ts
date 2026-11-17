import type {
  Contact,
  ContactInput,
  ContactMethod,
  ContactStats,
  ImportMode,
  SortKey,
} from '../types'
import { METHOD_META } from './labels'
import { makeId } from './id'

const collator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base', numeric: true })

function clean(value: string | undefined | null): string {
  return (value ?? '').trim()
}

export function normalizeMethod(method: ContactMethod): ContactMethod | null {
  const value = clean(method.value)
  if (!value) return null
  return {
    id: method.id || makeId('method'),
    kind: method.kind,
    label: clean(method.label) || METHOD_META[method.kind].defaultLabel,
    value,
  }
}

export function createContact(input: ContactInput, now = new Date()): Contact {
  const timestamp = now.toISOString()
  const methods = input.methods
    .map(normalizeMethod)
    .filter((method): method is ContactMethod => method !== null)

  return {
    id: makeId('contact'),
    name: clean(input.name),
    company: clean(input.company),
    jobTitle: clean(input.jobTitle),
    notes: input.notes.trim(),
    favorite: Boolean(input.favorite),
    methods,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export function updateContact(contact: Contact, input: ContactInput, now = new Date()): Contact {
  const methods = input.methods
    .map(normalizeMethod)
    .filter((method): method is ContactMethod => method !== null)

  return {
    ...contact,
    name: clean(input.name),
    company: clean(input.company),
    jobTitle: clean(input.jobTitle),
    notes: input.notes.trim(),
    favorite: Boolean(input.favorite),
    methods,
    updatedAt: now.toISOString(),
  }
}

export function toggleFavorite(contacts: Contact[], id: string, now = new Date()): Contact[] {
  return contacts.map((contact) =>
    contact.id === id
      ? { ...contact, favorite: !contact.favorite, updatedAt: now.toISOString() }
      : contact,
  )
}

export function removeContact(contacts: Contact[], id: string): Contact[] {
  return contacts.filter((contact) => contact.id !== id)
}

export function contactToInput(contact: Contact): ContactInput {
  return {
    name: contact.name,
    company: contact.company,
    jobTitle: contact.jobTitle,
    notes: contact.notes,
    favorite: contact.favorite,
    methods: contact.methods.map((method) => ({ ...method })),
  }
}

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN')
}

export function matchesQuery(contact: Contact, query: string): boolean {
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  const haystack = [
    contact.name,
    contact.company,
    contact.jobTitle,
    contact.notes,
    ...contact.methods.flatMap((method) => [method.label, method.value]),
  ]
    .join('\n')
    .toLocaleLowerCase('zh-CN')

  return tokens.every((token) => haystack.includes(token))
}

export function sortContacts(contacts: Contact[], sort: SortKey): Contact[] {
  const next = [...contacts]
  next.sort((a, b) => {
    if (sort === 'updated') {
      return b.updatedAt.localeCompare(a.updatedAt) || collator.compare(a.name, b.name)
    }
    if (sort === 'company') {
      return (
        collator.compare(a.company || '\uffff', b.company || '\uffff') ||
        collator.compare(a.name, b.name)
      )
    }
    return collator.compare(a.name, b.name) || a.createdAt.localeCompare(b.createdAt)
  })
  return next
}

export interface QueryOptions {
  query?: string
  favoritesOnly?: boolean
  sort?: SortKey
}

export function queryContacts(contacts: Contact[], options: QueryOptions = {}): Contact[] {
  const { query = '', favoritesOnly = false, sort = 'name' } = options
  const filtered = contacts.filter(
    (contact) => (!favoritesOnly || contact.favorite) && matchesQuery(contact, query),
  )
  return sortContacts(filtered, sort)
}

export function getContactStats(contacts: Contact[]): ContactStats {
  const companies = new Set(contacts.map((contact) => contact.company).filter(Boolean))
  return {
    total: contacts.length,
    favorites: contacts.filter((contact) => contact.favorite).length,
    withPhone: contacts.filter((contact) =>
      contact.methods.some((method) => method.kind === 'phone'),
    ).length,
    companies: companies.size,
  }
}

function normalizedName(name: string): string {
  return name.trim().toLocaleLowerCase('zh-CN').replace(/\s+/g, '')
}

function normalizedValue(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN').replace(/[\s-]/g, '')
}

export function findMergeCandidate(
  contacts: Contact[],
  incoming: ContactInput,
): Contact | undefined {
  const incomingName = normalizedName(incoming.name)
  if (!incomingName) return undefined

  const sameName = contacts.filter((contact) => normalizedName(contact.name) === incomingName)
  if (sameName.length === 0) return undefined

  const incomingValues = new Set(
    incoming.methods.map((method) => normalizedValue(method.value)).filter(Boolean),
  )

  const shared = sameName.find((contact) =>
    contact.methods.some((method) => incomingValues.has(normalizedValue(method.value))),
  )
  if (shared) return shared

  return sameName.find((contact) => contact.methods.length === 0 || incoming.methods.length === 0)
}

export function mergeContact(existing: Contact, incoming: ContactInput, now = new Date()): Contact {
  const known = new Set(
    existing.methods.map((method) => `${method.kind}:${normalizedValue(method.value)}`),
  )
  const additions = incoming.methods
    .map(normalizeMethod)
    .filter((method): method is ContactMethod => {
      if (!method) return false
      const key = `${method.kind}:${normalizedValue(method.value)}`
      if (known.has(key)) return false
      known.add(key)
      return true
    })

  return {
    ...existing,
    company: clean(incoming.company) || existing.company,
    jobTitle: clean(incoming.jobTitle) || existing.jobTitle,
    notes: incoming.notes.trim() || existing.notes,
    favorite: existing.favorite || Boolean(incoming.favorite),
    methods: [...existing.methods, ...additions],
    updatedAt: now.toISOString(),
  }
}

export interface ImportApplication {
  contacts: Contact[]
  added: number
  merged: number
  skipped: number
}

export function applyImportedContacts(
  contacts: Contact[],
  incoming: ContactInput[],
  mode: ImportMode,
  now = new Date(),
): ImportApplication {
  let next = [...contacts]
  let added = 0
  let merged = 0
  let skipped = 0

  for (const entry of incoming) {
    const candidate = mode === 'append' ? undefined : findMergeCandidate(next, entry)

    if (candidate && mode === 'skip') {
      skipped += 1
      continue
    }

    if (candidate && mode === 'merge') {
      next = next.map((contact) =>
        contact.id === candidate.id ? mergeContact(contact, entry, now) : contact,
      )
      merged += 1
      continue
    }

    next = [...next, createContact(entry, now)]
    added += 1
  }

  return { contacts: next, added, merged, skipped }
}
