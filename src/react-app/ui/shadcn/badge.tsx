import * as React from 'react'
import { cn } from './lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'info' | 'accent'

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-[rgba(32,26,22,0.07)] text-[var(--ink-soft)]',
    success: 'bg-[rgba(31,138,112,0.14)] text-[#116350]',
    warning: 'bg-[rgba(241,162,8,0.18)] text-[#8a5c00]',
    info: 'bg-[rgba(255,255,255,0.75)] text-[var(--ink-soft)] border border-[var(--stroke-soft)]',
    accent: 'bg-[rgba(239,107,47,0.12)] text-[var(--ink-strong)] border border-[rgba(239,107,47,0.3)]',
  }

  return (
    <span
      className={cn('inline-flex items-center rounded-full px-3 py-1 text-[0.75rem] font-extrabold', variants[variant], className)}
      {...props}
    />
  )
}
