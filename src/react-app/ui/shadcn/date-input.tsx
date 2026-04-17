import * as React from 'react'
import { cn } from './lib/utils'

export type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  type?: 'date' | 'datetime-local' | 'time'
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
  { className, type = 'date', ...props },
  ref,
) {
  return (
    <div className="date-input-wrap">
      <input
        ref={ref}
        type={type}
        className={cn(
          'date-input',
          'h-11 w-full rounded-[14px] border border-[var(--stroke-soft)] bg-white/90 px-3 text-[0.95rem] text-[var(--ink-strong)]',
          'outline-none transition-shadow focus:border-[rgba(239,107,47,0.55)] focus:shadow-[0_0_0_4px_rgba(239,107,47,0.12)]',
          className,
        )}
        {...props}
      />
    </div>
  )
})
