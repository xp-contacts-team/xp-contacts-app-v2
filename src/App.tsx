import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  CloudOff,
  Command,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react'
import type { Contact, ContactInput, ImportMode, SortKey, ToastMessage, ViewKey } from './types'
import {
  applyImportedContacts,
  createContact,
  queryContacts,
  removeContact,
  toggleFavorite,
  updateContact,
  getContactStats,
} from './lib/contacts'
import {
  exportContactsToExcel,
  downloadImportTemplate,
  importSummary,
  type ImportedContact,
} from './lib/excel'
import { fetchContacts, replaceAllContacts } from './lib/api'
import { loadContacts, saveContacts } from './lib/storage'
import { SORT_OPTIONS } from './lib/labels'
import { ContactList } from './components/ContactList'
import { ContactDetail } from './components/ContactDetail'
import { ContactForm } from './components/ContactForm'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ExportMenu } from './components/ExportMenu'
import { ImportDialog } from './components/ImportDialog'
import { Sidebar } from './components/Sidebar'
import { Toast } from './components/Toast'

type EditorState = { mode: 'create' } | { mode: 'edit'; contactId: string } | null

const MIGRATION_KEY = 'atlas.server-migrated.v1'

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts())
  const [view, setView] = useState<ViewKey>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('name')
  const [selectedId, setSelectedId] = useState<string | null>(() => contacts[0]?.id ?? null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [editor, setEditor] = useState<EditorState>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [storageWarning, setStorageWarning] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [syncError, setSyncError] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const toastCounter = useRef(0)

  const showToast = useCallback((text: string, tone: ToastMessage['tone'] = 'success') => {
    toastCounter.current += 1
    setToast({ id: toastCounter.current, text, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!saveContacts(contacts)) setStorageWarning(true)
  }, [contacts])

  useEffect(() => {
    let cancelled = false

    const loadFromServer = async () => {
      try {
        const remote = await fetchContacts()
        if (cancelled) return

        if (remote.length === 0) {
          const local = loadContacts()
          if (
            local.length > 0 &&
            window.localStorage.getItem(MIGRATION_KEY) !== '1'
          ) {
            await replaceAllContacts(local)
            if (cancelled) return
            window.localStorage.setItem(MIGRATION_KEY, '1')
          }
          setContacts(local)
        } else {
          setContacts(remote)
          window.localStorage.setItem(MIGRATION_KEY, '1')
        }
        setSyncError('')
      } catch {
        if (cancelled) return
        setContacts(loadContacts())
        setSyncError('无法连接服务器，当前显示浏览器本地缓存；修改会暂存在本机')
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    void loadFromServer()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (!selectedId || !contacts.some((contact) => contact.id === selectedId)) {
      setSelectedId(contacts[0]?.id ?? null)
    }
  }, [hydrated, contacts, selectedId])

  useEffect(() => {
    if (!hydrated) return
    const timer = window.setTimeout(async () => {
      try {
        await replaceAllContacts(contacts)
        setSyncError('')
      } catch {
        setSyncError('服务器同步失败，修改暂存在本机；请检查网络后重试')
      }
    }, 400)
    return () => window.clearTimeout(timer)
  }, [contacts, hydrated])

  const retrySync = async () => {
    try {
      await replaceAllContacts(contacts)
      setSyncError('')
      showToast('已同步到服务器', 'success')
    } catch {
      setSyncError('同步失败，请检查服务器是否运行')
      showToast('同步失败', 'error')
    }
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const filtered = useMemo(
    () =>
      queryContacts(contacts, {
        query,
        favoritesOnly: view === 'favorites',
        sort,
      }),
    [contacts, query, view, sort],
  )

  const stats = useMemo(() => getContactStats(contacts), [contacts])
  const selected = contacts.find((contact) => contact.id === selectedId) ?? null
  const editingContact =
    editor?.mode === 'edit'
      ? (contacts.find((contact) => contact.id === editor.contactId) ?? null)
      : null

  const handleChangeView = (next: ViewKey) => {
    setView(next)
    setMobileDetailOpen(false)
    const nextList = queryContacts(contacts, {
      query,
      favoritesOnly: next === 'favorites',
      sort,
    })
    if (selectedId && !nextList.some((contact) => contact.id === selectedId)) {
      setSelectedId(nextList[0]?.id ?? null)
    }
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setMobileDetailOpen(true)
  }

  const handleToggleFavorite = (id: string) => {
    const target = contacts.find((contact) => contact.id === id)
    if (!target) return
    const next = toggleFavorite(contacts, id)
    setContacts(next)
    showToast(target.favorite ? '已取消收藏' : '已加入收藏', target.favorite ? 'info' : 'success')

    if (view === 'favorites' && target.favorite) {
      const remaining = queryContacts(next, { query, favoritesOnly: true, sort })
      setSelectedId(remaining[0]?.id ?? null)
      if (remaining.length === 0) setMobileDetailOpen(false)
    }
  }

  const handleOpenCreate = () => {
    setEditor({ mode: 'create' })
  }

  const handleOpenEdit = () => {
    if (selected) setEditor({ mode: 'edit', contactId: selected.id })
  }

  const handleSubmitContact = (input: ContactInput) => {
    if (!editor) return

    if (editor.mode === 'create') {
      const contact = createContact(input)
      setContacts((current) => [contact, ...current])
      setSelectedId(contact.id)
      setMobileDetailOpen(true)
      setView('all')
      setEditor(null)
      showToast(`${contact.name || '联系人'}已添加`, 'success')
      return
    }

    const target = contacts.find((contact) => contact.id === editor.contactId)
    if (!target) {
      setEditor(null)
      showToast('联系人已不存在，修改未保存', 'error')
      return
    }
    setContacts((current) =>
      current.map((contact) =>
        contact.id === target.id ? updateContact(contact, input) : contact,
      ),
    )
    setEditor(null)
    showToast('修改已保存', 'success')
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    const target = deleteTarget
    const next = removeContact(contacts, target.id)
    setContacts(next)
    setDeleteTarget(null)

    if (selectedId === target.id) {
      const remaining = queryContacts(next, {
        query,
        favoritesOnly: view === 'favorites',
        sort,
      })
      setSelectedId(remaining[0]?.id ?? null)
      setMobileDetailOpen(false)
    }
    showToast(`已删除 ${target.name}`, 'info')
  }

  const handleImport = (rows: ImportedContact[], mode: ImportMode) => {
    if (rows.length === 0) return
    const previousIds = new Set(contacts.map((contact) => contact.id))
    const result = applyImportedContacts(contacts, rows, mode)
    const firstAdded = result.contacts.find((contact) => !previousIds.has(contact.id))
    setContacts(result.contacts)
    setImportOpen(false)
    setView('all')
    if (firstAdded) {
      setSelectedId(firstAdded.id)
      setMobileDetailOpen(true)
    }
    showToast(
      importSummary(rows.length, result),
      result.added + result.merged > 0 ? 'success' : 'info',
    )
  }

  const handleExport = (items: Contact[], label: string) => {
    if (items.length === 0) {
      showToast('没有可导出的联系人', 'info')
      return
    }
    try {
      exportContactsToExcel(items)
      showToast(`已导出${label} ${items.length} 位联系人`, 'success')
    } catch {
      showToast('导出失败，请稍后重试', 'error')
    }
  }

  const handleDownloadTemplate = () => {
    try {
      downloadImportTemplate()
      showToast('导入模板已下载', 'success')
    } catch {
      showToast('模板下载失败，请稍后重试', 'error')
    }
  }

  const handleCopy = (message: string) => {
    showToast(message, 'success')
  }

  const clearSearch = () => {
    setQuery('')
    searchRef.current?.focus()
  }

  return (
    <div className="app">
      <div className={`app-shell ${mobileDetailOpen ? 'mobile-detail-open' : ''}`}>
        <Sidebar
          view={view}
          stats={stats}
          onChangeView={handleChangeView}
          onImport={() => setImportOpen(true)}
          onExport={() => handleExport(contacts, '全部')}
          onDownloadTemplate={handleDownloadTemplate}
        />

        <section className="list-pane" aria-label="联系人列表">
          <header className="list-header">
            <div className="list-eyebrow">
              <span className="eyebrow-dot" />
              ADDRESS BOOK
            </div>
            <div className="list-title-row">
              <div>
                <h1>{view === 'favorites' ? '我的收藏' : '全部联系人'}</h1>
                <p className="list-meta">
                  {query.trim()
                    ? `找到 ${filtered.length} 位匹配的联系人`
                    : view === 'favorites'
                      ? `${stats.favorites} 位收藏 · 共 ${stats.total} 位联系人`
                      : `共 ${stats.total} 位联系人 · ${stats.companies} 家公司`}
                </p>
              </div>
              <button
                type="button"
                className="button button-primary add-button"
                onClick={handleOpenCreate}
              >
                <Plus size={17} />
                新建
              </button>
            </div>

            <div className="search-box">
              <Search size={17} className="search-icon" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索姓名、公司、电话或备注…"
                aria-label="搜索联系人"
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  className="search-clear"
                  onClick={clearSearch}
                  aria-label="清除搜索"
                >
                  <X size={15} />
                </button>
              ) : (
                <kbd className="search-kbd">
                  <Command size={11} /> K
                </kbd>
              )}
            </div>

            <div className="list-toolbar">
              <span className="result-count">
                <b>{filtered.length}</b> 位{query.trim() ? '匹配' : ''}
              </span>
              <div className="toolbar-right">
                <label className="sort-control">
                  <ArrowUpDown size={14} />
                  <select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortKey)}
                    aria-label="排序方式"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="sort-chevron" />
                </label>
                <button
                  type="button"
                  className="icon-button import-quick"
                  onClick={() => setImportOpen(true)}
                  aria-label="导入 Excel"
                  title="导入 Excel"
                >
                  <Upload size={15} />
                </button>
                <ExportMenu
                  total={contacts.length}
                  favorites={stats.favorites}
                  onExportAll={() => handleExport(contacts, '全部')}
                  onExportFavorites={() =>
                    handleExport(
                      contacts.filter((contact) => contact.favorite),
                      '收藏',
                    )
                  }
                  onDownloadTemplate={handleDownloadTemplate}
                />
              </div>
            </div>
          </header>

          {storageWarning && (
            <div className="storage-warning" role="status">
              <AlertTriangle size={15} />
              本机浏览器存储不可用，本次修改可能无法保留。
            </div>
          )}

          {syncError && (
            <div className="storage-warning sync-warning" role="alert">
              <CloudOff size={15} />
              <span>{syncError}</span>
              <button type="button" className="sync-retry" onClick={retrySync}>
                重试同步
              </button>
            </div>
          )}

          <div className="list-scroll">
            <ContactList
              contacts={filtered}
              selectedId={selectedId}
              view={view}
              query={query}
              onSelect={handleSelect}
              onToggleFavorite={handleToggleFavorite}
              onAdd={handleOpenCreate}
              onClearSearch={clearSearch}
            />
          </div>

          <footer className="list-footer">
            <span className="list-footer-dot" />
            {stats.withPhone} 位联系人留有电话 · 数据保存在本机
          </footer>
        </section>

        <main className={`detail-pane ${mobileDetailOpen ? 'is-open' : ''}`}>
          <ContactDetail
            contact={selected}
            onEdit={handleOpenEdit}
            onDelete={() => selected && setDeleteTarget(selected)}
            onToggleFavorite={() => selected && handleToggleFavorite(selected.id)}
            onClose={() => setMobileDetailOpen(false)}
            onAdd={handleOpenCreate}
            onImport={() => setImportOpen(true)}
            onCopy={handleCopy}
          />
        </main>
      </div>

      {editor && (
        <ContactForm
          open
          mode={editor.mode}
          contact={editingContact}
          onClose={() => setEditor(null)}
          onSubmit={handleSubmitContact}
        />
      )}

      {importOpen && (
        <ImportDialog
          open
          existingCount={contacts.length}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}

      <ConfirmDialog
        contact={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <Toast toast={toast} />
    </div>
  )
}
