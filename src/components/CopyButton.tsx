/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import React, { ComponentProps, memo, useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/Button'
import { getDocument, getNavigator, getWindow } from '@/lib/windowUtils'
import { CopyIcon } from './icons/CopyIcon'

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface CopyButtonProps {
  value: string
  delayMs?: number // Delay in milliseconds before resetting the copied state
  size?: IconSize
  plain?: boolean
  outline?: boolean
  title?: string
  className?: string
  color?: string
}

const iconSizes = {
  xs: '*:data-[slot=icon]:!size-2.5',
  sm: '*:data-[slot=icon]:!size-3',
  md: '*:data-[slot=icon]:!size-4',
  lg: '*:data-[slot=icon]:!size-6',
  xl: '*:data-[slot=icon]:!size-8',
}

const CopyButtonComponent: React.FC<
  CopyButtonProps & Partial<ComponentProps<typeof Button>>
> = ({
  value,
  delayMs,
  size = 'md',
  plain = true,
  outline,
  title = 'Copy to clipboard',
  className,
  color,
}) => {
  const { copiedValue, handleCopy } = useCopyToClipboard({ delayMs })

  return (
    <Button
      onClick={(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) =>
        handleCopy(e, value)
      }
      size={size}
      plain={plain}
      outline={outline}
      title={title}
      className={`${className ?? ''} ${iconSizes[size]}`}
      color={color}
    >
      {copiedValue ? (
        <CheckIcon
          className="stroke-(--accent-graphic-green) transition-colors duration-200"
          data-slot="icon"
        />
      ) : (
        <CopyIcon data-slot="icon" />
      )}
    </Button>
  )
}

export const useCopyToClipboard = ({
  delayMs = 1000,
}: {
  delayMs?: number
}) => {
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  const handleCopy = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    value: string,
  ) => {
    event.stopPropagation()
    event.preventDefault()

    const win = getWindow()
    const doc = getDocument()
    const nav = getNavigator()

    try {
      if (nav?.clipboard && win?.isSecureContext) {
        await nav.clipboard.writeText(value)
      } else if (doc) {
        // navigator.clipboard is only available in secure contexts (https or
        // localhost). Fall back to execCommand for deployments served over http.
        const textarea = doc.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        doc.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        doc.execCommand('copy')
        doc.body.removeChild(textarea)
      }
      setCopiedValue(value)
      setTimeout(() => setCopiedValue(null), delayMs)
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  return { copiedValue, handleCopy }
}

const areEqual = (prevProps: CopyButtonProps, nextProps: CopyButtonProps) =>
  prevProps.value === nextProps.value

export const CopyButton = memo(CopyButtonComponent, areEqual)
