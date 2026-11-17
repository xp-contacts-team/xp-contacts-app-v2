import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  loadContacts,
  normalizeStoredContact,
  parseStoredContacts,
  saveContacts,
} from './storage'
import { createContact } from './contacts'
import { createSeedContacts } from '../data/seed'
import { makeContactInput } from '../test/factories'

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>()

  get length(): number {
    return this.data.size
  }

  clear(): void {
    this.data.clear()
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }
}

const FIXED_DATE = new Date('2026-11-01T08:00:00.000Z')

describe('local storage', () => {
  it('saves and reloads contacts with their methods and favorites', () => {
    const storage = new MemoryStorage()
    const contact = createContact(makeContactInput({ favorite: true }), FIXED_DATE)

    expect(saveContacts([contact], storage)).toBe(true)
    const loaded = loadContacts(storage)

    expect(loaded).toHaveLength(1)
    expect(loaded[0].name).toBe('张三')
    expect(loaded[0].favorite).toBe(true)
    expect(loaded[0].methods).toHaveLength(2)
  })

  it('persists an intentionally empty address book', () => {
    const storage = new MemoryStorage()
    saveContacts([], storage)
    expect(loadContacts(storage)).toEqual([])
  })

  it('falls back to seed contacts when the payload is corrupt or missing', () => {
    const storage = new MemoryStorage()
    expect(loadContacts(storage)).toHaveLength(createSeedContacts().length)

    storage.setItem(STORAGE_KEY, '{not json')
    expect(loadContacts(storage)).toHaveLength(createSeedContacts().length)
  })

  it('rejects an outdated schema version', () => {
    expect(
      parseStoredContacts(JSON.stringify({ version: 0, contacts: createSeedContacts() })),
    ).toBeNull()
  })

  it('recovers valid contacts while dropping malformed records and methods', () => {
    const parsed = parseStoredContacts(
      JSON.stringify({
        version: 1,
        contacts: [
          {
            id: 'c1',
            name: '王五',
            methods: [
              { id: 'm1', kind: 'phone', label: '手机', value: '138 0000 0000' },
              { id: 'm2', kind: 'fax', label: '传真', value: '123' },
              { id: 'm3', kind: 'email', label: '工作', value: '   ' },
            ],
          },
          { id: 'bad' },
          null,
        ],
      }),
    )

    expect(parsed).toHaveLength(1)
    expect(parsed?.[0].methods).toHaveLength(1)
    expect(parsed?.[0].favorite).toBe(false)
  })

  it('normalizes a stored contact and supplies timestamps', () => {
    const contact = normalizeStoredContact({
      id: 'c1',
      name: ' 赵六 ',
      company: 123,
      favorite: 'yes',
    })
    expect(contact?.name).toBe('赵六')
    expect(contact?.company).toBe('')
    expect(contact?.favorite).toBe(true)
    expect(contact?.createdAt).toBeTruthy()
    expect(normalizeStoredContact({ id: '', name: '' })).toBeNull()
  })
})
