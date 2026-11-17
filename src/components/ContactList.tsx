import { Building2, Mail, Phone, Plus, Search, Star, UserRound, Users } from 'lucide-react'
import type { Contact, ViewKey } from '../types'
import { Avatar } from './Avatar'
import { primaryEmail, primaryPhone, formatRelativeDate } from '../lib/format'

interface ContactListProps {
  contacts: Contact[]
  selectedId: string | null
  view: ViewKey
  query: string
  onSelect: (id: string) => void
  onToggleFavorite: (id: string) => void
  onAdd: () => void
  onClearSearch: () => void
}

function methodChips(contact: Contact): { label: string; count: number }[] {
  const kinds = [
    { key: 'phone' as const, label: '电话' },
    { key: 'email' as const, label: '邮箱' },
    { key: 'social' as const, label: '社交' },
    { key: 'address' as const, label: '地址' },
  ]
  return kinds
    .map(({ key, label }) => ({
      label,
      count: contact.methods.filter((method) => method.kind === key).length,
    }))
    .filter((chip) => chip.count > 0)
}

export function ContactList({
  contacts,
  selectedId,
  view,
  query,
  onSelect,
  onToggleFavorite,
  onAdd,
  onClearSearch,
}: ContactListProps) {
  if (contacts.length === 0) {
    const isSearching = query.trim().length > 0
    return (
      <div className="list-empty">
        <div className="empty-illustration">
          {isSearching ? (
            <Search size={30} />
          ) : view === 'favorites' ? (
            <Star size={30} />
          ) : (
            <Users size={30} />
          )}
        </div>
        <h2>
          {isSearching
            ? '没有找到匹配的联系人'
            : view === 'favorites'
              ? '还没有收藏联系人'
              : '通讯录还是空的'}
        </h2>
        <p>
          {isSearching
            ? '试试姓名、公司、电话或备注中的其他关键词。'
            : view === 'favorites'
              ? '点击联系人卡片右上角的星标，把重要的人收藏到这里。'
              : '新建第一位联系人，或从 Excel 导入现有通讯录。'}
        </p>
        {isSearching ? (
          <button type="button" className="button button-quiet" onClick={onClearSearch}>
            清除搜索
          </button>
        ) : view === 'all' ? (
          <button type="button" className="button button-primary" onClick={onAdd}>
            <Plus size={16} />
            新建联系人
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="contact-list" role="list" aria-label="联系人列表">
      {contacts.map((contact) => {
        const phone = primaryPhone(contact)
        const email = primaryEmail(contact)
        const chips = methodChips(contact)
        return (
          <div
            key={contact.id}
            role="button"
            tabIndex={0}
            className={`contact-card ${selectedId === contact.id ? 'is-selected' : ''}`}
            onClick={() => onSelect(contact.id)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(contact.id)
              }
            }}
            aria-label={`查看 ${contact.name} 的联系人详情`}
            aria-current={selectedId === contact.id ? 'true' : undefined}
          >
            <Avatar name={contact.name} size="md" />
            <div className="contact-card-body">
              <div className="contact-card-heading">
                <strong>{contact.name}</strong>
                {contact.favorite && (
                  <Star className="inline-star" size={13} fill="currentColor" aria-label="已收藏" />
                )}
              </div>
              <p className="contact-card-role">
                {contact.jobTitle || '未填写职位'}
                {contact.company && (
                  <>
                    <span className="role-divider">·</span>
                    <Building2 size={12} />
                    {contact.company}
                  </>
                )}
              </p>
              <p className="contact-card-method">
                {phone ? (
                  <>
                    <Phone size={12} />
                    {phone}
                  </>
                ) : email ? (
                  <>
                    <Mail size={12} />
                    {email}
                  </>
                ) : (
                  <>
                    <UserRound size={12} />
                    暂无联系方式
                  </>
                )}
              </p>
              <div className="contact-card-footer">
                <div className="method-chips">
                  {chips.slice(0, 3).map((chip) => (
                    <span key={chip.label} className="method-chip">
                      {chip.label} {chip.count}
                    </span>
                  ))}
                </div>
                <span className="contact-updated">{formatRelativeDate(contact.updatedAt)}</span>
              </div>
            </div>
            <button
              type="button"
              className={`star-button ${contact.favorite ? 'is-favorite' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                onToggleFavorite(contact.id)
              }}
              aria-label={contact.favorite ? `取消收藏 ${contact.name}` : `收藏 ${contact.name}`}
              aria-pressed={contact.favorite}
              title={contact.favorite ? '取消收藏' : '加入收藏'}
            >
              <Star size={17} fill={contact.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
