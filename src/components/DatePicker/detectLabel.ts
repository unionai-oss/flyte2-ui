/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { isQuickRangeItem, type QuickRange } from './quickRanges'

export const detectQuickRangeLabel = (
  range: DateRange | undefined,
  quickRanges: QuickRange[],
  fallbackLabel: string,
): string => {
  if (!range?.from || !range?.to) return fallbackLabel

  const { from, to } = range

  const isMidnight = (d: Date) => d.getHours() === 0 && d.getMinutes() === 0
  const fromFmt = isMidnight(from) ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm'
  const toFmt = isMidnight(to) ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm'

  // Use a shared fmt for quick range matching (with time if either bound has time)
  const hasTimeComponent = !isMidnight(from) || !isMidnight(to)
  const fmt = hasTimeComponent ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd'

  const fromStr = format(from, fmt)
  const toStr = format(to, fmt)

  for (const qr of quickRanges) {
    if (!isQuickRangeItem(qr)) continue
    const { filterLabel, getRange } = qr
    const preset = getRange()
    if (!preset.from || !preset.to) continue

    const pf = format(preset.from, fmt)
    const pt = format(preset.to, fmt)

    if (pf === fromStr && pt === toStr) {
      return filterLabel
    }
  }

  return `${format(from, fromFmt)} to ${format(to, toFmt)}`
}
