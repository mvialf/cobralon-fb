
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        primary: 
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        complete:
          "border-transparent bg-[hsl(var(--complete))] text-[hsl(var(--complete-foreground))] hover:bg-[hsl(var(--complete))]/80",
        orange:
          "border-transparent bg-[hsl(var(--orange))] text-[hsl(var(--orange-foreground))] hover:bg-[hsl(var(--orange))]/80",
        brown:
          "border-transparent bg-[hsl(var(--brown))] text-[hsl(var(--brown-foreground))] hover:bg-[hsl(var(--brown))]/80",
        sky:
          "border-transparent bg-[hsl(var(--Sky))] text-[hsl(var(--Sky-foreground))] hover:bg-[hsl(var(--Sky))]/80",
        yellow:
          "border-transparent bg-[hsl(var(--yellow))] text-[hsl(var(--yellow-foreground))] hover:bg-[hsl(var(--yellow))]/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
