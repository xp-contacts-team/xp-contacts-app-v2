import { describe, expect, it } from 'vitest'
import {
  applyImportedContacts,
  contactToInput,
  createContact,
  findMergeCandidate,
  getContactStats,
  matchesQuery,
  mergeContact,
  queryContacts,
  removeContact,
  toggleFavorite,
  updateContact,
} from '../lib/contacts'
import { createSeedContacts } from '../data/seed'
import { makeContactInput } from '../test/factories'

const FIXED_DATE = new Date('2026-11-01T08:00:00.000Z')

describe('contact domain', () => {
  it('creates a normalized contact and drops empty methods', () => {
    const contact = createContact(
      makeContactInput({
        name: '  李四  ',
        company: '  远航咨询 ',
        methods: [
          { id: '', kind: 'phone', label: ' 手机 ', value: ' 139 0000 0000 ' },
          { id: 'empty', kind: 'email', label: '工作', value: '   ' },
        ],
      }),
      FIXED_DATE,
    )

    expect(contact.name).toBe('李四')
    expect(contact.company).toBe('远航咨询')
    expect(contact.methods).toHaveLength(1)
    expect(contact.methods[0].label).toBe('手机')
    expect(contact.methods[0].value).toBe('139 0000 0000')
    expect(contact.createdAt).toBe(FIXED_DATE.toISOString())
  })

  it('updates editable fields but keeps identity and creation date', () => {
    const contact = createContact(makeContactInput(), FIXED_DATE)
    const updated = updateContact(
      contact,
      makeContactInput({ name: '李四', favorite: true, notes: '更新后的备注' }),
      new Date('2026-11-02T08:00:00.000Z'),
    )

    expect(updated.id).toBe(contact.id)
    expect(updated.createdAt).toBe(contact.createdAt)
    expect(updated.updatedAt).toBe('2026-11-02T08:00:00.000Z')
    expect(updated.name).toBe('李四')
    expect(updated.favorite).toBe(true)
    expect(updated.notes).toBe('更新后的备注')
  })

  it('toggles favorites without touching other contacts', () => {
    const contacts = [createContact(makeContactInput(), FIXED_DATE)]
    const next = toggleFavorite(contacts, contacts[0].id, FIXED_DATE)
    expect(next[0].favorite).toBe(true)
    expect(toggleFavorite(next, contacts[0].id, FIXED_DATE)[0].favorite).toBe(false)
  })

  it('removes contacts by id', () => {
    const a = createContact(makeContactInput({ name: 'A' }), FIXED_DATE)
    const b = createContact(makeContactInput({ name: 'B' }), FIXED_DATE)
    expect(removeContact([a, b], a.id)).toEqual([b])
  })

  it('searches every contact method and all query tokens', () => {
    const contact = createContact(
      makeContactInput({
        methods: [
          { id: 'p', kind: 'phone', label: '工作', value: '010-8888 6666' },
          { id: 's', kind: 'social', label: '微信', value: 'atlas_demo' },
        ],
      }),
      FIXED_DATE,
    )

    expect(matchesQuery(contact, '示例科技')).toBe(true)
    expect(matchesQuery(contact, 'atlas')).toBe(true)
    expect(matchesQuery(contact, '010 8888')).toBe(true)
    expect(matchesQuery(contact, '不存在的词')).toBe(false)
    expect(matchesQuery(contact, '示例 微信')).toBe(true)
  })

  it('filters favorites and sorts by name or update time', () => {
    const a = createContact(makeContactInput({ name: 'B 联系人', favorite: true }), FIXED_DATE)
    const b = createContact(makeContactInput({ name: 'A 联系人' }), FIXED_DATE)
    const c = createContact(
      makeContactInput({ name: 'C 联系人', favorite: true }),
      new Date('2026-11-03T08:00:00.000Z'),
    )

    expect(queryContacts([a, b, c], { favoritesOnly: true }).map((item) => item.name)).toEqual([
      'B 联系人',
      'C 联系人',
    ])
    expect(queryContacts([a, b, c], { sort: 'name' }).map((item) => item.name)).toEqual([
      'A 联系人',
      'B 联系人',
      'C 联系人',
    ])
    expect(queryContacts([a, b, c], { sort: 'updated' })[0].name).toBe('C 联系人')
  })

  it('computes address book statistics', () => {
    const contacts = createSeedContacts()
    const stats = getContactStats(contacts)
    expect(stats.total).toBe(10)
    expect(stats.favorites).toBe(4)
    expect(stats.companies).toBeGreaterThan(5)
    expect(stats.withPhone).toBe(10)
  })

  it('round-trips a contact through ContactInput', () => {
    const contact = createContact(makeContactInput(), FIXED_DATE)
    expect(contactToInput(contact)).toEqual({
      name: contact.name,
      company: contact.company,
      jobTitle: contact.jobTitle,
      notes: contact.notes,
      favorite: contact.favorite,
      methods: contact.methods,
    })
  })
})

describe('import merging', () => {
  it('finds a duplicate by name and a shared method value', () => {
    const existing = createContact(makeContactInput(), FIXED_DATE)
    expect(findMergeCandidate([existing], makeContactInput())).toBe(existing)
    expect(
      findMergeCandidate(
        [existing],
        makeContactInput({
          name: '张三',
          methods: [{ id: 'x', kind: 'phone', label: '手机', value: '139 1111 2222' }],
        }),
      ),
    ).toBeUndefined()
  })

  it('merges new methods, fills empty fields and keeps the existing id', () => {
    const existing = createContact(makeContactInput({ company: '', notes: '' }), FIXED_DATE)
    const merged = mergeContact(
      existing,
      makeContactInput({
        company: '新公司',
        notes: '新备注',
        favorite: true,
        methods: [
          { id: 'm-phone', kind: 'phone', label: '手机', value: '138 0000 0000' },
          { id: 'm-social', kind: 'social', label: '微信', value: 'zhangsan_demo' },
        ],
      }),
      new Date('2026-11-04T08:00:00.000Z'),
    )

    expect(merged.id).toBe(existing.id)
    expect(merged.company).toBe('新公司')
    expect(merged.notes).toBe('新备注')
    expect(merged.favorite).toBe(true)
    expect(merged.methods).toHaveLength(3)
    expect(merged.methods.map((method) => method.value)).toContain('zhangsan_demo')
  })

  it('applies merge, skip and append import modes', () => {
    const existing = createContact(makeContactInput(), FIXED_DATE)
    const incoming = [
      makeContactInput({
        methods: [
          { id: 'new-phone', kind: 'phone', label: '工作', value: '010-1234 5678' },
          { id: 'same-email', kind: 'email', label: '工作', value: 'zhangsan@example.com' },
        ],
      }),
      makeContactInput({ name: '王五', methods: [] }),
    ]

    const merged = applyImportedContacts([existing], incoming, 'merge', FIXED_DATE)
    expect(merged.added).toBe(1)
    expect(merged.merged).toBe(1)
    expect(merged.contacts).toHaveLength(2)
    expect(merged.contacts[0].methods).toHaveLength(3)

    const skipped = applyImportedContacts([existing], incoming, 'skip', FIXED_DATE)
    expect(skipped.skipped).toBe(1)
    expect(skipped.added).toBe(1)
    expect(skipped.contacts).toHaveLength(2)

    const appended = applyImportedContacts([existing], incoming, 'append', FIXED_DATE)
    expect(appended.added).toBe(2)
    expect(appended.contacts).toHaveLength(3)
  })
})
