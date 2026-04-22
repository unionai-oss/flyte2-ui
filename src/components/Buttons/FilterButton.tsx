/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { XMarkIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import React from 'react'
import { ChevronDownIcon } from '../icons/ChevronDownIcon'

export type FilterButtonProps = {
  /** Label displayed before any selected values (e.g. "Status", "Users"). */
  label: React.ReactNode
  /** Whether the attached popover/dropdown is currently open. Controls chevron rotation. */
  isOpen: boolean
  /** Total number of selected values. Controls whether values or chevron are shown. */
  valuesCount: number
  /** Rendered selected values to display inline (first `maxDisplayedValues`). */
  displayedValues: React.ReactNode
  /** Max values shown before "and N others" overflow text. Defaults to 3. */
  maxDisplayedValues?: number
  /** Called when the ✕ clear button is clicked. */
  onClearClick: (e: React.MouseEvent) => void
  showChevron?: boolean
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

/**
 * FilterButton renders as a `<span>` wrapper containing two sibling `<button>` elements:
 *   1. The trigger button — opens/closes the attached popover.
 *   2. The clear button (when values are selected) — clears without opening the popover.
 *
 * The `<span>` wrapper receives the Popover's `ref` and interaction props (via
 * `React.cloneElement`). Clicks on the trigger button bubble up to the span, which
 * activates the Popover. Clicks on the clear button call `stopPropagation` so the
 * Popover is not toggled.
 *
 * `aria-expanded` and `aria-haspopup` are forwarded from the span (set by Popover) to
 * the inner trigger button so screen readers see the correct state on the focused element.
 */
export function FilterButton({
  label,
  isOpen,
  valuesCount,
  displayedValues,
  maxDisplayedValues = 3,
  onClearClick,
  showChevron = true,
  disabled,
  className,
  ref,
  ...rest
}: FilterButtonProps & { ref?: React.Ref<HTMLSpanElement> }) {
  const hasValues = valuesCount > 0
  const otherValuesCount = Math.max(0, valuesCount - maxDisplayedValues)

  // Extract ARIA state props that Popover injects via cloneElement so we can forward
  // them to the inner trigger button (the element screen readers actually focus).
  const {
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHaspopup,
    ...spanRest
  } = rest as typeof rest & {
    'aria-expanded'?: boolean | 'true' | 'false'
    'aria-haspopup'?:
      | boolean
      | 'menu'
      | 'listbox'
      | 'tree'
      | 'grid'
      | 'dialog'
      | 'true'
      | 'false'
  }

  const textColorClass = hasValues
    ? 'text-(--system-white)'
    : isOpen
      ? 'dark:text-(--system-gray-7)'
      : 'text-(--accent-gray) dark:text-(--system-gray-6)'

  return (
    // The span acts as the Popover anchor (receives ref + click handler via cloneElement).
    // It is not itself interactive — the inner buttons handle all user interaction.
    <span
      ref={ref}
      role="group"
      className={clsx(
        'inline-flex h-6 items-center overflow-hidden rounded-lg',
        'border-[1.5px] border-(--system-gray-3)',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
      {...spanRest}
    >
      {/* Trigger button — click bubbles to the span, activating the Popover */}
      <button
        type="button"
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHaspopup}
        className={clsx(
          'flex cursor-pointer items-center gap-1 px-2 py-0.5 select-none',
          'text-xs font-medium transition-colors focus-visible:outline-none',
          textColorClass,
        )}
      >
        <span>
          {label}
          {hasValues ? ': ' : ''}
        </span>

        {hasValues ? (
          <>
            {displayedValues}
            {valuesCount > maxDisplayedValues && (
              <span>
                and {otherValuesCount} other{otherValuesCount > 1 ? 's' : ''}
              </span>
            )}
          </>
        ) : (
          showChevron && (
            <ChevronDownIcon
              className={clsx(
                'text-(--system-gray-5) transition-transform',
                isOpen && 'rotate-180',
              )}
            />
          )
        )}
      </button>

      {/* Clear button — stopPropagation prevents the Popover from toggling */}
      {hasValues && (
        <button
          type="button"
          aria-label="Clear filter"
          onClick={(e) => {
            e.stopPropagation()
            onClearClick(e)
          }}
          className={clsx(
            'flex cursor-pointer items-center px-1.5 py-0.5',
            'transition-colors focus-visible:outline-none',
            textColorClass,
          )}
        >
          <XMarkIcon width={14} aria-hidden="true" />
        </button>
      )}
    </span>
  )
}
