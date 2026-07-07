/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useConnectRpcClient } from './useConnectRpc'
import { useOrg } from './useOrg'
import { useWatchActionDetails } from './useWatchActionDetails'

vi.mock('next/navigation', () => ({
  useParams: () => ({
    domain: 'development',
    project: 'flytesnacks',
    runId: 'run-1',
  }),
}))

vi.mock('./useConnectRpc', () => ({
  useConnectRpcClient: vi.fn(),
}))

vi.mock('./useOrg', () => ({
  useOrg: vi.fn(),
}))

const mockedUseConnectRpcClient = vi.mocked(useConnectRpcClient)
const mockedUseOrg = vi.mocked(useOrg)
const watchActionDetails = vi.fn()

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'QueryClientTestWrapper'
  return Wrapper
}

describe('useWatchActionDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseOrg.mockReturnValue('demo')
    mockedUseConnectRpcClient.mockReturnValue({
      watchActionDetails,
    } as unknown as ReturnType<typeof useConnectRpcClient>)
  })

  it('does not start a stream when disabled', async () => {
    renderHook(() => useWatchActionDetails('a1', { enabled: false }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(mockedUseOrg).toHaveBeenCalled())
    expect(watchActionDetails).not.toHaveBeenCalled()
  })

  it('aborts an active stream when disabled', async () => {
    let activeSignal: AbortSignal | undefined
    watchActionDetails.mockImplementation((_request, options) => {
      activeSignal = options.signal
      return (async function* () {
        await new Promise<void>((resolve) => {
          options.signal.addEventListener('abort', () => resolve(), {
            once: true,
          })
        })
      })()
    })

    const { rerender } = renderHook(
      ({ enabled }) => useWatchActionDetails('a1', { enabled }),
      {
        initialProps: { enabled: true },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(watchActionDetails).toHaveBeenCalledTimes(1))
    expect(activeSignal?.aborted).toBe(false)

    rerender({ enabled: false })

    await waitFor(() => expect(activeSignal?.aborted).toBe(true))
  })
})
