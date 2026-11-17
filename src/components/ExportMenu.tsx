import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileSpreadsheet, Star } from 'lucide-react'

interface ExportMenuProps {
  total: number
  favorites: number
  onExportAll: () => void
  onExportFavorites: () => void
  onDownloadTemplate: () => void
}

export function ExportMenu({
  total,
  favorites,
  onExportAll,
  onExportFavorites,
  onDownloadTemplate,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        type="button"
        className="button button-quiet button-small"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={16} />
        <span>导出</span>
        <ChevronDown size={14} className={open ? 'chevron-up' : ''} />
      </button>
      {open && (
        <div className="menu-popover" role="menu" aria-label="导出选项">
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              onExportAll()
              setOpen(false)
            }}
          >
            <span className="menu-icon menu-icon-indigo">
              <Download size={15} />
            </span>
            <span>
              <strong>导出全部联系人</strong>
              <small>{total} 位联系人 · .xlsx</small>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            disabled={favorites === 0}
            onClick={() => {
              onExportFavorites()
              setOpen(false)
            }}
          >
            <span className="menu-icon menu-icon-amber">
              <Star size={15} />
            </span>
            <span>
              <strong>仅导出收藏</strong>
              <small>{favorites} 位收藏联系人</small>
            </span>
          </button>
          <div className="menu-divider" />
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              onDownloadTemplate()
              setOpen(false)
            }}
          >
            <span className="menu-icon menu-icon-slate">
              <FileSpreadsheet size={15} />
            </span>
            <span>
              <strong>下载导入模板</strong>
              <small>含表头与填写说明</small>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
