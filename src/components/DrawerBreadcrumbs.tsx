/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon'
import { Fragment } from 'react'

export type DrawerBreadcrumb = { label?: string; value?: string }

/**
 * The chip row rendered in a drawer's `titleSection`. Shared so every drawer
 * launched from the run page (rerun, recover) carries identical chrome.
 */
export const DrawerBreadcrumbs = ({
  breadcrumbs,
}: {
  breadcrumbs: DrawerBreadcrumb[]
}) => (
  <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
    {breadcrumbs.map(({ label, value }, index, arr) => (
      <Fragment key={`${label}-${value}-${index}`}>
        <div className="flex min-w-0 gap-1 rounded-md bg-(--bg-gray) px-2 py-0.5">
          {label ? (
            <span className="shrink-0 text-2xs dark:text-(--system-gray-5)">
              {label}
            </span>
          ) : null}
          <span className="truncate text-2xs dark:text-(--system-white)">
            {value}
          </span>
        </div>

        {index + 1 === arr.length ? null : (
          <ChevronRightIcon className="shrink-0" height={6} />
        )}
      </Fragment>
    ))}
  </div>
)
