import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

type LayoutProps = {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  children: ReactNode;
  /** Cuando el contenido ya maneja su propio padding (ej: layouts con sidebar). */
  noPadding?: boolean;
  /** Oculta el header global para páginas que ya manejan su propio encabezado. */
  hideHeader?: boolean;
};

const Layout = ({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  children,
  noPadding = false,
  hideHeader = false,
}: LayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {!hideHeader && (
        <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <span className="text-base leading-none">←</span>
              Volver al dashboard
            </button>

            <div className="flex-1 min-w-0">
              {breadcrumbs.length > 0 && (
                <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1">
                      {crumb.to ? (
                        <Link to={crumb.to} className="font-medium text-slate-700 hover:text-slate-900">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-700">{crumb.label}</span>
                      )}
                      {idx < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
                    </span>
                  ))}
                </nav>
              )}

              {title && <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>}
              {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
            </div>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </header>
      )}

      <main
        className={cn(
          "mx-auto w-full max-w-7xl px-4",
          noPadding ? "py-0" : "py-6"
        )}
      >
        {children}
      </main>
      <Toaster />
    </div>
  );
};

export default Layout;
