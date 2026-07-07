/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { CircleQuestionSolidIcon } from '@/components/icons/CircleQuestionSolidIcon'
import { CircularProgressIcon } from '@/components/icons/CircularProgressIcon'
import { MultiEllipsisIcon } from '@/components/icons/MultiEllipsisIcon'
import { PauseCircleIcon } from '@/components/icons/PauseCircleIcon'
import { ReadFromCacheIcon } from '@/components/icons/ReadFromCacheIcon'
import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import { useAccent } from '@/hooks/usePalette'
import { getColorsByPhase } from '@/lib/getColorByPhase'
import { mapPhaseToDisplayString } from '@/lib/mapPhaseToDisplayString'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid'
import { memo, useMemo } from 'react'
import { Dot } from '../Dot'
import { Tooltip } from '../Tooltip'
import { IconSize, iconSizeMap } from './iconSize'

interface StatusIconProps {
  className?: string
  iconSize?: IconSize
  phase?: ActionPhase
  isActive?: boolean
  taskType?: string | undefined
  disableTooltip?: boolean
  isStatic?: boolean
  isCached?: boolean
}

export const StatusIconComponent = ({
  className = '',
  iconSize = 'md',
  phase,
  isActive = false,
  taskType,
  disableTooltip,
  isStatic = false, // without animation
  isCached,
}: StatusIconProps) => {
  const iconSizeClass = iconSizeMap[iconSize]
  const iconClassName = `${iconSizeClass} ${className}`
  const color = getColorsByPhase(phase)
  const accent = useAccent(color)

  const innerContent = useMemo(() => {
    const wrapperClass = isActive
      ? `relative rounded flex items-center justify-center ${iconSizeClass}`
      : `flex items-center justify-center ${iconClassName} bg-[unset]`

    if (taskType === 'trace') {
      return (
        <div className={`${iconSizeClass} flex items-center justify-center`}>
          <Dot color={accent} />
        </div>
      )
    }

    switch (phase) {
      case ActionPhase.QUEUED:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <MultiEllipsisIcon className={iconClassName} />
          </div>
        )
      case ActionPhase.WAITING_FOR_RESOURCES:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <CircularProgressIcon
              className={iconClassName}
              isStatic={isStatic}
            />
          </div>
        )
      case ActionPhase.INITIALIZING:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <CircularProgressIcon
              className={iconClassName}
              isStatic={isStatic}
            />
          </div>
        )
      case ActionPhase.RUNNING:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <CircularProgressIcon
              className={iconClassName}
              isStatic={isStatic}
            />
          </div>
        )
      case ActionPhase.SUCCEEDED:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            {isCached ? (
              <ReadFromCacheIcon className={iconClassName} />
            ) : (
              <CheckCircleIcon className={iconClassName} />
            )}
          </div>
        )
      case ActionPhase.FAILED:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <ExclamationCircleIcon className={iconClassName} />
          </div>
        )
      case ActionPhase.ABORTED:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <XCircleIcon className={iconClassName} />
          </div>
        )
      case ActionPhase.TIMED_OUT:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <ExclamationTriangleIcon className={iconClassName} />
          </div>
        )
      case ActionPhase.PAUSED:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <PauseCircleIcon className={iconClassName} />
          </div>
        )
      case ActionPhase.UNSPECIFIED:
      default:
        return (
          <div className={wrapperClass} style={{ color: accent }}>
            <CircleQuestionSolidIcon className={iconClassName} />
          </div>
        )
    }
  }, [
    accent,
    iconSizeClass,
    iconClassName,
    isActive,
    isStatic,
    phase,
    taskType,
    isCached,
  ])

  if (disableTooltip) {
    return innerContent
  }

  return phase ? (
    <Tooltip
      content={mapPhaseToDisplayString[phase]}
      openDelay={700}
      placement="bottom"
    >
      {innerContent}
    </Tooltip>
  ) : (
    innerContent
  )
}

const areEqual = (prevProps: StatusIconProps, nextProps: StatusIconProps) =>
  prevProps.phase === nextProps.phase &&
  prevProps.isCached === nextProps.isCached &&
  prevProps.className === nextProps.className &&
  prevProps.iconSize === nextProps.iconSize &&
  prevProps.isActive === nextProps.isActive &&
  prevProps.taskType === nextProps.taskType &&
  prevProps.disableTooltip === nextProps.disableTooltip &&
  prevProps.isStatic === nextProps.isStatic

export const StatusIcon = memo(StatusIconComponent, areEqual)
