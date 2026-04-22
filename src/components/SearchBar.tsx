/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { Input, InputGroup, InputProps } from '@/components/Input'
import { MagnifyingGlassIcon, XCircleIcon } from '@heroicons/react/16/solid'
import clsx from 'clsx'
import { forwardRef } from 'react'

type SearchBarProps = {
  placeholder?: string
  className?: string
  /** Extra className applied to the magnifying glass icon. */
  iconClassName?: string
  /** Extra className applied to the inner <input> element. */
  inputClassName?: string
  onClear: () => void
  /** Extra content rendered inside the InputGroup (e.g. Popover triggers, badges). */
  children?: React.ReactNode
} & InputProps

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      placeholder = 'Search',
      className,
      iconClassName,
      inputClassName,
      onClear,
      value,
      children,
      ...inputProps
    },
    ref,
  ) {
    const hasValue = typeof value === 'string' && value.length > 0

    return (
      <InputGroup
        size="sm"
        className={clsx(
          'w-[300px] rounded-lg border-none bg-(--system-gray-2) shadow-none outline-none',
          className,
        )}
      >
        <MagnifyingGlassIcon
          className={clsx('shrink-0 text-(--system-gray-5)', iconClassName)}
          data-slot="icon"
        />
        <Input
          ref={ref}
          size="sm"
          type="search"
          placeholder={placeholder}
          hideBorder={true}
          noOutline={true}
          typographyClassName="text-xs/6 font-medium text-zinc-950 placeholder:font-medium placeholder:text-(--system-gray-5) dark:text-white"
          className={clsx(
            // always suppress the native webkit clear button since we render our own
            '[&::-webkit-search-cancel-button]:hidden',
            // make room for the clear button when it's visible
            hasValue && '!pr-7',
            inputClassName,
          )}
          value={value}
          {...inputProps}
        />
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            onMouseDown={(e) => {
              e.preventDefault() // prevent blurring input
            }}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex min-h-4 min-w-4 -translate-y-1/2 cursor-pointer items-center justify-center p-0.5 text-(--system-gray-5) hover:text-(--system-gray-7)"
          >
            <XCircleIcon className="size-4" />
          </button>
        )}
        {children}
      </InputGroup>
    )
  },
)
