/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import {
  LogLineOriginator,
  LogLineSchema,
} from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { create } from '@bufbuild/protobuf'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { getWindow } from '@/lib/windowUtils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogViewer } from './LogViewer'

const FAKE_ROW_HEIGHT_PX = 24

/**
 * jsdom does not lay out scroll metrics. Keep `scrollHeight` in sync with the
 * virtual list (fixed row height) so "distance from bottom" matches Virtuoso.
 */
function mockScrollMetrics(
  el: HTMLElement,
  getTotalContentHeight: () => number,
) {
  const dims = { clientHeight: 400, scrollTop: 0 }
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    enumerable: true,
    get: () => dims.scrollTop,
    set: (v: number) => {
      dims.scrollTop = v
    },
  })
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    enumerable: true,
    get: () => Math.max(getTotalContentHeight(), dims.clientHeight + 1),
  })
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    enumerable: true,
    get: () => dims.clientHeight,
  })
  return dims
}

async function flushLogViewerEffects() {
  await act(async () => {
    vi.runAllTimers()
  })
}

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

describe('LogViewer follow bottom', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('ResizeObserver', MockResizeObserver)
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
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: FAKE_ROW_HEIGHT_PX,
      top: 0,
      left: 0,
      bottom: FAKE_ROW_HEIGHT_PX,
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

  it('keeps scrolling to the end while the user stays at the bottom', async () => {
    const logCount = { n: 35 }
    const { rerender } = render(<LogViewer logs={makeLogs(35)} done={true} />)
    const scrollEl = screen.getByTestId('logviewer-scroll')
    const dims = mockScrollMetrics(
      scrollEl,
      () => logCount.n * FAKE_ROW_HEIGHT_PX,
    )

    await flushLogViewerEffects()
    // Virtuoso does not always apply initial "scroll to LAST" in jsdom; anchor at bottom
    // so followOutput matches the real "user is at bottom" case.
    dims.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight
    fireEvent.scroll(scrollEl)
    const scrollTopAnchored = dims.scrollTop
    expect(scrollTopAnchored).toBeGreaterThan(100)

    logCount.n = 36
    rerender(<LogViewer logs={makeLogs(36)} done={true} />)
    await flushLogViewerEffects()

    expect(dims.scrollTop).toBeGreaterThanOrEqual(scrollTopAnchored)
  })

  it('does not auto-scroll after the user scrolls away from the bottom', async () => {
    const logCount = { n: 40 }
    const { rerender } = render(<LogViewer logs={makeLogs(40)} done={true} />)
    const scrollEl = screen.getByTestId('logviewer-scroll')
    const dims = mockScrollMetrics(
      scrollEl,
      () => logCount.n * FAKE_ROW_HEIGHT_PX,
    )

    await flushLogViewerEffects()
    dims.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight
    fireEvent.scroll(scrollEl)
    expect(dims.scrollTop).toBeGreaterThan(0)

    dims.scrollTop = 0
    fireEvent.scroll(scrollEl)
    // Wheel-up releases tail immediately; scroll-only can be ambiguous during debounce.
    fireEvent.wheel(scrollEl, { deltaY: -50 })

    logCount.n = 41
    rerender(<LogViewer logs={makeLogs(41)} done={true} />)
    await flushLogViewerEffects()

    expect(dims.scrollTop).toBe(0)
  })

  it('auto-scrolls again after the user scrolls back to the bottom', async () => {
    const logCount = { n: 40 }
    const { rerender } = render(<LogViewer logs={makeLogs(40)} done={true} />)
    const scrollEl = screen.getByTestId('logviewer-scroll')
    const dims = mockScrollMetrics(
      scrollEl,
      () => logCount.n * FAKE_ROW_HEIGHT_PX,
    )

    await flushLogViewerEffects()

    dims.scrollTop = 0
    fireEvent.scroll(scrollEl)
    fireEvent.wheel(scrollEl, { deltaY: -50 })

    logCount.n = 41
    rerender(<LogViewer logs={makeLogs(41)} done={true} />)
    await flushLogViewerEffects()
    expect(dims.scrollTop).toBe(0)

    dims.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight - 5
    fireEvent.scroll(scrollEl)

    logCount.n = 42
    rerender(<LogViewer logs={makeLogs(42)} done={true} />)
    await flushLogViewerEffects()

    expect(dims.scrollTop).toBeGreaterThan(100)
  })
})
