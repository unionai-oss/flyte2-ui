/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { Tooltip } from '@/components/Tooltip'
import {
  getLicensedEditionInfoUrl,
  type LicensedEditionUpgradeSource,
} from '@/lib/constants'
import Link from 'next/link'

const LICENSED_EDITION_TOOLTIP_CLASS =
  '!bg-(--system-gray-2) !text-(--system-gray-7) px-3 py-2 text-sm font-normal border border-(--system-gray-3)'

function getLicensedEditionTooltipContent(
  source: LicensedEditionUpgradeSource,
) {
  return (
    <>
      Available in the licensed edition.{' '}
      <Link
        href={getLicensedEditionInfoUrl(source)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-(--union) underline underline-offset-2 hover:no-underline"
        onClick={(e) => e.stopPropagation()}
      >
        Upgrade →
      </Link>
    </>
  )
}

interface DisabledButtonWithTooltipProps {
  children: React.ReactNode
  source: LicensedEditionUpgradeSource
}

/**
 * Wraps a disabled button so it still shows a hover tooltip
 * (disabled elements may not receive pointer events).
 */
export function DisabledButtonWithTooltip({
  children,
  source,
}: DisabledButtonWithTooltipProps) {
  return (
    <Tooltip
      content={getLicensedEditionTooltipContent(source)}
      contentClassName={LICENSED_EDITION_TOOLTIP_CLASS}
      placement="bottom"
    >
      <span className="inline-block cursor-not-allowed" aria-disabled>
        {children}
      </span>
    </Tooltip>
  )
}
