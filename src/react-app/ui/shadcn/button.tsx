import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "./lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#ef6b2f] text-white shadow-md hover:bg-[#d6571f] hover:shadow-lg focus-visible:ring-[#ef6b2f]",
        destructive:
          "bg-[#c84c2b] text-white shadow-sm hover:bg-[#a83d23] focus-visible:ring-[#c84c2b]",
        outline:
          "border border-[#ef6b2f]/30 bg-transparent hover:bg-[#ef6b2f]/8 hover:text-[#ef6b2f] focus-visible:ring-[#ef6b2f]",
        secondary:
          "bg-[#1f8a70]/10 text-[#1f8a70] shadow-sm hover:bg-[#1f8a70]/20 focus-visible:ring-[#1f8a70]",
        ghost: "hover:bg-[#ef6b2f]/8 hover:text-[#ef6b2f]",
        link: "text-[#ef6b2f] underline-offset-4 hover:underline",
        plain: "bg-transparent hover:bg-[#ef6b2f]/8 text-[#201a16] dark:text-[#e8e0d8] dark:hover:bg-[#ef6b2f]/15",
        danger: "bg-[#c84c2b] text-white hover:bg-[#a83d23] shadow-sm",
        primary: "bg-[#ef6b2f] text-white hover:bg-[#d6571f] shadow-md hover:shadow-lg",
      },
      size: {
        default: "h-9 px-4 py-2 rounded-xl",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
