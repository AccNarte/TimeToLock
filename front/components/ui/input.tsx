import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base: hairline border, slate-tinted surface, monospace numerals don't shift width
        "h-9 w-full min-w-0 rounded-md border border-[var(--glass-border)] bg-[var(--glass-surface)]/40",
        "px-3 py-1 text-sm text-[var(--foreground)]",
        "placeholder:text-[var(--text-muted)] selection:bg-[var(--cyan-neon)]/30",
        "transition-colors outline-none",
        // File input
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--foreground)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Focus — subtle indigo ring, not the 3px shadcn default
        "focus-visible:border-[var(--cyan-light)] focus-visible:ring-1 focus-visible:ring-[var(--cyan-light)]/40",
        // Invalid
        "aria-invalid:border-[var(--error)] aria-invalid:ring-1 aria-invalid:ring-[var(--error)]/30",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
