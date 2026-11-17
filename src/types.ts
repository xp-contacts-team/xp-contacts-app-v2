export const METHOD_KINDS = ['phone', 'email', 'social', 'address'] as const

export type ContactMethodKind = (typeof METHOD_KINDS)[number]

export interface ContactMethod {
  id: string
  kind: ContactMethodKind
  label: string
  value: string
}

export interface Contact {
  id: string
  name: string
  company: string
  jobTitle: string
  notes: string
  favorite: boolean
  methods: ContactMethod[]
  createdAt: string
  updatedAt: string
}

export interface ContactInput {
  name: string
  company: string
  jobTitle: string
  notes: string
  favorite: boolean
  methods: ContactMethod[]
}

export interface ContactStats {
  total: number
  favorites: number
  withPhone: number
  companies: number
}

export type SortKey = 'name' | 'updated' | 'company'

export type ViewKey = 'all' | 'favorites'

export type ImportMode = 'merge' | 'skip' | 'append'

export interface ToastMessage {
  id: number
  tone: 'success' | 'error' | 'info'
  text: string
}
