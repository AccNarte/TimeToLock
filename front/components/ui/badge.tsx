import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center rounded-md border px-1.5 py-0.5",
    "text-[10px] uppercase tracking-wider font-medium w-fit whitespace-nowrap shrink-0",
    "[&>svg]:size-3 gap-1 [&>svg]:pointer-events-none",
    "transition-colors",
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          "border-[var(--cyan-neon)]/30 bg-[var(--cyan-neon)]/10 text-[var(--cyan-light)]",
        secondary:
          "border-[var(--glass-border)] bg-[var(--glass-surface)] text-[var(--text-secondary)]",
        destructive:
          "border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]",
        outline:
          "border-[var(--glass-border)] text-[var(--text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
