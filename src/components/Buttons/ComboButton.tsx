/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'

import { ChevronDownIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'

import { Tooltip } from '@/components/Tooltip'

import {
  BaseButton,
  type BaseButtonColor,
  type BaseButtonSize,
} from './BaseButton'

export type ComboButtonItem = {
  type?: 'item'
  name: string | React.ReactElement
  onClick: () => void
  disabled?: boolean
  disabledTooltip?: string
}

export type ComboButtonDivider = {
  type: 'divider'
}

export type ComboButtonOption = ComboButtonItem | ComboButtonDivider

export interface ComboButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: BaseButtonColor
  size?: BaseButtonSize
  options: ComboButtonOption[]
  border?: boolean
  firstButtonFilled?: boolean
  disabled?: boolean
}

export function ComboButton({
  color,
  size,
  options,
  border,
  firstButtonFilled,
  disabled,
  className,
  ...rest
}: ComboButtonProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        !menuRef?.current?.contains(e.target as Node) &&
        !buttonRef?.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleButtonKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
    }
  }

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  const firstItem = options[0]
  if (!firstItem || firstItem.type === 'divider') return null

  const hasDropdown = options.length > 1

  return (
    <div className={clsx('relative inline-flex', className)} {...rest}>
      <div
        className={clsx(
          'inline-flex overflow-hidden rounded-lg border-[1.5px]',
          border && !firstButtonFilled
            ? 'border-(--system-gray-3)'
            : 'border-transparent',
        )}
      >
        <BaseButton
          className={hasDropdown ? 'rounded-r-none' : undefined}
          size={size}
          color={color}
          filled={firstButtonFilled}
          border={false}
          noHover
          onClick={firstItem.onClick}
          disabled={disabled || firstItem.disabled}
        >
          {firstItem.name}
        </BaseButton>

        {hasDropdown && (
          <>
            <div className="w-px shrink-0 self-stretch bg-(--system-gray-4)" />

            <BaseButton
              ref={buttonRef}
              className="rounded-l-none"
              size={size}
              color={color}
              filled={firstButtonFilled}
              border={false}
              noHover
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              onKeyDown={handleButtonKeyDown}
              tabIndex={0}
              disabled={disabled}
            >
              <span className="sr-only">Open options</span>
              <ChevronDownIcon className="size-4" aria-hidden="true" />
            </BaseButton>
          </>
        )}
      </div>

      {open && hasDropdown && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 z-50 mt-2 w-max min-w-full origin-top-right rounded-md bg-(--system-gray-1) p-2 shadow-lg ring-1 ring-black/5 focus:outline-none"
          role="menu"
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
        >
          <div className="flex flex-col">
            {options.slice(1).map((item, idx) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${idx}`}
                    className="my-1 h-px bg-(--system-gray-4)"
                  />
                )
              }

              const btn = (
                <button
                  key={typeof item.name === 'string' ? item.name : idx}
                  onClick={() => {
                    if (item.disabled) return
                    setOpen(false)
                    item.onClick()
                  }}
                  disabled={item.disabled}
                  className={clsx(
                    'block w-full rounded-md px-3 py-1 text-left text-[13px] leading-5 font-normal tracking-[0.25px] text-(--system-gray-5) focus-visible:bg-(--system-gray-3) focus-visible:outline-2 focus-visible:outline-(--union)',
                    item.disabled
                      ? 'opacity-50'
                      : 'cursor-pointer hover:bg-(--system-gray-3)',
                  )}
                  type="button"
                  role="menuitem"
                >
                  {item.name}
                </button>
              )

              if (item.disabled && item.disabledTooltip) {
                return (
                  <Tooltip
                    key={typeof item.name === 'string' ? item.name : idx}
                    content={item.disabledTooltip}
                    placement="left"
                  >
                    <span className="block w-full">{btn}</span>
                  </Tooltip>
                )
              }

              return btn
            })}
          </div>
        </div>
      )}
    </div>
  )
}
