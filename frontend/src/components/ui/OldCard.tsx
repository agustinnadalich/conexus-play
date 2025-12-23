import { ReactNode } from 'react'

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_12px_30px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition-all duration-200 overflow-hidden backdrop-blur-sm text-slate-100">
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children }: { children: ReactNode }) {
  return <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/10 to-white/[0.08]">{children}</div>
}

Card.Content = function CardContent({ children }: { children: ReactNode }) {
  return <div className="px-6 py-4 space-y-2">{children}</div>
}

Card.Footer = function CardFooter({ children }: { children: ReactNode }) {
  return <div className="px-6 py-4 border-t border-white/10 bg-white/[0.06]">{children}</div>
}
