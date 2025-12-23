import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

// ... definición de variantes y componente Button



const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-sm",
  {
    variants: {
      variant: {
        default:
          "bg-[#4FD1E5] text-slate-950 shadow-[0_12px_30px_rgba(79,209,229,0.25)] hover:bg-cyan-300 hover:shadow-[0_16px_40px_rgba(79,209,229,0.28)]",
        destructive:
          "bg-red-500/90 text-white shadow-[0_12px_28px_rgba(248,113,113,0.35)] hover:bg-red-500",
        outline:
          "border border-white/15 bg-transparent text-slate-100 hover:border-cyan-200/60 hover:bg-white/5",
        secondary:
          "border border-white/10 bg-white/5 text-slate-100 hover:border-cyan-200/30 hover:bg-white/10",
        ghost: "text-slate-200 hover:bg-white/5",
        link: "text-[#4FD1E5] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6",
        icon: "h-10 w-10",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
