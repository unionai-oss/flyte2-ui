/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { CopyButton } from '@/components/CopyButton'
import React from 'react'

export type TabSectionProps = {
  heading: string | React.ReactNode
  copyButtonContent?: string
  children: React.ReactNode
}

const TabSectionLayout = ({
  heading,
  copyButtonContent,
  children,
}: {
  heading: string | React.ReactNode | null
  copyButtonContent?: string
  children: React.ReactNode
}) => (
  <div className="flex w-full flex-col" data-testid={`tabsection-${heading}`}>
    <div
      className={`sticky top-0 z-10 flex items-center justify-between ${copyButtonContent ? 'py-2' : ''} bg-(--system-gray-2)`}
    >
      {heading ? <h3 className="py-1 text-sm font-bold">{heading}</h3> : null}
      <div className="flex gap-3">
        {copyButtonContent && (
          <CopyButton
            size="sm"
            className="!px-[9px] !py-[3px] *:data-[slot=icon]:!size-4"
            value={copyButtonContent}
          />
        )}
      </div>
    </div>
    <div className="relative overflow-hidden rounded-2xl border border-(--system-gray-2) bg-(--system-black)">
      {children}
    </div>
  </div>
)

export const TabSection = ({
  heading,
  copyButtonContent,
  children,
}: TabSectionProps) => (
  <TabSectionLayout
    heading={heading}
    copyButtonContent={copyButtonContent}
  >
    {children}
  </TabSectionLayout>
)
