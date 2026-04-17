import * as React from 'react'
import { cn } from './lib/utils'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-[14px] border border-[var(--stroke-soft)] bg-white/90 px-3 py-2 text-[0.95rem] text-[var(--ink-strong)]',
        'outline-none transition-shadow focus:border-[rgba(239,107,47,0.55)] focus:shadow-[0_0_0_4px_rgba(239,107,47,0.12)]',
        'min-h-[96px] resize-y',
        className,
      )}
      {...props}
    />
  )
})
