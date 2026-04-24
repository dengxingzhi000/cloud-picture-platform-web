import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastKind = 'success' | 'error' | 'info' | 'warn'

export type Toast = {
  id: string
  message: string
  kind: ToastKind
  duration?: number
}

type ToastContextValue = {
  toasts: Toast[]
  addToast: (message: string, kind?: ToastKind, duration?: number) => void
  removeToast: (id: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const addToast = useCallback((message: string, kind: ToastKind = 'info', duration = 4000) => {
    const id = String(++nextId.current)
    setToasts((prev) => [...prev, { id, message, kind, duration }])
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

// ─── UI ───────────────────────────────────────────────────────────────────────

const KIND_STYLES: Record<ToastKind, { bg: string; color: string; border: string; icon: string }> = {
  success: { bg: 'rgba(31,138,112,0.95)', color: '#fff', border: 'rgba(31,138,112,0.3)', icon: '✓' },
  error:   { bg: 'rgba(200,60,40,0.95)',  color: '#fff', border: 'rgba(200,60,40,0.3)',  icon: '✕' },
  warn:    { bg: 'rgba(180,120,0,0.95)',   color: '#fff', border: 'rgba(180,120,0,0.3)',   icon: '⚠' },
  info:    { bg: 'rgba(30,30,30,0.92)',    color: '#fff', border: 'rgba(255,255,255,0.1)', icon: 'ℹ' },
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const style = KIND_STYLES[toast.kind]

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setVisible(true), 16)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 14,
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        maxWidth: 360,
        backdropFilter: 'blur(12px)',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
        cursor: 'pointer',
      }}
      onClick={() => onRemove(toast.id)}
    >
      <span style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.4, flexShrink: 0 }}>
        {style.icon}
      </span>
      <span style={{ fontSize: '0.88rem', lineHeight: 1.45, flex: 1 }}>
        {toast.message}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(toast.id) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'inherit', opacity: 0.65, fontSize: '1rem', lineHeight: 1,
          padding: 0, flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  )
}
