/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import type { LicensedEditionUpgradeSource } from '@/lib/constants'
import { LicensedEditionPlaceholder } from '../LicensedEditionPlaceholder'

/** Placeholder for advanced metrics (licensed edition). Uses shared LicensedEditionPlaceholder with "Advanced metrics" title. */
export function AdvancedMetricsPlaceholder({
  source,
}: {
  source: LicensedEditionUpgradeSource
}) {
  return (
    <LicensedEditionPlaceholder
      fullWidth
      title="Advanced metrics"
      source={source}
    />
  )
}
