import {
  ArrowLeft,
  AtSign,
  Building2,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react'
import type { Contact, ContactMethod, ContactMethodKind } from '../types'
import { METHOD_META } from '../lib/labels'
import { avatarTone, formatDate, initials } from '../lib/format'
import { METHOD_KINDS } from '../types'

const METHOD_ICONS: Record<ContactMethodKind, typeof Phone> = {
  phone: Phone,
  email: Mail,
  social: AtSign,
  address: MapPin,
}

interface ContactDetailProps {
  contact: Contact | null
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onClose: () => void
  onAdd: () => void
  onImport: () => void
  onCopy: (message: string) => void
}

function MethodRow({
  method,
  onCopy,
}: {
  method: ContactMethod
  onCopy: (message: string) => void
}) {
  const Icon = METHOD_ICONS[method.kind]
  const isLink = method.kind === 'phone' || method.kind === 'email'
  const href =
    method.kind === 'phone'
      ? `tel:${method.value.replace(/[^\d+]/g, '')}`
      : method.kind === 'email'
        ? `mailto:${method.value}`
        : undefined

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(method.value)
      onCopy(`${METHOD_META[method.kind].title}已复制`)
    } catch {
      onCopy('复制失败，请手动选择文本')
    }
  }

  return (
    <div className={`method-row method-${method.kind}`}>
      <span className="method-icon">
        <Icon size={17} />
      </span>
      <div className="method-copy">
        <span className="method-label">{method.label}</span>
        {isLink && href ? (
          <a className="method-value" href={href}>
            {method.value}
          </a>
        ) : (
          <span className="method-value">{method.value}</span>
        )}
      </div>
      <button
        type="button"
        className="method-copy-button"
        onClick={handleCopy}
        aria-label={`复制${METHOD_META[method.kind].title}：${method.value}`}
        title="复制"
      >
        <Copy size={15} />
      </button>
    </div>
  )
}

function DetailEmpty({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  return (
    <div className="detail-empty">
      <div className="detail-empty-art" aria-hidden="true">
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <span className="detail-empty-avatar">
          <UserPlus size={30} />
        </span>
      </div>
      <p className="eyebrow">CONTACT PROFILE</p>
      <h2>选择一位联系人</h2>
      <p>从左侧列表打开联系人档案，查看完整联系方式；也可以立即新建一位。</p>
      <div className="detail-empty-actions">
        <button type="button" className="button button-primary" onClick={onAdd}>
          <Plus size={16} />
          新建联系人
        </button>
        <button type="button" className="button button-quiet" onClick={onImport}>
          <Upload size={16} />从 Excel 导入
        </button>
      </div>
    </div>
  )
}

export function ContactDetail({
  contact,
  onEdit,
  onDelete,
  onToggleFavorite,
  onClose,
  onAdd,
  onImport,
  onCopy,
}: ContactDetailProps) {
  if (!contact) return <DetailEmpty onAdd={onAdd} onImport={onImport} />

  return (
    <div className="detail-content">
      <div className="detail-topbar">
        <button type="button" className="mobile-back" onClick={onClose} aria-label="返回联系人列表">
          <ArrowLeft size={18} />
          返回
        </button>
        <span className="detail-kicker">
          <span className="kicker-dot" />
          联系人档案
        </span>
        <div className="detail-actions">
          <button
            type="button"
            className={`button button-star ${contact.favorite ? 'is-favorite' : ''}`}
            onClick={onToggleFavorite}
            aria-pressed={contact.favorite}
          >
            <Star size={16} fill={contact.favorite ? 'currentColor' : 'none'} />
            {contact.favorite ? '已收藏' : '收藏'}
          </button>
          <button type="button" className="button button-quiet" onClick={onEdit}>
            <Pencil size={15} />
            编辑
          </button>
          <button
            type="button"
            className="icon-button icon-button-danger"
            onClick={onDelete}
            aria-label={`删除 ${contact.name}`}
            title="删除联系人"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="detail-scroll">
        <section className="profile-hero" aria-labelledby="profile-name">
          <div className={`profile-avatar avatar-tone-${avatarTone(contact.name)}`}>
            {initials(contact.name)}
          </div>
          <div className="profile-copy">
            <div className="profile-name-row">
              <h2 id="profile-name">{contact.name}</h2>
              {contact.favorite && (
                <span className="favorite-badge">
                  <Star size={12} fill="currentColor" />
                  收藏
                </span>
              )}
            </div>
            <p className="profile-role">
              {contact.jobTitle || '未填写职位'}
              {contact.company && (
                <>
                  <span className="role-divider">·</span>
                  {contact.company}
                </>
              )}
            </p>
            <div className="profile-meta">
              <span>
                <Building2 size={14} />
                {contact.company || '未填写公司'}
              </span>
              <span>
                <Clock3 size={14} />
                更新于 {formatDate(contact.updatedAt)}
              </span>
            </div>
          </div>
        </section>

        <section className="detail-section" aria-labelledby="contact-methods-title">
          <div className="section-heading">
            <div>
              <h3 id="contact-methods-title">联系方式</h3>
              <p>电话、邮箱、社交账号与地址可同时保存多条。</p>
            </div>
            <span className="section-count">{contact.methods.length} 项</span>
          </div>

          {contact.methods.length === 0 ? (
            <div className="methods-empty">
              <span className="methods-empty-icon">
                <Phone size={18} />
              </span>
              <div>
                <strong>还没有联系方式</strong>
                <p>编辑联系人，添加电话、邮箱、社交账号或地址。</p>
              </div>
              <button type="button" className="button button-small button-quiet" onClick={onEdit}>
                添加
              </button>
            </div>
          ) : (
            <div className="method-groups">
              {METHOD_KINDS.map((kind) => {
                const methods = contact.methods.filter((method) => method.kind === kind)
                if (methods.length === 0) return null
                const Icon = METHOD_ICONS[kind]
                return (
                  <div className="method-group" key={kind}>
                    <div className="method-group-title">
                      <Icon size={14} />
                      {METHOD_META[kind].title}
                      <span>{methods.length}</span>
                    </div>
                    <div className="method-group-rows">
                      {methods.map((method) => (
                        <MethodRow key={method.id} method={method} onCopy={onCopy} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="detail-section" aria-labelledby="notes-title">
          <div className="section-heading">
            <div>
              <h3 id="notes-title">备注</h3>
              <p>记录与这位联系人相关的提醒和背景。</p>
            </div>
          </div>
          {contact.notes ? (
            <div className="notes-card">
              <span className="quote-mark" aria-hidden="true">
                “
              </span>
              <p>{contact.notes}</p>
            </div>
          ) : (
            <p className="section-placeholder">暂无备注。点击「编辑」补充一段说明。</p>
          )}
        </section>

        <section className="detail-section meta-section" aria-label="联系人元信息">
          <div className="meta-item">
            <CalendarDays size={16} />
            <div>
              <span>创建时间</span>
              <strong>{formatDate(contact.createdAt)}</strong>
            </div>
          </div>
          <div className="meta-item">
            <Clock3 size={16} />
            <div>
              <span>最近更新</span>
              <strong>{formatDate(contact.updatedAt)}</strong>
            </div>
          </div>
          <div className="meta-item">
            <Check size={16} />
            <div>
              <span>收藏状态</span>
              <strong>{contact.favorite ? '已收藏' : '未收藏'}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
