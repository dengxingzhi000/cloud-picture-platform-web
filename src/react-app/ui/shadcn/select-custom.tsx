import * as React from "react"
import { cn } from "./lib/utils"
import { ChevronDown, Check } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
}

export interface SelectCustomProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export const SelectCustom: React.FC<SelectCustomProps> = ({
  value,
  onChange,
  options,
  placeholder = "请选择...",
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // 点击外部关闭
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={cn("select-wrapper", className)} style={{ position: "relative" }}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="select-trigger"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "44px",
          padding: "0 16px",
          borderRadius: "12px",
          border: "1px solid var(--stroke-soft)",
          background: "linear-gradient(180deg, var(--bg-surface), var(--bg-elevated))",
          color: selectedOption ? "var(--ink-strong)" : "var(--ink-soft)",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s ease",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = "var(--accent)"
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 107, 47, 0.12)"
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = "var(--stroke-soft)"
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.04)"
          }
        }}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown
          size={18}
          style={{
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            color: "var(--ink-soft)",
          }}
        />
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div
          className="select-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "var(--bg-surface)",
            border: "1px solid var(--stroke-soft)",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(30, 20, 10, 0.12)",
            padding: "6px",
            maxHeight: "240px",
            overflowY: "auto",
            animation: "slideDown 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "none",
                  background: isSelected ? "rgba(239, 107, 47, 0.08)" : "transparent",
                  color: isSelected ? "var(--accent)" : "var(--ink-strong)",
                  fontSize: "14px",
                  fontWeight: isSelected ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "var(--bg-elevated)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "transparent"
                  }
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={16} style={{ color: "var(--accent)" }} />}
              </button>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
