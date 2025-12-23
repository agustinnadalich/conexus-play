import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLockup } from "@/components/Brand";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { colors } from "@/styles/tokens";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

type LayoutProps = {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
  hideHeader?: boolean;
  /** Mostrar el botón de acceso rápido al dashboard. */
  showDashboardShortcut?: boolean;
};

export const AppLayout = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  sidebar,
  children,
  noPadding = false,
  hideHeader = false,
  showDashboardShortcut = true,
}: LayoutProps) => {
  const navigate = useNavigate();

  const content = (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl px-4",
        noPadding ? "py-0" : "py-6"
      )}
    >
      {sidebar ? (
        <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
          <aside className="app-card sticky top-28 h-fit rounded-2xl border-white/10 bg-white/5 p-4">
            {sidebar}
          </aside>
          <div className="space-y-6">{children}</div>
        </div>
      ) : (
        children
      )}
    </main>
  );

  return (
    <div className="min-h-screen bg-[#181E2F] text-slate-100" style={{ backgroundColor: colors.background }}>
      {!hideHeader && (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-[#1c2235]/95 via-[#1b2438]/95 to-[#1c2235]/95 backdrop-blur text-white">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            {showDashboardShortcut && (
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 shadow-sm transition hover:border-cyan-300/60 hover:text-white hover:shadow-cyan-500/15"
              >
                Dashboard
              </button>
            )}

            <BrandLockup variant="header" />

            <div className="flex-1 min-w-0">
              {breadcrumbs.length > 0 && (
                <nav className="mb-1 flex flex-wrap items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
                      {crumb.to ? (
                        <Link to={crumb.to} className="text-slate-200 hover:text-white">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-slate-300">{crumb.label}</span>
                      )}
                      {idx < breadcrumbs.length - 1 && <span className="text-slate-500">/</span>}
                    </span>
                  ))}
                </nav>
              )}

              {title && <h1 className="truncate text-xl font-bold text-white">{title}</h1>}
              {subtitle && <p className="truncate text-sm text-slate-300">{subtitle}</p>}
            </div>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>
      )}

      {content}
      <Toaster />
    </div>
  );
};

const Layout = (props: LayoutProps) => <AppLayout {...props} />;

export default Layout;
