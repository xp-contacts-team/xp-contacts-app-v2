import type { Contact } from '../types'

export const AVATAR_PALETTE = [
  'sunset',
  'ocean',
  'forest',
  'violet',
  'rose',
  'amber',
  'sky',
  'plum',
] as const

export function avatarTone(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

export function initials(name: string): string {
  const value = name.trim()
  if (!value) return '?'

  if (/[\u3400-\u9fff]/.test(value)) {
    return value.slice(0, 2)
  }

  const words = value.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase()
  }
  return value.slice(0, 2).toUpperCase()
}

export function primaryPhone(contact: Contact): string {
  return contact.methods.find((method) => method.kind === 'phone')?.value ?? ''
}

export function primaryEmail(contact: Contact): string {
  return contact.methods.find((method) => method.kind === 'email')?.value ?? ''
}

export function methodCount(contact: Contact, kind: Contact['methods'][number]['kind']): number {
  return contact.methods.filter((method) => method.kind === kind).length
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return dateFormatter.format(date)
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  const day = 24 * 60 * 60 * 1000
  if (diff >= 0 && diff < day) return '今天'
  if (diff >= day && diff < day * 2) return '昨天'
  if (diff >= day * 2 && diff < day * 7) return `${Math.floor(diff / day)} 天前`
  return formatDate(iso)
}

export function pluralContacts(count: number): string {
  return `${count} 位联系人`
}
