import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from './lib/utils'

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-[var(--stroke-soft)]',
        'data-[state=checked]:bg-[rgba(31,138,112,0.18)] data-[state=unchecked]:bg-white/70',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(239,107,47,0.35)]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow',
          'transition-transform data-[state=checked]:translate-x-5',
        )}
      />
    </SwitchPrimitive.Root>
  )
})
