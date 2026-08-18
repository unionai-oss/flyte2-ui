/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { create } from '@bufbuild/protobuf'
import { createClient } from '@connectrpc/connect'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ActionDetailsSchema } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { createClusterConnectTransport } from '@/lib/apiUtils'

import { useActionData } from './useActionData'
import { useConnectRpcClient } from './useConnectRpc'

vi.mock('./useConnectRpc', () => ({ useConnectRpcClient: vi.fn() }))
vi.mock('@/lib/apiUtils', () => ({ createClusterConnectTransport: vi.fn() }))
vi.mock('@connectrpc/connect', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@connectrpc/connect')>()),
  createClient: vi.fn(),
}))

const mockedUseConnectRpcClient = vi.mocked(useConnectRpcClient)
const mockedCreateClient = vi.mocked(createClient)
const selectCluster = vi.fn()
const getActionData = vi.fn()

const actionDetails = create(ActionDetailsSchema, {
  id: {
    name: 'a0',
    run: { org: 'acme', project: 'proj', domain: 'dev', name: 'run-1' },
  },
})

function renderActionData() {
  const queryClient = new QueryClient()
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  Wrapper.displayName = 'QueryClientTestWrapper'
  return renderHook(() => useActionData({ actionDetails }), {
    wrapper: Wrapper,
  })
}

describe('useActionData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseConnectRpcClient.mockReturnValue({
      selectCluster,
    } as unknown as ReturnType<typeof useConnectRpcClient>)
    mockedCreateClient.mockReturnValue({ getActionData } as never)
    getActionData.mockResolvedValue({ inputs: { literals: [] } })
  })

  it('loads action data once SelectCluster resolves', async () => {
    selectCluster.mockResolvedValue({
      clusterEndpoint: 'https://dp.example.com',
    })

    const { result } = renderActionData()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(createClusterConnectTransport).toHaveBeenCalledWith(
      'https://dp.example.com',
    )
    expect(getActionData).toHaveBeenCalledTimes(1)
  })

  it('a forced refetch before SelectCluster resolves waits for the endpoint instead of failing', async () => {
    // Regression: the refetch-on-success effect in RunDetailsSummaryTab forces
    // this queryFn the moment actionDetails arrives — before SelectCluster has
    // answered. Reading the endpoint from the render closure made that first
    // fetch (and every retry, which reuses the closure) throw, stranding the
    // Input/Output panels on a spinner.
    let resolveCluster!: (v: { clusterEndpoint: string }) => void
    selectCluster.mockReturnValue(
      new Promise((resolve) => {
        resolveCluster = resolve
      }),
    )

    const { result } = renderActionData()

    // Force the fetch while the endpoint is still unresolved (refetch bypasses
    // the `enabled` gate, exactly like the effect in the summary tab).
    act(() => {
      void result.current.refetch()
    })
    expect(getActionData).not.toHaveBeenCalled()

    resolveCluster({ clusterEndpoint: 'https://dp.example.com' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.isError).toBe(false)
    expect(createClusterConnectTransport).toHaveBeenCalledWith(
      'https://dp.example.com',
    )
  })
})
