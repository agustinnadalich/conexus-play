// src/components/layout/Layout.tsx
import { ReactNode } from "react"

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#181E2F] text-slate-100">
      <header className="p-4 border-b border-white/10 bg-[#1c2235] shadow-sm">VideoAnalysis</header>
      <main className="p-6">{children}</main>
    </div>
  )
}
