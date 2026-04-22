/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import clsx from 'clsx'
import NextLink from 'next/link'
import React from 'react'

export type BaseButtonSize = 'sm' | 'md' | 'lg'

/**
 * Color variants for BaseButton.
 *
 * - `brand`     – Union brand color (--union). Supports `filled`.
 * - `red`       – Destructive / danger (--accent-graphic-red). Supports `filled`.
 * - `light-gray`– Subtle secondary action (--system-gray-5 text, --system-gray-3 border).
 * - `med-gray`  – Default secondary action (--system-gray-7 text, adapts light/dark).
 * - `gray`      – Alias for `med-gray`; convenience alias for lg usage.
 */
export type BaseButtonColor =
  | 'brand'
  | 'red'
  | 'light-gray'
  | 'med-gray'
  | 'gray'

export type BaseButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'color' | 'size'
> & {
  ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement>
  size?: BaseButtonSize
  color?: BaseButtonColor
  /**
   * Fill the button background with the color. Only applies to `brand` and `red`; ignored for gray
   * variants.
   */
  filled?: boolean
  /** Render a 1.5px border in the appropriate color. */
  border?: boolean
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
  /** When provided the component renders as a Next.js `<Link>` instead of a `<button>`. */
  href?: string
  target?: React.AnchorHTMLAttributes<HTMLAnchorElement>['target']
  rel?: string
  'data-testid'?: string
  /**
   * Escape hatch for internal composition (e.g. Popover trigger merging). Prefer the
   * structured props above, or override color tokens via `[--btn-color:…]` in className.
   */
  className?: string
  title?: string
  /** Disable the default background-darken hover effect (only applies to unfilled buttons). */
  noHover?: boolean
}

// Typed to allow CSS custom property keys alongside standard React.CSSProperties.
type ButtonCSSVars = React.CSSProperties & {
  '--btn-color'?: string
  '--btn-bg'?: string
  '--btn-border-color'?: string
}

const sizeClasses: Record<BaseButtonSize, string> = {
  sm: 'h-6 rounded-lg px-2.5 py-1 text-[13px] font-medium leading-5 tracking-[0.1px] [&_svg]:size-3.5 [&_svg]:shrink-0',
  md: 'h-7 rounded-lg px-3 py-1 text-[13px] font-medium leading-5 tracking-[0.1px] [&_svg]:size-4 [&_svg]:shrink-0',
  lg: 'h-9 rounded-lg px-3 py-2 text-[14px] font-semibold leading-5 [&_svg]:size-[18px] [&_svg]:shrink-0 justify-center',
}

function getColorVars(
  color: BaseButtonColor,
  filled: boolean,
  border: boolean,
): ButtonCSSVars {
  const normalized = color === 'gray' ? 'med-gray' : color
  const shouldFill = filled && (normalized === 'brand' || normalized === 'red')
  const vars: ButtonCSSVars = {}

  switch (normalized) {
    case 'brand':
      vars['--btn-color'] = shouldFill
        ? 'var(--union-on-union)'
        : 'var(--union)'
      if (shouldFill) vars['--btn-bg'] = 'var(--union)'
      if (border) vars['--btn-border-color'] = 'var(--union)'
      break

    case 'red':
      vars['--btn-color'] = shouldFill
        ? 'var(--system-black)'
        : 'var(--accent-graphic-red)'
      if (shouldFill) vars['--btn-bg'] = 'var(--accent-graphic-red)'
      if (border) vars['--btn-border-color'] = 'var(--accent-graphic-red)'
      break

    case 'light-gray':
      vars['--btn-color'] = 'var(--system-gray-5)'
      if (border) vars['--btn-border-color'] = 'var(--system-gray-3)'
      break

    case 'med-gray':
    default:
      vars['--btn-color'] = 'var(--system-gray-7)'
      if (border) vars['--btn-border-color'] = 'var(--system-gray-3)'
      break
  }

  return vars
}

export function BaseButton({
  ref,
  size = 'md',
  color = 'med-gray',
  filled = false,
  border = false,
  noHover = false,
  leadingIcon,
  trailingIcon,
  children,
  disabled,
  onClick,
  href,
  target,
  rel,
  type = 'button',
  className,
  ...rest
}: BaseButtonProps) {
  const normalized = color === 'gray' ? 'med-gray' : color
  const shouldFill = filled && (normalized === 'brand' || normalized === 'red')

  const sharedClassName = clsx(
    'relative inline-flex cursor-pointer select-none items-center gap-1.5 whitespace-nowrap transition-opacity',
    'text-(--btn-color)',
    shouldFill && 'bg-(--btn-bg)',
    'border-[1.5px]',
    border ? 'border-(--btn-border-color)' : 'border-transparent',
    !shouldFill && !noHover && 'hover:bg-(--system-gray-3)',
    'active:opacity-60',
    'disabled:cursor-not-allowed disabled:opacity-40',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--union)',
    sizeClasses[size],
    disabled && 'pointer-events-none opacity-40',
    className,
  )

  const sharedStyle = getColorVars(color, filled, border)

  const content = (
    <>
      {leadingIcon && (
        <span className="shrink-0 leading-none">{leadingIcon}</span>
      )}
      {children}
      {trailingIcon && (
        <span className="shrink-0 leading-none">{trailingIcon}</span>
      )}
    </>
  )

  if (href) {
    return (
      <NextLink
        href={href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        onClick={
          onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>
        }
        aria-disabled={disabled}
        ref={ref as React.Ref<HTMLAnchorElement>}
        style={sharedStyle}
        className={sharedClassName}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {content}
      </NextLink>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      ref={ref as React.Ref<HTMLButtonElement>}
      style={sharedStyle}
      className={sharedClassName}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  )
}
