import * as React from "react"
import { cn } from "./lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        backdropFilter: 'blur(4px)',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onOpenChange) {
          onOpenChange(false)
        }
      }}
    >
      {children}
    </div>
  )
}

interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => {
  return (
    <div
      className={cn("animate-in", className)}
      style={{
        position: 'relative',
        width: 'auto',
        minWidth: '320px',
        maxWidth: 'min(560px, calc(100vw - 40px))',
        maxHeight: '90vh',
        height: 'auto',
        background: 'var(--bg-surface)',
        border: '1px solid var(--stroke-soft)',
        borderRadius: '20px',
        boxShadow: '0 24px 60px rgba(30,20,10,0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '24px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => {
  return (
    <div 
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      style={{
        marginBottom: '8px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--stroke-soft)',
      }}
    >
      {children}
    </div>
  )
}

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid var(--stroke-soft)',
        gap: '12px',
      }}
    >
      {children}
    </div>
  )
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => {
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      style={{
        fontFamily: "'Space Grotesk', 'IBM Plex Sans', sans-serif",
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--ink-strong)',
      }}
    >
      {children}
    </h2>
  )
}

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
}
