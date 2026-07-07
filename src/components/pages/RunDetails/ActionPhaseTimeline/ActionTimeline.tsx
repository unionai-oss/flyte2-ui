/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { Tooltip } from '@/components/Tooltip'
import { PhaseTransition } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { getRunningTime, toDateFormat } from '@/lib/dateUtils'
import { ChartIcon } from '@/components/icons/ChartIcon'
import { TooltipSection } from './types'
import { TimelineTooltip } from './ActionPhaseTooltip'
import { useMakeTimelineData } from './useMakeTimelineData'
import { getEarliestLatest } from './helpers'
import { TabSection } from '@/components/TabSection'

const PhaseSection = ({
  accentColor,
  leftAnnotation,
  rightAnnotation,
  style,
  tooltipSections,
  progressPercent,
}: {
  accentColor: string
  leftAnnotation: React.ReactNode
  rightAnnotation: React.ReactNode
  style: React.CSSProperties
  tooltipSections: TooltipSection[]
  progressPercent?: number
}) => {
  return (
    <Tooltip
      content={<TimelineTooltip tooltipSections={tooltipSections} />}
      offsetProp={10}
      placement="bottom"
      shouldUseClientPoint
    >
      <div
        style={{ width: style.width }}
        className="flex flex-col gap-1 transition-all duration-700 ease-in-out"
      >
        <div
          className="flex min-h-5 w-full items-center justify-between gap-x-1 overflow-hidden text-2xs font-medium"
          style={{ color: accentColor }}
        >
          <div className="truncate">{leftAnnotation}</div>
          <div className="flex-shrink-0 px-1">{rightAnnotation}</div>
        </div>

        {progressPercent !== undefined ? (
          <div className="h-2 w-full overflow-hidden rounded-full bg-(--system-gray-3)">
            <div
              className="h-full rounded-full transition-all duration-700 ease-in-out"
              style={{
                background: accentColor,
                width: `${Math.max(progressPercent, 1.5)}%`,
              }}
            />
          </div>
        ) : (
          <div
            className="h-2 rounded-full transition-all duration-700 ease-in-out"
            style={{ background: accentColor, width: '100%' }}
          />
        )}
      </div>
    </Tooltip>
  )
}

const ActionPhasesChart = ({
  phaseTransitions,
  conditionTimeoutSeconds,
}: {
  phaseTransitions: PhaseTransition[]
  conditionTimeoutSeconds?: number
}) => {
  const timelineData = useMakeTimelineData({
    phaseTransitions,
    conditionTimeoutSeconds,
  })
  return (
    <div className="flex w-full gap-1">
      {timelineData.map((phase, i) => (
        <PhaseSection
          key={i}
          accentColor={phase.accentColor}
          leftAnnotation={phase.leftAnnotation}
          rightAnnotation={phase.rightAnnotation}
          style={{ width: phase.percentage }}
          tooltipSections={phase.tooltipSections}
          progressPercent={phase.progressPercent}
        />
      ))}
    </div>
  )
}

const Timeline = ({
  phaseTransitions,
  conditionTimeoutSeconds,
}: {
  phaseTransitions: PhaseTransition[]
  conditionTimeoutSeconds?: number
}) => {
  const bounds = getEarliestLatest(phaseTransitions)
  const duration = getRunningTime({
    endTimestamp: bounds.endTime,
    timestamp: bounds.startTime,
    showSubSecondPrecision: true,
  })

  return (
    <div className="flex w-full flex-col items-start gap-5 px-6 pt-6 pb-4">
      <ActionPhasesChart
        phaseTransitions={phaseTransitions}
        conditionTimeoutSeconds={conditionTimeoutSeconds}
      />
      <div className="flex-start flex gap-4 text-[11px] font-medium text-zinc-500">
        <span>Start Time: {toDateFormat({ timestamp: bounds.startTime })}</span>
        <span>End Time: {toDateFormat({ timestamp: bounds.endTime })}</span>
        {duration && <span>Duration: {duration}</span>}
      </div>
    </div>
  )
}

export const ActionTimeline = ({
  phaseTransitions,
  taskType,
  conditionTimeoutSeconds,
}: {
  phaseTransitions: PhaseTransition[] | undefined
  taskType: string
  conditionTimeoutSeconds?: number
}) => {
  return (
    <TabSection heading={taskType === 'trace' ? 'Timeline' : null}>
      {phaseTransitions ? (
        <Timeline
          phaseTransitions={phaseTransitions}
          conditionTimeoutSeconds={conditionTimeoutSeconds}
        />
      ) : (
        <div className="flex h-28 items-center justify-center gap-2 text-sm text-(--system-gray-5)">
          <ChartIcon className="size-5" />
          <span>No timeline data</span>
        </div>
      )}
    </TabSection>
  )
}
