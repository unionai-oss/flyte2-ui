/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import React from 'react'
import { Link } from '@/components/Link'
import { ArrowTopRightIcon } from '@/components/icons/ArrowTopRightIcon'
import clsx from 'clsx'

type ExternalLinkUrlProps = {
  icon?: React.FC<{ className?: string }>
  iconClassname?: string
  name: string
  ready?: boolean
  url: string
}

const baseClass =
  'inline-flex flex-row items-center gap-1.5 rounded-lg border border-(--system-gray-3) bg-white px-3 py-1.5 text-2xs/4 font-medium text-(--system-gray-7) transition-colors'

export const ExternalLinkUrl: React.FC<ExternalLinkUrlProps> = ({
  icon: Icon,
  iconClassname,
  name,
  url,
  ready = true, // callers who don't specify ready will always see the ready state
}) => {
  if (!url) return null

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 text-(--system-gray-6)" />}
      <span>{name}</span>
      <ArrowTopRightIcon
        className={clsx(
          'h-2.5 w-2.5 text-(--system-gray-5)',
          iconClassname ? iconClassname : null,
        )}
      />
    </>
  )

  return ready ? (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      <span
        className={clsx(
          baseClass,
          'cursor-pointer hover:border-(--system-gray-4) hover:bg-(--system-gray-1)',
        )}
      >
        {content}
      </span>
    </Link>
  ) : (
    <span className={clsx(baseClass, 'cursor-not-allowed opacity-50')}>
      {content}
    </span>
  )
}
