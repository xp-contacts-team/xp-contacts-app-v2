import {
  BookUser,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Users,
} from 'lucide-react'
import type { ContactStats, ViewKey } from '../types'

interface SidebarProps {
  view: ViewKey
  stats: ContactStats
  onChangeView: (view: ViewKey) => void
  onImport: () => void
  onExport: () => void
  onDownloadTemplate: () => void
}

export function Sidebar({
  view,
  stats,
  onChangeView,
  onImport,
  onExport,
  onDownloadTemplate,
}: SidebarProps) {
  const favoriteRatio = stats.total === 0 ? 0 : Math.round((stats.favorites / stats.total) * 100)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark" aria-hidden="true">
          <BookUser size={24} strokeWidth={2.2} />
        </div>
        <div className="brand-copy">
          <strong>Atlas</strong>
          <span>通讯录</span>
        </div>
      </div>

      <p className="brand-tagline">把重要的人，放在触手可及的地方。</p>

      <nav className="sidebar-nav" aria-label="联系人视图">
        <button
          type="button"
          className={`nav-item ${view === 'all' ? 'is-active' : ''}`}
          onClick={() => onChangeView('all')}
          aria-current={view === 'all' ? 'page' : undefined}
        >
          <Users size={18} />
          <span>全部联系人</span>
          <span className="nav-count">{stats.total}</span>
        </button>
        <button
          type="button"
          className={`nav-item ${view === 'favorites' ? 'is-active' : ''}`}
          onClick={() => onChangeView('favorites')}
          aria-current={view === 'favorites' ? 'page' : undefined}
        >
          <Star size={18} />
          <span>我的收藏</span>
          <span className="nav-count">{stats.favorites}</span>
        </button>
      </nav>

      <div className="sidebar-card">
        <div className="sidebar-card-head">
          <Sparkles size={15} />
          <span>收藏概览</span>
        </div>
        <div className="favorite-figure">
          <strong>{stats.favorites}</strong>
          <span>/ {stats.total} 位</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${favoriteRatio}%` }} />
        </div>
        <p>收藏的联系人会集中显示在「我的收藏」，查找常用联系人更快。</p>
      </div>

      <div className="sidebar-actions">
        <button type="button" className="sidebar-action" onClick={onImport}>
          <span className="sidebar-action-icon">
            <Upload size={16} />
          </span>
          <span>
            <strong>导入 Excel</strong>
            <small>从表格批量添加</small>
          </span>
        </button>
        <button type="button" className="sidebar-action" onClick={onExport}>
          <span className="sidebar-action-icon">
            <Download size={16} />
          </span>
          <span>
            <strong>导出 Excel</strong>
            <small>备份或分享联系人</small>
          </span>
        </button>
        <button type="button" className="sidebar-action" onClick={onDownloadTemplate}>
          <span className="sidebar-action-icon">
            <FileSpreadsheet size={16} />
          </span>
          <span>
            <strong>下载模板</strong>
            <small>按标准表头填写</small>
          </span>
        </button>
      </div>

      <div className="sidebar-foot">
        <span className="local-note">
          <ShieldCheck size={14} />
          数据仅保存在本机浏览器
        </span>
        <span className="version">v1.0.0</span>
      </div>
    </aside>
  )
}
