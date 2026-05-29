import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium",
    "transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0",
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--cyan-light)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
    "aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary — solid indigo, no glow
        default: "bg-[var(--cyan-neon)] text-white hover:bg-[var(--cyan-dark)]",
        // Destructive — solid red, used for irreversible actions
        destructive: "bg-[var(--error)] text-white hover:bg-[var(--error)]/90",
        // Outline — transparent with hairline border, subtle hover
        outline:
          "border border-[var(--glass-border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--glass-surface)] hover:border-[var(--glass-border)]",
        // Secondary — filled neutral slate
        secondary:
          "bg-[var(--glass-surface)] text-[var(--foreground)] border border-[var(--glass-border)]/60 hover:bg-[var(--glass-surface)]/70",
        // Ghost — no background until hover
        ghost: "text-[var(--text-secondary)] hover:bg-[var(--glass-surface)] hover:text-white",
        // Link — inline underlined link
        link: "text-[var(--cyan-light)] underline-offset-4 hover:underline px-0 h-auto",
      },
      size: {
        default: "h-9 px-3.5 has-[>svg]:px-3",
        sm: "h-7 rounded gap-1.5 px-2.5 text-[12px] has-[>svg]:px-2",
        lg: "h-10 rounded-md px-5 has-[>svg]:px-4 text-sm",
        icon: "size-9",
        "icon-sm": "size-7",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
