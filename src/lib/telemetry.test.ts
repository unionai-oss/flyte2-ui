/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { describe, expect, it } from 'vitest'

import { isTelemetryDisabled, TELEMETRY_OPT_OUT_VARS } from './telemetry'

const reader =
  (vars: Record<string, string>) =>
  (name: string): string | undefined =>
    vars[name]

describe('isTelemetryDisabled', () => {
  it.each(TELEMETRY_OPT_OUT_VARS.flatMap((name) =>
    ['true', '1', 'yes', 'TRUE', ' true '].map((value) => [name, value]),
  ))('%s=%s opts out', (name, value) => {
    expect(isTelemetryDisabled(reader({ [name]: value }))).toBe(true)
  })

  it.each(['', 'false', '0', 'no'])('"%s" leaves telemetry on', (value) => {
    expect(
      isTelemetryDisabled(reader({ FLYTE_DISABLE_TELEMETRY: value })),
    ).toBe(false)
  })

  it('is on when nothing is set', () => {
    expect(isTelemetryDisabled(reader({}))).toBe(false)
  })
})
