/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { describe, expect, it } from 'vitest'
import {
  APP_METRICS_UPGRADE_SOURCES,
  FLYTE_LICENSED_EDITION_INFO_URL,
  getLicensedEditionInfoUrl,
  LICENSED_EDITION_UPGRADE_SOURCES,
  RUN_METRICS_UPGRADE_SOURCES,
} from './constants'

describe('getLicensedEditionInfoUrl', () => {
  it('appends the source query param to the pricing URL', () => {
    expect(
      getLicensedEditionInfoUrl(RUN_METRICS_UPGRADE_SOURCES.gpuMemory),
    ).toBe(`${FLYTE_LICENSED_EDITION_INFO_URL}?source=run-metrics-gpu-memory`)
  })

  it('supports each defined upgrade source', () => {
    const allSources = [
      ...Object.values(LICENSED_EDITION_UPGRADE_SOURCES),
      ...Object.values(RUN_METRICS_UPGRADE_SOURCES),
      ...Object.values(APP_METRICS_UPGRADE_SOURCES),
    ]

    for (const source of allSources) {
      const url = new URL(getLicensedEditionInfoUrl(source))
      expect(url.origin + url.pathname).toBe(FLYTE_LICENSED_EDITION_INFO_URL)
      expect(url.searchParams.get('source')).toBe(source)
    }
  })
})
