import { useMemo, useState, type FormEvent } from 'react'
import { AtSign, Mail, MapPin, Phone, Plus, Star, Trash2 } from 'lucide-react'
import type { Contact, ContactInput, ContactMethod, ContactMethodKind } from '../types'
import { METHOD_KINDS } from '../types'
import { METHOD_META } from '../lib/labels'
import { contactToInput } from '../lib/contacts'
import { makeId } from '../lib/id'
import { Avatar } from './Avatar'
import { Modal } from './Modal'

const METHOD_ICONS: Record<ContactMethodKind, typeof Phone> = {
  phone: Phone,
  email: Mail,
  social: AtSign,
  address: MapPin,
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function blankInput(): ContactInput {
  return {
    name: '',
    company: '',
    jobTitle: '',
    notes: '',
    favorite: false,
    methods: [
      {
        id: makeId('method'),
        kind: 'phone',
        label: METHOD_META.phone.defaultLabel,
        value: '',
      },
    ],
  }
}

interface ContactFormProps {
  open: boolean
  mode: 'create' | 'edit'
  contact?: Contact | null
  onClose: () => void
  onSubmit: (input: ContactInput) => void
}

export function ContactForm({ open, mode, contact, onClose, onSubmit }: ContactFormProps) {
  const [draft, setDraft] = useState<ContactInput>(() =>
    contact ? contactToInput(contact) : blankInput(),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const methodCounts = useMemo(() => {
    const counts: Record<ContactMethodKind, number> = { phone: 0, email: 0, social: 0, address: 0 }
    for (const method of draft.methods) counts[method.kind] += 1
    return counts
  }, [draft.methods])

  const setField = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const updateMethod = (id: string, patch: Partial<ContactMethod>) => {
    setDraft((current) => ({
      ...current,
      methods: current.methods.map((method) =>
        method.id === id ? { ...method, ...patch } : method,
      ),
    }))
  }

  const addMethod = (kind: ContactMethodKind) => {
    setDraft((current) => ({
      ...current,
      methods: [
        ...current.methods,
        {
          id: makeId('method'),
          kind,
          label: METHOD_META[kind].defaultLabel,
          value: '',
        },
      ],
    }))
  }

  const removeMethod = (id: string) => {
    setDraft((current) => ({
      ...current,
      methods: current.methods.filter((method) => method.id !== id),
    }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}

    if (!draft.name.trim()) {
      nextErrors.name = '请填写联系人姓名。'
    }

    for (const method of draft.methods) {
      if (
        method.kind === 'email' &&
        method.value.trim() &&
        !EMAIL_PATTERN.test(method.value.trim())
      ) {
        nextErrors[`method-${method.id}`] = '请输入有效的邮箱地址，例如 name@example.com。'
      }
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const cleaned: ContactInput = {
      ...draft,
      name: draft.name.trim(),
      company: draft.company.trim(),
      jobTitle: draft.jobTitle.trim(),
      notes: draft.notes.trim(),
      methods: draft.methods
        .filter((method) => method.value.trim())
        .map((method) => ({
          ...method,
          label: method.label.trim() || METHOD_META[method.kind].defaultLabel,
          value: method.value.trim(),
        })),
    }
    onSubmit(cleaned)
  }

  return (
    <Modal
      open={open}
      title={mode === 'create' ? '新建联系人' : '编辑联系人'}
      description={
        mode === 'create'
          ? '一个联系人可以保存多条电话、邮箱、社交账号与地址。'
          : '修改后的信息会立即保存，并同步到云端 SQLite。'
      }
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="contact-form" className="button button-primary">
            {mode === 'create' ? '创建联系人' : '保存修改'}
          </button>
        </>
      }
    >
      <form id="contact-form" className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="form-identity">
          <Avatar name={draft.name || '?'} size="lg" />
          <div className="form-identity-copy">
            <label className="field">
              <span className="field-label">
                姓名 <em>*</em>
              </span>
              <input
                className={`input ${errors.name ? 'has-error' : ''}`}
                value={draft.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="如：陈思远"
                data-autofocus
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <span className="field-error" id="name-error">
                  {errors.name}
                </span>
              )}
            </label>
            <div className="form-row">
              <label className="field">
                <span className="field-label">公司</span>
                <input
                  className="input"
                  value={draft.company}
                  onChange={(event) => setField('company', event.target.value)}
                  placeholder="如：星澜科技"
                />
              </label>
              <label className="field">
                <span className="field-label">职位</span>
                <input
                  className="input"
                  value={draft.jobTitle}
                  onChange={(event) => setField('jobTitle', event.target.value)}
                  placeholder="如：产品总监"
                />
              </label>
            </div>
          </div>
        </div>

        <label className={`favorite-toggle ${draft.favorite ? 'is-on' : ''}`}>
          <input
            type="checkbox"
            checked={draft.favorite}
            onChange={(event) => setField('favorite', event.target.checked)}
          />
          <span className="switch-track" aria-hidden="true">
            <span className="switch-thumb">
              <Star size={12} fill={draft.favorite ? 'currentColor' : 'none'} />
            </span>
          </span>
          <span className="favorite-toggle-copy">
            <strong>加入收藏</strong>
            <small>收藏后会出现在侧边栏的「我的收藏」中，方便快速找到。</small>
          </span>
        </label>

        <div className="form-methods">
          <div className="form-section-heading">
            <div>
              <h3>联系方式</h3>
              <p>同一类型可添加多条，例如「工作」和「个人」邮箱。</p>
            </div>
            <span className="form-section-total">{draft.methods.length} 项</span>
          </div>

          {METHOD_KINDS.map((kind) => {
            const methods = draft.methods.filter((method) => method.kind === kind)
            const Icon = METHOD_ICONS[kind]
            const meta = METHOD_META[kind]
            return (
              <div className={`method-editor-group method-editor-${kind}`} key={kind}>
                <div className="method-editor-heading">
                  <span className="method-editor-title">
                    <span className="method-editor-icon">
                      <Icon size={15} />
                    </span>
                    {meta.title}
                    <span className="method-editor-count">{methodCounts[kind]}</span>
                  </span>
                  <button
                    type="button"
                    className="button button-small button-ghost"
                    onClick={() => addMethod(kind)}
                  >
                    <Plus size={14} />
                    {meta.addLabel}
                  </button>
                </div>

                {methods.length === 0 ? (
                  <p className="method-editor-empty">尚未添加{meta.title}。</p>
                ) : (
                  <div className="method-editor-rows">
                    {methods.map((method) => (
                      <div className="method-editor-row" key={method.id}>
                        <input
                          className="input method-label-input"
                          value={method.label}
                          onChange={(event) =>
                            updateMethod(method.id, { label: event.target.value })
                          }
                          placeholder={meta.labelPlaceholder}
                          aria-label={`${meta.title}标签`}
                        />
                        <input
                          className={`input method-value-input ${errors[`method-${method.id}`] ? 'has-error' : ''}`}
                          value={method.value}
                          onChange={(event) =>
                            updateMethod(method.id, { value: event.target.value })
                          }
                          placeholder={meta.valuePlaceholder}
                          aria-label={`${meta.title}内容`}
                          type={meta.valueType === 'tel' ? 'tel' : meta.valueType}
                          aria-invalid={Boolean(errors[`method-${method.id}`])}
                        />
                        <button
                          type="button"
                          className="icon-button icon-button-subtle"
                          onClick={() => removeMethod(method.id)}
                          aria-label={`删除这条${meta.title}`}
                          title="删除"
                        >
                          <Trash2 size={15} />
                        </button>
                        {errors[`method-${method.id}`] && (
                          <span className="field-error method-error">
                            {errors[`method-${method.id}`]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <label className="field notes-field">
          <span className="field-label">备注</span>
          <textarea
            className="input textarea"
            value={draft.notes}
            onChange={(event) => setField('notes', event.target.value)}
            placeholder="记录生日、共同经历、沟通偏好，或任何想记住的事……"
            rows={3}
          />
        </label>
      </form>
    </Modal>
  )
}
