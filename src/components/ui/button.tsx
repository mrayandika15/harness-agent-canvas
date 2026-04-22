"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border text-sm font-semibold tracking-[-0.02em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-[rgba(217,134,75,0.4)] bg-[rgba(82,38,14,0.58)] text-[var(--foreground)] hover:bg-[rgba(110,49,19,0.75)]",
        secondary:
          "border-[var(--border)] bg-[rgba(255,255,255,0.03)] text-[var(--foreground)] hover:bg-[rgba(255,255,255,0.08)]",
        ghost:
          "border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]",
      },
      size: {
        default: "px-5 py-3",
        icon: "h-16 w-16 p-0",
        sm: "px-3 py-2",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
