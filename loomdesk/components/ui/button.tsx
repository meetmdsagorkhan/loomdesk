import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Button Component Usage Guidelines:
 * - default: Primary action buttons (submit, confirm, main CTA)
 * - outline: Secondary actions, less prominent CTAs
 * - secondary: Alternative actions, cancel buttons
 * - ghost: Minimal actions, icon-only buttons
 * - destructive: Destructive actions (delete, remove)
 * - success: Success states, confirmations
 * - warning: Warning states, caution
 * - info: Informational actions
 * - gradient: Special emphasis, featured actions
 * - link: Text-only actions, navigation links
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "btn-primary border-white/20 text-primary-foreground",
        outline:
          "glass-pill bg-transparent hover:bg-muted/40 hover:text-foreground aria-expanded:bg-muted/40 aria-expanded:text-foreground",
        secondary:
          "btn-secondary bg-secondary/75 text-secondary-foreground hover:bg-secondary/90 aria-expanded:bg-secondary/90 aria-expanded:text-secondary-foreground",
        ghost:
          "glass-pill bg-transparent hover:bg-muted/40 hover:text-foreground aria-expanded:bg-muted/40 aria-expanded:text-foreground",
        destructive:
          "glass-pill bg-destructive/20 text-destructive hover:bg-destructive/25 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        success:
          "glass-pill bg-success/80 text-success-foreground hover:bg-success/90 focus-visible:border-success/40 focus-visible:ring-success/20",
        warning:
          "glass-pill bg-warning/80 text-warning-foreground hover:bg-warning/90 focus-visible:border-warning/40 focus-visible:ring-warning/20",
        info:
          "glass-pill bg-info/80 text-info-foreground hover:bg-info/90 focus-visible:border-info/40 focus-visible:ring-info/20",
        gradient:
          "btn-primary bg-gradient-to-r from-primary via-primary-light to-info text-primary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-lg px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8 rounded-xl",
        "icon-xs":
          "size-6 rounded-lg in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-lg in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9 rounded-xl",
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
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
