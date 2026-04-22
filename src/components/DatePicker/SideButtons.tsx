/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import clsx from 'clsx'
import { DateRange } from 'react-day-picker'
import { BaseButton } from '../Buttons/BaseButton'

interface QuickRangeSidebarProps {
  activeQuickKey: string | undefined
  sideButtons: SideButtonItem[]
  onSideButtonClick: (dateRange: DateRange, quickLabel: string) => void
}

export type SideButtonItem = SideButtonDivider | SideButtonType

export const isSideButton = (
  sideButtonItem: SideButtonItem,
): sideButtonItem is SideButtonType => {
  return (sideButtonItem as SideButtonType).displayText !== undefined
}

type SideButtonDivider = { key: string; type: 'divider' }

type SideButtonType = {
  displayText: string
  key: string
  onClick: () => DateRange
}

export const QuickRangeSidebar: React.FC<QuickRangeSidebarProps> = ({
  activeQuickKey,
  sideButtons,
  onSideButtonClick,
}) => {
  return (
    <div className="flex h-full w-32 flex-col gap-1.5 border-r-1 border-(--system-gray-3) px-3 py-2">
      {sideButtons.map((props: SideButtonItem) => {
        return isSideButton(props) ? (
          <SideButton
            key={props.displayText}
            isActive={activeQuickKey === props.displayText}
            onClick={() => {
              const dateRange = props.onClick()
              onSideButtonClick(dateRange, props.displayText)
            }}
          >
            {props.displayText}
          </SideButton>
        ) : (
          <hr className="text-(--system-gray-5) opacity-25" key={props.key} />
        )
      })}
    </div>
  )
}

const SideButton = ({
  children,
  isActive,
  onClick,
}: {
  children: React.ReactNode
  isActive: boolean
  onClick: () => void
}) => {
  return (
    <BaseButton
      className={clsx(isActive && 'text-(--system-white)')}
      onClick={onClick}
      size="sm"
    >
      {children}
    </BaseButton>
  )
}
