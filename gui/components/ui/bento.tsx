'use client';

/**
 * Shared Bento UI kit — the single source of visual truth for every module.
 *
 * Design rules (brand: dark industrial minimalism):
 *  - Everything is neutral (zinc/neutral greys). No decorative colors.
 *  - Color is ONLY semantic: emerald = active/safe, amber = warning, red = danger/destructive confirm.
 *  - Blue is reserved for navigation/selection state (active tab, focused input), never for generic buttons.
 *  - Technical values (GHz, %, GB, ms, PIDs, paths, registry keys, CLI) use <Mono>.
 */

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronRight, Loader2, X, type LucideIcon } from 'lucide-react';

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ */
/* Page shell                                                          */
/* ------------------------------------------------------------------ */

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Right-aligned header controls (segmented tabs, refresh buttons...) */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Full-height page: compact header + body that fills the remaining viewport.
 * The body should be a CSS grid with `h-full` rows so the page never needs to scroll
 * on ≥ 1024×640 content areas. Below that the outer viewport scrolls as a fallback.
 */
export function PageShell({ title, subtitle, icon: Icon, actions, children, className }: PageShellProps) {
  return (
    <div className={cx('h-full min-h-[560px] flex flex-col gap-3', className)}>
      <header className="flex items-center justify-between gap-4 shrink-0 min-h-10">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-neutral-300" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-neutral-100 leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-neutral-500 leading-snug truncate">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bento card                                                          */
/* ------------------------------------------------------------------ */

interface BentoCardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Element rendered at the top-right of the header (Badge, StatusDot, Mono value...) */
  aside?: React.ReactNode;
  /** Pinned to the bottom of the card (usually buttons) */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Makes the whole card clickable (e.g. opens a DetailSheet sub-page) and shows a chevron */
  onClick?: () => void;
  as?: 'div' | 'section';
}

export function BentoCard({
  title,
  subtitle,
  icon: Icon,
  aside,
  footer,
  children,
  className,
  bodyClassName,
  onClick,
}: BentoCardProps) {
  const interactive = typeof onClick === 'function';
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
      className={cx(
        'bento-card p-4 flex flex-col gap-3 overflow-hidden',
        interactive && 'bento-card-interactive cursor-pointer group',
        className
      )}
    >
      {(title || Icon || aside) && (
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && <IconBox icon={Icon} />}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-semibold text-neutral-100 leading-snug">{title}</h3>}
              {subtitle && <p className="text-xs text-neutral-500 leading-snug mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {aside}
            {interactive && (
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 transition-colors" />
            )}
          </div>
        </div>
      )}
      {children !== undefined && <div className={cx('flex-1 min-h-0', bodyClassName)}>{children}</div>}
      {footer && <div className="shrink-0 flex items-center gap-2 flex-wrap">{footer}</div>}
    </div>
  );
}

export function IconBox({ icon: Icon, size = 'md' }: { icon: LucideIcon; size?: 'sm' | 'md' }) {
  return (
    <div
      className={cx(
        'rounded-lg bg-neutral-800/70 border border-neutral-700/50 flex items-center justify-center shrink-0',
        size === 'sm' ? 'w-7 h-7' : 'w-8 h-8'
      )}
    >
      <Icon className={cx('text-neutral-300', size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'secondary' | 'primary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

/**
 * - secondary (default): neutral grey — use for almost every action.
 * - primary: high-contrast monochrome (light on dark). Max ONE per page, for the main action.
 * - ghost: text-only, for tertiary actions.
 * - danger: only for irreversible/destructive confirmations.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading,
  block,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    secondary:
      'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-100 border border-neutral-700/60',
    primary: 'bg-neutral-100 hover:bg-white text-neutral-900 border border-neutral-100',
    ghost: 'bg-transparent hover:bg-neutral-800/60 text-neutral-300 hover:text-neutral-100 border border-transparent',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30',
  };
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors whitespace-nowrap',
        'disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-7 px-2.5 text-[11px]' : 'h-8 px-3 text-xs',
        block && 'w-full',
        variants[variant],
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
      ) : (
        Icon && <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      {children !== undefined && <span className="truncate">{children}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Small semantic atoms                                                */
/* ------------------------------------------------------------------ */

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  const tones: Record<Tone, string> = {
    neutral: 'bg-neutral-800/70 text-neutral-400 border-neutral-700/50',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 h-5 px-2 rounded-md text-[10px] font-medium border whitespace-nowrap',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ active, className }: { active: boolean; className?: string }) {
  return (
    <span
      className={cx(
        'inline-block w-1.5 h-1.5 rounded-full shrink-0',
        active ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-neutral-600',
        className
      )}
    />
  );
}

/** Technical value: GHz, %, GB, ms, PIDs, paths, registry keys, CLI commands. */
export function Mono({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx('font-mono tabular-nums', className)}>{children}</span>;
}

/** Big metric for stat cards (e.g. "71 MB", "32 GB"). */
export function Stat({ value, unit, label }: { value: React.ReactNode; unit?: string; label?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-1">
        <span className="font-mono tabular-nums text-xl font-semibold text-neutral-100 leading-none">{value}</span>
        {unit && <span className="font-mono text-xs text-neutral-500">{unit}</span>}
      </div>
      {label && <div className="text-[11px] text-neutral-500 mt-1 truncate">{label}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  loading,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || loading}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50',
        checked ? 'bg-emerald-500/80 border-emerald-400/40' : 'bg-neutral-800 border-neutral-700'
      )}
    >
      <span
        className={cx(
          'inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        )}
      >
        {loading && <Loader2 className="w-2.5 h-2.5 animate-spin text-neutral-500" />}
      </span>
    </button>
  );
}

/** Compact row used inside cards/sheets: label + description on the left, control on the right. */
export function SettingRow({
  title,
  description,
  control,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  control?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('bento-inner flex items-center justify-between gap-3 px-3 py-2', className)}>
      <div className="min-w-0">
        <div className="text-xs font-medium text-neutral-200 leading-snug">{title}</div>
        {description && <div className="text-[11px] text-neutral-500 leading-snug mt-0.5">{description}</div>}
      </div>
      {control && <div className="shrink-0">{control}</div>}
    </div>
  );
}

/** Segmented control for in-page sub-pages (tabs). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string; icon?: LucideIcon }>;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-neutral-900 border border-neutral-800">
      {options.map((o) => {
        const active = o.id === value;
        const Icon = o.icon;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cx(
              'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
              active ? 'bg-neutral-800 text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-200'
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail sheet (sub-page)                                             */
/* ------------------------------------------------------------------ */

interface DetailSheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Back-button label (translated by caller, e.g. t('common_back')) */
  backLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
}

/**
 * Sub-page that slides over the content area (below the titlebar, right of the sidebar rail).
 * Use it when a card has more content than fits: the card shows a summary and opens the sheet.
 * The sheet body scrolls internally if needed, the page itself never does.
 */
export function DetailSheet({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  backLabel,
  footer,
  children,
  width = 'lg',
}: DetailSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const widths = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 top-10 left-[72px] z-30 flex justify-end">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.aside
            className={cx(
              'relative h-full w-full flex flex-col bg-neutral-950 border-l border-neutral-800 shadow-2xl',
              widths[width]
            )}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-neutral-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/70 transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {backLabel}
                </button>
                {Icon && <IconBox icon={Icon} size="sm" />}
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-neutral-100 truncate">{title}</h2>
                  {subtitle && <p className="text-[11px] text-neutral-500 truncate">{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="px-5 py-3 border-t border-neutral-800 shrink-0 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Centered modal for short confirmations/forms (export, tutorials). */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cx(
              'relative w-full max-h-[85vh] flex flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl',
              widths[width]
            )}
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b border-neutral-800 shrink-0">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-neutral-100 leading-snug">{title}</h2>
                {subtitle && <p className="text-xs text-neutral-500 leading-snug mt-0.5">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-100 hover:bg-neutral-800/70 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="px-5 py-3 border-t border-neutral-800 shrink-0 flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Compact pagination (1, 2, 3 …) used by lists that must not scroll. */
export function Pager({
  page,
  total,
  onChange,
  prevLabel,
  nextLabel,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
  prevLabel: string;
  nextLabel: string;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {prevLabel}
      </Button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cx(
            'w-7 h-7 rounded-md text-[11px] font-mono tabular-nums transition-colors',
            p === page
              ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
              : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900'
          )}
        >
          {p}
        </button>
      ))}
      <Button size="sm" variant="ghost" disabled={page >= total} onClick={() => onChange(page + 1)}>
        {nextLabel}
      </Button>
    </div>
  );
}

export function EmptyState({ icon: Icon, text }: { icon?: LucideIcon; text: string }) {
  return (
    <div className="h-full min-h-24 flex flex-col items-center justify-center gap-2 text-center text-xs text-neutral-500">
      {Icon && <Icon className="w-5 h-5 text-neutral-600" />}
      {text}
    </div>
  );
}
