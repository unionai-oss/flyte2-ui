/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import clsx from 'clsx'
import React from 'react'

/**
 * Neutral full-width button for use inside dropdown menus. Provides consistent base behavior
 * (hover, disabled, focus) while leaving layout and content composition to the caller.
 *
 * Not intended as a standalone action button — use BaseButton for that.
 */
export type MenuButtonProps = {
  children: React.ReactNode
  selected?: boolean
  disabled?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  /** Additional classes for layout / contextual overrides (padding, selected bg, etc.). */
  className?: string
  'data-testid'?: string
  'data-checked'?: boolean
}

export const MenuButton = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
  function MenuButton(
    { children, selected, disabled, onClick, className, ...rest },
    ref,
  ) {
    return (
      <button
        data-selected={selected ? true : undefined}
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={clsx(
          'flex w-full cursor-pointer items-center text-left text-sm transition-colors',
          !disabled
            ? 'hover:bg-(--system-gray-3)'
            : 'cursor-default opacity-50',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
