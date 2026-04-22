/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { EllipsisHorizontalIcon } from '@heroicons/react/16/solid'
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import React, { ReactNode, useLayoutEffect, useRef } from 'react'
import { BaseButton } from '../Buttons/BaseButton'
import { FilterButton } from '../Buttons/FilterButton'
import { MenuButton } from '../Buttons/MenuButton'
import { CheckedBoxIcon, UncheckedBoxIcon } from '../icons/CheckboxIcons'
import { ChevronDownIcon } from '../icons/ChevronDownIcon'
import { Popover, PopoverProps } from './Popover'
import { usePopoverStore } from './PopoverStore'

export interface MenuItem {
  className?: string
  component?: ReactNode // used for "custom" type
  disabled?: boolean
  icon?: ReactNode
  id: string
  label?: ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  selected?: boolean
  type?: 'item' | 'divider' | 'custom'
}

export interface PopoverMenuProps extends Omit<
  PopoverProps,
  'content' | 'children'
> {
  items: MenuItem[]
  children?: React.ReactElement
  closeOnItemClick?: boolean | 'default-only'
  disabled?: boolean
  variant?: 'dropdown' | 'overflow' | 'filter'
  label?: string | ReactNode
  outline?: boolean
  size?: 'sm' | 'md' | 'lg'
  menuClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  itemClassName?: string
  itemCustomClassName?: string
  triggerClassName?: string
  showChevron?: boolean
  showCheckboxes?: boolean
  noSelectedBackground?: boolean
  width?: 'auto' | 'trigger'
  filterProps?: {
    maxDisplayedValues?: number // max number of values to display before "and X others"
    displayedValues: React.ReactNode // first few selected values to display (3 by default)
    valuesCount: number // total count of selected values
    onClearClick: () => void // clear filter
  }
  overflowProps?: {
    orientation?: 'horizontal' | 'vertical'
  }
}

export const PopoverMenu: React.FC<PopoverMenuProps> = ({
  items,
  children,
  closeOnItemClick = true,
  disabled,
  variant = 'dropdown',
  label,
  open,
  onOpenChange,
  outline = false,
  size = 'md',
  menuClassName = '',
  itemClassName = '',
  itemCustomClassName = '',
  triggerClassName = '',
  showChevron = true,
  showCheckboxes = true,
  noSelectedBackground = false,
  width = 'auto',
  placement = 'bottom-start',
  filterProps,
  overflowProps,
  ...popoverProps
}) => {
  // Use controlled state if open/onOpenChange are provided, otherwise use internal state
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined && onOpenChange !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange : setInternalOpen
  const { setOpenId } = usePopoverStore()

  const menuRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef<number>(0)

  // Reset scroll position when menu closes
  React.useEffect(() => {
    if (!isOpen) {
      scrollPositionRef.current = 0
      setOpenId(null)
    }
  }, [isOpen, setOpenId])

  // Preserve scroll position when items change but menu stays open
  useLayoutEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.scrollTop = scrollPositionRef.current
    }
  }, [items, isOpen])

  // Store scroll position before updates
  const handleScroll = React.useCallback(() => {
    if (menuRef.current) {
      scrollPositionRef.current = menuRef.current.scrollTop
    }
  }, [])

  const handleItemClick = React.useCallback(
    (item: MenuItem, event: React.MouseEvent<HTMLButtonElement>) => {
      const shouldClose =
        closeOnItemClick === true ||
        (closeOnItemClick === 'default-only' && !item.component)

      if (item.onClick) {
        item.onClick(event)
      }

      if (shouldClose) {
        setIsOpen(false)
      }
    },
    [closeOnItemClick, setIsOpen],
  )

  const handleClearClick = React.useCallback(
    (e: React.MouseEvent) => {
      filterProps?.onClearClick?.()
      if (!isOpen) {
        e.stopPropagation()
      }
    },
    [filterProps, isOpen],
  )

  const renderTrigger = () => {
    if (children) {
      return children
    }

    if (variant === 'overflow') {
      const overflowSizeClasses = {
        xs: 'h-4 w-4',
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
      }
      const orientation = overflowProps?.orientation || 'vertical'
      return (
        <button
          className={clsx(
            'inline-flex cursor-pointer items-center justify-center rounded-lg',
            overflowSizeClasses[size],
            triggerClassName,
          )}
        >
          {orientation === 'vertical' ? (
            <EllipsisVerticalIcon
              className="leading-5 text-(--system-gray-5)"
              width="16px"
            />
          ) : (
            <EllipsisHorizontalIcon
              className="leading-5 text-(--system-gray-5)"
              width="16px"
            />
          )}
        </button>
      )
    }

    if (variant === 'filter' && filterProps) {
      const {
        displayedValues,
        valuesCount,
        maxDisplayedValues = 3,
      } = filterProps
      return (
        <FilterButton
          label={label}
          isOpen={isOpen}
          valuesCount={valuesCount}
          displayedValues={displayedValues}
          maxDisplayedValues={maxDisplayedValues}
          onClearClick={handleClearClick}
          showChevron={showChevron}
          disabled={disabled}
          className={triggerClassName}
        />
      )
    }

    // variant === 'dropdown'
    return (
      <BaseButton
        size={size}
        color="med-gray"
        border={outline}
        disabled={disabled}
        trailingIcon={
          showChevron ? (
            <ChevronDownIcon
              width={8}
              height={4.75}
              className={clsx(
                'text-xs text-(--system-gray-5) transition-transform',
                isOpen && 'rotate-180',
              )}
            />
          ) : undefined
        }
        className={clsx(
          disabled && 'pointer-events-none opacity-50 select-none',
          triggerClassName,
        )}
      >
        {label}
      </BaseButton>
    )
  }

  const getMenuWidth = () => {
    if (width === 'auto') return 'min-w-40'
    if (width === 'trigger') return 'w-full'
    return ''
  }

  const menuContent = (
    <div
      data-testid="popover-menu"
      ref={menuRef}
      onScroll={handleScroll}
      className={clsx(
        'scrollbar-styled flex flex-col gap-0.5 overflow-hidden rounded-xl border border-(--system-gray-3) bg-(--system-gray-1) p-2 text-white shadow-lg',
        getMenuWidth(),
        menuClassName,
      )}
    >
      {items.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <div
              key={`separator-${index}`}
              className="pointer-events-none my-1 border-t border-(--system-gray-3)"
            />
          )
        }

        if (item.type === 'custom') {
          return (
            <div
              key={item.id}
              className={`text-(--system-white) ${itemCustomClassName}`}
            >
              {item.component}
            </div>
          )
        }

        // item.type === 'item'
        return (
          <MenuButton
            data-testid={`popover-item-${item.id}`}
            data-checked={!!item.selected}
            key={item.id}
            onClick={(e) => handleItemClick(item, e)}
            disabled={item.disabled}
            selected={item.selected}
            className={clsx(
              'gap-1 rounded-md py-1',
              variant === 'filter' ? 'px-1.5' : 'pr-3 pl-2',
              !showCheckboxes ? 'text-(--system-gray-5)' : '',
              variant === 'filter' && item.selected
                ? 'bg-(--system-gray-3)'
                : '',
              !noSelectedBackground && !showCheckboxes && item.selected
                ? 'bg-(--system-gray-3)'
                : '',
              itemClassName,
              item.className,
            )}
          >
            <div className="flex flex-1 items-center gap-2">
              {showCheckboxes && typeof item.selected === 'boolean' ? (
                <>
                  {item.selected ? (
                    <CheckedBoxIcon className="text-(--system-white)" />
                  ) : (
                    <UncheckedBoxIcon />
                  )}
                </>
              ) : null}
              {item.icon && (
                <span
                  className={clsx(
                    'h-4 w-4 flex-shrink-0',
                    item.selected
                      ? 'text-(--system-white)'
                      : 'text-(--system-gray-5)',
                  )}
                >
                  {item.icon}
                </span>
              )}
              <span
                className={clsx(
                  'flex items-center gap-2',
                  variant === 'filter' &&
                    (item.selected
                      ? 'text-(--system-white)'
                      : 'text-(--system-gray-5)'),
                )}
              >
                {item.label}
              </span>
            </div>
          </MenuButton>
        )
      })}
    </div>
  )

  return (
    <Popover
      content={menuContent}
      disabled={disabled}
      placement={placement}
      open={isOpen}
      onOpenChange={setIsOpen}
      {...popoverProps}
    >
      {renderTrigger()}
    </Popover>
  )
}
