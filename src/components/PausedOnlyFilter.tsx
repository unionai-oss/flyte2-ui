/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'

interface PausedOnlyFilterProps {
  /** Whether the "Paused only" filter is currently applied. */
  isActive: boolean
  /** Called with the next desired state when the pill or its clear button is clicked. */
  onToggle: (next: boolean) => void
}

/**
 * Filter pill for the runs list that restricts results to runs waiting for a
 * signal (an action in the PAUSED phase). Unlike the other filters this is a
 * plain on/off toggle rather than a dropdown — clicking the pill (or its ✕ when
 * active) flips the state. Styled to match `FilterButton`'s active/inactive
 * appearance.
 */
export const PausedOnlyFilter = ({
  isActive,
  onToggle,
}: PausedOnlyFilterProps) => (
  <span
    role="group"
    className="inline-flex h-6 items-center overflow-hidden rounded-lg border-[1.5px] border-(--system-gray-3)"
  >
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => onToggle(!isActive)}
      className={clsx(
        'flex cursor-pointer items-center gap-1 px-2 py-0.5 select-none',
        'text-xs font-medium transition-colors focus-visible:outline-none',
        isActive
          ? 'text-(--system-white)'
          : 'text-(--accent-gray) dark:text-(--system-gray-6)',
      )}
    >
      Paused only
    </button>

    {isActive && (
      <button
        type="button"
        aria-label="Clear paused only filter"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(false)
        }}
        className="flex cursor-pointer items-center px-1.5 py-0.5 text-(--system-white) transition-colors focus-visible:outline-none"
      >
        <XMarkIcon width={14} aria-hidden="true" />
      </button>
    )}
  </span>
)
