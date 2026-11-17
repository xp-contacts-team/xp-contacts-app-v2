import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import type { ToastMessage } from '../types'

interface ToastProps {
  toast: ToastMessage | null
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null
  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info
  return (
    <div className={`toast toast-${toast.tone}`} role="status" aria-live="polite">
      <Icon size={17} />
      <span>{toast.text}</span>
    </div>
  )
}
