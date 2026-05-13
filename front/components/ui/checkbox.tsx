"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 shrink-0 rounded border border-glass-border bg-dark-blue-lighter",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-neon/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-dark-blue",
            "peer-checked:bg-cyan-neon peer-checked:border-cyan-neon",
            "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
            "transition-colors cursor-pointer flex items-center justify-center",
            className
          )}
          onClick={() => {
            const input = ref && 'current' in ref ? ref.current : null;
            if (input) {
              input.click();
            }
          }}
        >
          {checked && <Check className="h-3 w-3 text-dark-blue stroke-[3]" />}
        </div>
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
