/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import { ActionDetails } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { describe, expect, it } from 'vitest'
import { isActionRunning, isActionTerminal } from './actionUtils'
import { isAttemptTerminal } from './attemptUtils'
import { getColorsByPhase } from './getColorByPhase'
import { mapPhaseToDisplayString } from './mapPhaseToDisplayString'
import { getPhaseClass, getPhaseEnumValue, getPhaseString } from './phaseUtils'

const recovered = {
  status: { phase: ActionPhase.RECOVERED },
} as unknown as ActionDetails

describe('ACTION_PHASE_RECOVERED', () => {
  // useWatchActionDetails reconnects whenever a closed stream left a non-terminal action.
  // The server closes immediately for a recovered action, so a phase missing from this list
  // is an unthrottled reconnect loop, not a cosmetic gap.
  it('is terminal, so a closed watch stream is not reconnected', () => {
    expect(isActionTerminal(recovered)).toBe(true)
    expect(isActionRunning(recovered)).toBe(false)
  })

  it('is a terminal attempt, so the logs tab stops waiting', () => {
    expect(isAttemptTerminal({ phase: ActionPhase.RECOVERED } as never)).toBe(
      true,
    )
  })

  it('renders as a distinct, non-unknown phase', () => {
    expect(mapPhaseToDisplayString[ActionPhase.RECOVERED]).toBe('Recovered')
    expect(getPhaseString(ActionPhase.RECOVERED)).toBe('Recovered')
    expect(getPhaseClass(ActionPhase.RECOVERED)).toBe('phase-recovered')
    expect(getColorsByPhase(ActionPhase.RECOVERED)).toBe('green')
  })

  it('round-trips through the phase key mapping used by filters', () => {
    expect(getPhaseEnumValue('RECOVERED')).toBe(ActionPhase.RECOVERED)
  })
})
