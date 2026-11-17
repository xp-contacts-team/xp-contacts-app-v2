import { AlertTriangle, Trash2 } from 'lucide-react'
import type { Contact } from '../types'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  contact: Contact | null
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ contact, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <Modal
      open={contact !== null}
      title="删除联系人"
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="button button-danger" onClick={onConfirm}>
            <Trash2 size={15} />
            确认删除
          </button>
        </>
      }
    >
      {contact && (
        <div className="confirm-copy">
          <span className="confirm-icon">
            <AlertTriangle size={22} />
          </span>
          <div>
            <p>
              确定要删除 <strong>{contact.name}</strong> 吗？
            </p>
            <p className="confirm-hint">删除后无法撤销。建议先导出 Excel 做一份备份。</p>
          </div>
        </div>
      )}
    </Modal>
  )
}
