/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { type ReactNode } from 'react'

import clsx from 'clsx'

export interface BannerShellProps {
  /** Left-aligned content (icon, text, badges, …). */
  children: ReactNode
  /** Right-aligned actions (buttons). Omit for a content-only banner. */
  actions?: ReactNode
  /**
   * Variant + spacing classes supplied by the caller (border color, background,
   * text color, padding, margins, gap). Kept caller-controlled so each banner
   * keeps its own look — e.g. ErrorBanner's red, PausedRunsBanner's yellow.
   */
  className?: string
}

/**
 * Presentational shell for inline, accent-colored banners: a rounded bordered
 * container that lays out left content and trailing actions on a single row.
 *
 * Only the structural skeleton is shared; all colors and spacing come from
 * `className`, so this introduces no opinion on the banner's variant.
 */
export const BannerShell = ({
  children,
  actions,
  className,
}: BannerShellProps) => (
  <div
    className={clsx(
      'flex items-center justify-between rounded-2xl border',
      className,
    )}
  >
    {children}
    {actions}
  </div>
)
