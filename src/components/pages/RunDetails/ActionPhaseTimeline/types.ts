/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { PhaseTransition } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'

export type TooltipPhaseSection = {
  colorPhase: ActionPhase // used to determine color of setup or run bar
  phase: ActionPhase
  duration: string
  phaseTransition: PhaseTransition
  type: 'phase'
  key: string
}

export type TooltipGeneric = {
  content: React.ReactNode
  key: string
  type: 'generic'
}

export type TooltipSection = TooltipPhaseSection | TooltipGeneric

export type TimelineObject = {
  accentColor: string
  percentage: string
  leftAnnotation: string | React.ReactNode
  rightAnnotation: string | React.ReactNode
  tooltipSections: TooltipSection[]
  /**
   * When set, the bar renders as a progress track (gray) with an accent-colored
   * fill at this percent — used for a paused condition counting toward its timeout.
   */
  progressPercent?: number
}
