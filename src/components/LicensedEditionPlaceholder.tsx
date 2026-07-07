/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { ChartIcon } from '@/components/icons/ChartIcon'
import {
  getLicensedEditionInfoUrl,
  type LicensedEditionUpgradeSource,
} from '@/lib/constants'
import Link from 'next/link'

interface LicensedEditionPlaceholderProps {
  /** Section title, e.g. "Users", "OAuth Apps", "Policies", "Roles" */
  title: string
  /** Tracking source appended as `?source=` on the upgrade link. */
  source: LicensedEditionUpgradeSource
  /** When true, card fills container width */
  fullWidth?: boolean
  /** When true, no border or shadow (e.g. formatted view inside tab sections). */
  hideBorder?: boolean
}

/**
 * Placeholder for user management features (licensed edition).
 * Light mode: white card, gray icon/text, "Upgrade" link.
 */
export function LicensedEditionPlaceholder({
  title,
  source,
  fullWidth,
  hideBorder,
}: LicensedEditionPlaceholderProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl bg-white px-10 py-12 text-center ${
        fullWidth ? 'min-h-[200px] w-full min-w-0' : ''
      } ${hideBorder ? '' : 'border border-(--system-gray-3) shadow-sm'}`}
    >
      <div className="flex items-center justify-center gap-2">
        <ChartIcon
          className="size-5 shrink-0 text-(--system-gray-5)"
          aria-hidden
        />
        <span className="text-base font-medium text-(--system-gray-7)">
          {title}
        </span>
      </div>
      <p className="mt-1 text-sm text-(--system-gray-5)">
        Available in the licensed edition
      </p>
      <Link
        href={getLicensedEditionInfoUrl(source)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-sm font-medium text-(--union) underline underline-offset-2 hover:no-underline"
      >
        Upgrade
      </Link>
    </div>
  )
}
