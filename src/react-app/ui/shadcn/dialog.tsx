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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
      className={cn(
        "relative z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg",
        className
      )}
    >
      {children}
    </div>
  )
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>
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
