/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */
'use client'

import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon'
import { RefreshIcon } from '@/components/icons/RefreshIcon'
import { PopoverMenu } from '@/components/Popovers'
import { Tooltip } from '@/components/Tooltip'
import clsx from 'clsx'

import {
  REPORT_REFRESH_INTERVALS,
  type ReportRefreshInterval,
} from './reportRefreshIntervalStorage'

export type { ReportRefreshInterval }

export type ReportRefreshSplitButtonProps = {
  onRefresh: () => void
  className?: string
  refreshInterval: ReportRefreshInterval
  onRefreshIntervalChange: (value: ReportRefreshInterval) => void
}

export function ReportRefreshSplitButton({
  onRefresh,
  className,
  refreshInterval,
  onRefreshIntervalChange,
}: ReportRefreshSplitButtonProps) {
  const intervalValue: ReportRefreshInterval = refreshInterval ?? 'off'
  const selectedInterval =
    REPORT_REFRESH_INTERVALS.find((i) => i.value === intervalValue) ??
    REPORT_REFRESH_INTERVALS[0]

  return (
    <div
      className={clsx(
        'inline-flex h-[22px] items-stretch overflow-hidden rounded-lg border border-(--system-gray-5)',
        'text-[13px] leading-[14px] font-medium tracking-[0.1px] text-(--system-gray-5)',
        '[&_button]:text-[13px] [&_button]:leading-[14px] [&_button]:font-medium [&_button]:tracking-[0.1px]',
        '[&_button]:text-(--system-gray-5)',
        '[&_svg]:shrink-0 [&_svg]:text-[inherit]',
        className,
      )}
    >
      <Tooltip content="Refresh report" placement="bottom">
        <button
          type="button"
          aria-label="Refresh report"
          onClick={() => onRefresh()}
          className={clsx(
            'inline-flex h-full min-h-0 cursor-pointer items-center gap-2 px-2 py-0 transition-colors',
            'hover:bg-(--system-gray-3) hover:!text-(--system-white)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--union)',
          )}
        >
          <RefreshIcon className="size-2.5 shrink-0" />
          <span>Refresh</span>
        </button>
      </Tooltip>

      <div className="w-px shrink-0 bg-(--system-gray-5)" aria-hidden />

      <PopoverMenu
        placement="bottom-end"
        size="sm"
        showCheckboxes={false}
        noSelectedBackground
        showChevron={false}
        menuClassName="min-w-36 py-1"
        itemClassName={clsx(
          'cursor-pointer py-2.5 text-[13px] font-medium leading-[14px]',
          'text-(--system-gray-5) hover:!bg-(--system-gray-3) hover:!text-(--system-white)',
        )}
        items={REPORT_REFRESH_INTERVALS.map((interval) => ({
          id: interval.value,
          label: interval.label,
          selected: interval.value === intervalValue,
          onClick: () => onRefreshIntervalChange(interval.value),
        }))}
      >
        <button
          type="button"
          aria-label="Auto-refresh interval"
          className={clsx(
            'inline-flex h-full min-h-0 cursor-pointer items-center gap-1 px-2 py-0 transition-colors',
            'hover:bg-(--system-gray-3) hover:!text-(--system-white)',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--union)',
          )}
        >
          <span>{selectedInterval.label}</span>
          <ChevronDownIcon className="size-3" />
        </button>
      </PopoverMenu>
    </div>
  )
}
