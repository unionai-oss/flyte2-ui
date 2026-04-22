/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import {
  LogLineOriginator,
  LogLineSchema,
} from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { create } from '@bufbuild/protobuf'
import { act, render, screen } from '@testing-library/react'
import { getWindow } from '@/lib/windowUtils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogViewer } from './LogViewer'

/** Drain Vitest’s fake timer queue (including rAF stubs) inside act() so deferred UI work can finish before assertions. */
async function flushLogViewerTimers() {
  const maxPasses = 30
  for (let i = 0; i < maxPasses; i++) {
    await act(async () => {
      vi.runAllTimers()
    })
    if (vi.getTimerCount() === 0) break
  }
}

// ResizeObserver is not available in jsdom
const MockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const makeLogs = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    create(LogLineSchema, {
      message: `Log line ${i}`,
      originator: LogLineOriginator.USER,
    }),
  )

describe('LogViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
    // Ensure requestAnimationFrame work is controlled by Vitest fake timers.
    vi.stubGlobal(
      'requestAnimationFrame',
      (cb: FrameRequestCallback): number => {
        const w = getWindow()!
        return w.setTimeout(() => cb(w.performance.now()), 0)
      },
    )
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
      getWindow()!.clearTimeout(id)
    })

    // jsdom reports 0×0 layouts; Virtuoso (and row content) need stable non-zero
    // geometry. `defaultItemHeight` is 24px — returning 32px here exercises
    // remeasurement paths without relying on real layout.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 32,
      top: 0,
      left: 0,
      bottom: 32,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('infinite render loop regression', () => {
    /**
     * Regression guard: opening a log tab with hundreds of lines must not trip
     * React’s “Maximum update depth exceeded.” LogViewer uses react-virtuoso;
     * fake timers + rAF stubs + getBoundingClientRect mimic enough layout churn
     * in jsdom to catch synchronous update storms if they regress.
     */
    it('renders many log lines without exceeding React nested update limit', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      render(<LogViewer logs={makeLogs(500)} done={true} />)

      await flushLogViewerTimers()

      const updateDepthErrors = consoleError.mock.calls.filter(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('Maximum update depth exceeded'),
      )
      expect(updateDepthErrors).toHaveLength(0)
      expect(screen.getByTestId('logviewer')).toBeInTheDocument()
    })

    it('renders a small number of log lines without error', async () => {
      render(<LogViewer logs={makeLogs(5)} done={true} />)
      await flushLogViewerTimers()

      expect(screen.getByTestId('logviewer')).toBeInTheDocument()
    })
  })
})
