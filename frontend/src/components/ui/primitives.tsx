import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LifecycleStatus } from "@speckit-dashboard/shared";

/** Reusable design-system primitives (Principle II). */

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const styles =
    variant === "primary"
      ? "bg-brand text-white hover:bg-indigo-600"
      : "bg-transparent text-ink hover:bg-canvas border border-line";
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

const STATUS_STYLES: Record<LifecycleStatus, string> = {
  specified: "bg-slate-100 text-slate-700",
  clarified: "bg-sky-100 text-sky-700",
  planned: "bg-violet-100 text-violet-700",
  "tasks-generated": "bg-amber-100 text-amber-700",
  implementing: "bg-blue-100 text-blue-700",
  reviewed: "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status }: { status: LifecycleStatus }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
      aria-label={`Lifecycle status: ${status}`}
    >
      {status}
    </span>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-brand" />
      {label}…
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line p-6 text-center text-muted">
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="mt-1 text-sm">{children}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      role="alert"
    >
      {message}
    </div>
  );
}
