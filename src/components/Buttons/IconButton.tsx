/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import clsx from 'clsx'
import NextLink from 'next/link'
import React from 'react'
import { type BaseButtonColor } from './BaseButton'

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'color'
> & {
  ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement>
  /** Square button size. Default: 'md'.
   *  xs=20px  sm=24px  md=28px  lg=32px (matches NavLink icon column) */
  size?: IconButtonSize
  /** Icon/border color token. Default: 'med-gray'. */
  color?: BaseButtonColor
  /** Render a 1.5px border. */
  border?: boolean
  /** Highlight as active/selected — adds a subtle background. */
  selected?: boolean
  /** Disable the default icon brightness shift on hover. */
  noHover?: boolean
  /** Render as a Next.js Link instead of a button. */
  href?: string
  target?: React.AnchorHTMLAttributes<HTMLAnchorElement>['target']
  rel?: string
  /** HTML download attribute (only meaningful when href is set). */
  download?: string
  className?: string
}

type ButtonCSSVars = React.CSSProperties & {
  '--btn-color'?: string
  '--btn-border-color'?: string
}

const sizeClasses: Record<IconButtonSize, string> = {
  xs: 'size-5 rounded-md [&_svg]:size-3 [&_svg]:shrink-0',
  sm: 'size-6 rounded-lg [&_svg]:size-3.5 [&_svg]:shrink-0',
  md: 'size-7 rounded-lg [&_svg]:size-4 [&_svg]:shrink-0',
  lg: 'size-8 rounded-lg [&_svg]:size-4 [&_svg]:shrink-0',
}

function getColorVars(color: BaseButtonColor, border: boolean): ButtonCSSVars {
  const vars: ButtonCSSVars = {}
  switch (color) {
    case 'brand':
      vars['--btn-color'] = 'var(--union)'
      if (border) vars['--btn-border-color'] = 'var(--union)'
      break
    case 'red':
      vars['--btn-color'] = 'var(--accent-graphic-red)'
      if (border) vars['--btn-border-color'] = 'var(--accent-graphic-red)'
      break
    case 'light-gray':
      vars['--btn-color'] = 'var(--system-gray-5)'
      if (border) vars['--btn-border-color'] = 'var(--system-gray-3)'
      break
    case 'gray':
    case 'med-gray':
    default:
      vars['--btn-color'] = 'var(--system-gray-7)'
      if (border) vars['--btn-border-color'] = 'var(--system-gray-3)'
      break
  }
  return vars
}

export function IconButton({
  ref,
  size = 'md',
  color = 'med-gray',
  border = false,
  selected = false,
  noHover = false,
  href,
  target,
  rel,
  download,
  disabled,
  onClick,
  type = 'button',
  className,
  children,
  ...rest
}: IconButtonProps) {
  const sharedClassName = clsx(
    'relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center',
    'text-(--btn-color)',
    border && 'border-[1.5px] border-(--btn-border-color)',
    selected && 'bg-(--system-gray-2)',
    border && !noHover && 'hover:bg-(--system-gray-3)',
    'transition-opacity active:opacity-60',
    'disabled:cursor-not-allowed disabled:opacity-40',
    disabled && 'pointer-events-none opacity-40',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--union)',
    !noHover && [
      '[&_svg]:transition-[filter]',
      'hover:[&_svg]:brightness-75',
      'dark:hover:[&_svg]:brightness-125',
    ],
    sizeClasses[size],
    className,
  )

  const sharedStyle = getColorVars(color, border)

  if (href) {
    return (
      <NextLink
        href={href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        download={download}
        onClick={
          onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>
        }
        aria-disabled={disabled}
        ref={ref as React.Ref<HTMLAnchorElement>}
        style={sharedStyle}
        className={sharedClassName}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
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
      {children}
    </button>
  )
}
