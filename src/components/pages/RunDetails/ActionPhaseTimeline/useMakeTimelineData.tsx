/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useRef } from 'react'

import { LiveTimestamp } from '@/components/LiveTimestamp'
import { StatusIcon } from '@/components/StatusIcons'
import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import { PhaseTransition } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { useAccent, usePalette } from '@/hooks/usePalette'
import { getColorsByPhase } from '@/lib/getColorByPhase'
import { mapPhaseToDisplayString } from '@/lib/mapPhaseToDisplayString'

import { useGlobalNow } from '../state/GlobalTimestamp'
import { makeTooltipSection } from './ActionPhaseTooltip'
import { durationBetween, getEarliestLatest, getIsRunning } from './helpers'
import { type TimelineObject } from './types'

const SetupAnnotation = ({
  color,
  status,
}: {
  color?: string
  status?: string | undefined
}) => (
  <div className="flex items-center gap-1 text-2xs">
    <span style={{ color: color }}>Setup: </span>
    {status && <span className="text-zinc-500">{status}</span>}
  </div>
)

const formatRemaining = (ms: number): string => {
  // Round up so the displayed value means "up to N seconds left": the countdown
  // holds the full timeout for the first second and only reaches "0s" exactly at
  // the timeout, staying in step with the count-up timer. Flooring would drop a
  // second almost immediately (start times carry sub-second precision) and hit
  // "0s remaining" a full second early.
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0)
  const d = Math.floor(totalSeconds / 86400)
  const h = Math.floor((totalSeconds % 86400) / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export const useMakeTimelineData = ({
  phaseTransitions,
  conditionTimeoutSeconds,
}: {
  phaseTransitions: PhaseTransition[]
  conditionTimeoutSeconds?: number
}): TimelineObject[] => {
  const palette = usePalette()
  const isRunning = getIsRunning(phaseTransitions)
  const isPausedWaiting =
    phaseTransitions.length === 1 &&
    phaseTransitions[0].phase === ActionPhase.PAUSED
  const globalNow = useGlobalNow((s) =>
    isRunning || isPausedWaiting ? s.now : null,
  )
  const nowRef = useRef(Date.now())

  // If not running, keep last known time frozen
  if (globalNow) {
    nowRef.current = globalNow
  }

  const totalBounds = getEarliestLatest(phaseTransitions)
  const endTime = isRunning ? nowRef.current : totalBounds.endTime
  const totalDuration = durationBetween(totalBounds.startTime, endTime)

  const preRunPhases = phaseTransitions.filter(
    (p) => p.phase < ActionPhase.RUNNING,
  )
  const preRunBounds = getEarliestLatest(preRunPhases)
  const preRunDuration = durationBetween(
    preRunBounds.startTime,
    preRunBounds.endTime,
  )

  // If the total duration is 0, fall back to a default visual ratio.
  // Otherwise, calculate preRunPercentage proportionally, ensuring a minimum width.
  let preRunPercentage: number
  if (totalDuration <= 1) {
    preRunPercentage = 85
  } else {
    const computed = Math.floor((preRunDuration / totalDuration) * 100)
    preRunPercentage = Math.max(computed, 15)
  }

  const runningPhase = phaseTransitions.find(
    (p) => p.phase === ActionPhase.RUNNING,
  )

  const terminalPhase = phaseTransitions.find(
    (p) => p.phase > ActionPhase.RUNNING,
  )
  const terminalColor = getColorsByPhase(terminalPhase?.phase)
  const terminalAccentColor = useAccent(terminalColor)

  // 0. Paused (condition waiting for an external signal). Single phase that
  // keeps ticking while it waits, mirroring an action's running bar. With a
  // timeout, show remaining time and render the bar as progress toward it.
  if (isPausedWaiting) {
    const pausedPhase = phaseTransitions[0]
    const accent = palette.accent[getColorsByPhase(ActionPhase.PAUSED)]
    const startMs = totalBounds.startTime
    const timeoutMs = conditionTimeoutSeconds
      ? conditionTimeoutSeconds * 1000
      : undefined
    const hasTimeout = !!timeoutMs && !!startMs
    const elapsedMs = startMs ? Math.max(nowRef.current - startMs, 0) : 0
    const remainingMs = hasTimeout ? Math.max(timeoutMs - elapsedMs, 0) : 0
    const progressPercent = hasTimeout
      ? Math.min(100, (elapsedMs / timeoutMs) * 100)
      : undefined

    // Once the timeout is hit the action is effectively timed out, but the
    // server may take a moment to transition the phase. Freeze the count-up
    // timer at the timeout instead of letting it tick past (e.g. 10.84s for a
    // 10s timeout) while we wait for the terminal transition.
    const cappedEndMs =
      hasTimeout && elapsedMs >= timeoutMs ? startMs + timeoutMs : undefined
    const rightEndTimestamp = pausedPhase.endTime ?? cappedEndMs

    return [
      {
        leftAnnotation: hasTimeout ? (
          <>
            Waiting for signal:{' '}
            <span className="text-zinc-500">
              {formatRemaining(remainingMs)} remaining
            </span>
          </>
        ) : (
          'Waiting for signal'
        ),
        rightAnnotation: (
          <div className="flex items-center gap-x-1">
            <LiveTimestamp
              className="!text-right"
              minWidth={25}
              timestamp={pausedPhase.startTime}
              endTimestamp={rightEndTimestamp}
            />
            <StatusIcon phase={ActionPhase.PAUSED} />
          </div>
        ),
        accentColor: accent,
        percentage: '100%',
        progressPercent,
        tooltipSections: [
          { type: 'generic', content: 'Waiting for signal', key: 'generic' },
        ],
      },
    ]
  }

  // 1. Unspecified
  if (
    phaseTransitions.length === 1 &&
    phaseTransitions[0].phase === ActionPhase.UNSPECIFIED
  ) {
    return [
      {
        leftAnnotation: 'Setup',
        rightAnnotation: '',
        accentColor: palette.accent.gray,
        percentage: '85%',
        tooltipSections: [
          { type: 'generic', content: 'Setup', key: 'generic' },
        ],
      },
      {
        leftAnnotation: 'Run',
        rightAnnotation: '',
        accentColor: palette.accent.gray,
        percentage: '15%',
        tooltipSections: [
          { type: 'generic', content: 'Not started', key: 'generic' },
        ],
      },
    ]
  }

  // 2. Has not reached RUNNING yet
  if (!phaseTransitions.some((p) => p.phase >= ActionPhase.RUNNING)) {
    const latestPrerunPhase = preRunPhases[preRunPhases.length - 1]
    return [
      {
        leftAnnotation: (
          <SetupAnnotation
            status={mapPhaseToDisplayString[latestPrerunPhase.phase]}
          ></SetupAnnotation>
        ),
        rightAnnotation: (
          <LiveTimestamp
            className="!text-right"
            minWidth={25}
            timestamp={preRunBounds.startTime}
            endTimestamp={preRunBounds.endTime}
          />
        ),
        accentColor: palette.accent.purple,
        percentage: '85%',
        tooltipSections: preRunPhases.map(makeTooltipSection),
      },
      {
        leftAnnotation: 'Run',
        rightAnnotation: '',
        accentColor: palette.accent.gray,
        percentage: '15%',
        tooltipSections: [
          { type: 'generic', content: 'Not started', key: 'generic' },
        ],
      },
    ]
  }

  // 3. RUNNING
  if (runningPhase && !terminalPhase) {
    const runningPhasePercent = 100 - preRunPercentage
    return [
      {
        leftAnnotation: 'Setup',
        rightAnnotation: (
          <LiveTimestamp
            className="!text-right"
            minWidth={25}
            timestamp={preRunBounds.startTime}
            endTimestamp={preRunBounds.endTime ?? runningPhase.startTime}
          />
        ),
        accentColor: palette.accent.purple,
        percentage: `${preRunPercentage}%`,
        tooltipSections: preRunPhases.map(makeTooltipSection),
      },
      {
        leftAnnotation: runningPhasePercent > 15 ? 'Run' : '',
        rightAnnotation: (
          <div className="flex items-center gap-x-1">
            <LiveTimestamp
              className="!text-right"
              minWidth={25}
              timestamp={runningPhase.startTime}
              endTimestamp={runningPhase.endTime}
            />
            <StatusIcon phase={ActionPhase.RUNNING} />
          </div>
        ),
        accentColor: palette.accent.blue,
        percentage: `${runningPhasePercent}%`,
        tooltipSections: [makeTooltipSection(runningPhase)],
      },
    ]
  }

  // 4. TERMINAL
  if (terminalPhase && runningPhase) {
    const terminalPhasePercent = Math.max(100 - preRunPercentage, 12)
    return [
      {
        leftAnnotation: 'Setup',
        rightAnnotation: preRunBounds.startTime ? (
          <LiveTimestamp
            className="!text-right"
            minWidth={25}
            timestamp={preRunBounds.startTime}
            endTimestamp={preRunBounds.endTime ?? runningPhase.startTime}
          />
        ) : (
          ''
        ),
        accentColor: palette.accent.purple,
        percentage: `${preRunPercentage}%`,
        tooltipSections: preRunPhases.map(makeTooltipSection),
      },
      {
        leftAnnotation:
          terminalPhasePercent > 15
            ? mapPhaseToDisplayString[terminalPhase.phase]
            : '',
        rightAnnotation: runningPhase ? (
          <div className="flex items-center gap-x-1">
            <LiveTimestamp
              className="!text-right"
              minWidth={25}
              timestamp={runningPhase.startTime}
              endTimestamp={runningPhase.endTime ?? terminalPhase.startTime}
            />
            <StatusIcon phase={terminalPhase.phase} />
          </div>
        ) : (
          ''
        ),
        accentColor: terminalAccentColor,
        percentage: `${terminalPhasePercent}%`,
        tooltipSections: [
          makeTooltipSection(runningPhase, terminalPhase.phase),
        ],
      },
    ]
  }
  // Handles case where no prerun phases are returned
  if (phaseTransitions.length === 1) {
    const phase = phaseTransitions[0].phase
    const color = getColorsByPhase(phase)
    const accent = palette.accent[color]
    return [
      {
        leftAnnotation: mapPhaseToDisplayString[phase],
        rightAnnotation: '',
        accentColor: accent,
        percentage: '100%',
        tooltipSections: [
          {
            type: 'generic',
            content: `${mapPhaseToDisplayString[phase]}`,
            key: 'generic',
          },
        ],
      },
    ]
  } else if (terminalPhase) {
    const terminalPhasePercent = Math.max(100 - preRunPercentage, 12)
    return [
      {
        leftAnnotation: 'Setup',
        rightAnnotation: preRunBounds.startTime ? (
          <LiveTimestamp
            className="!text-right"
            minWidth={25}
            timestamp={preRunBounds.startTime}
            endTimestamp={preRunBounds.endTime}
          />
        ) : (
          ''
        ),
        accentColor: palette.accent.purple,
        percentage: `${preRunPercentage}%`,
        tooltipSections: preRunPhases.map(makeTooltipSection),
      },
      {
        leftAnnotation:
          terminalPhasePercent > 15
            ? mapPhaseToDisplayString[terminalPhase.phase]
            : '',
        rightAnnotation: runningPhase ? (
          <div className="flex items-center gap-x-1">
            <LiveTimestamp
              className="!text-right"
              minWidth={25}
              timestamp={runningPhase.startTime}
              endTimestamp={runningPhase.endTime}
            />
            <StatusIcon phase={terminalPhase.phase} />
          </div>
        ) : (
          mapPhaseToDisplayString[terminalPhase.phase]
        ),
        accentColor: terminalAccentColor,
        percentage: `${terminalPhasePercent}%`,
        tooltipSections: [makeTooltipSection(terminalPhase)],
      },
    ]
  }

  return []
}
