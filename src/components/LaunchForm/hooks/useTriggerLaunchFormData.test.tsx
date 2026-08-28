/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { KICKOFF } = vi.hoisted(() => ({ KICKOFF: '_u_kickoff_time_input_arg' }))

const mocks = vi.hoisted(() => ({
  versions: {
    data: { pages: [{ versions: [{ version: 'v-latest' }] }] },
    isFetched: true,
    isLoading: false,
  },
  triggerDetails: {
    data: {
      trigger: { spec: undefined as unknown, id: { name: 't', revision: 1n } },
    },
    isFetched: true,
  },
  taskDetails: {
    data: {
      details: {
        spec: { taskTemplate: { interface: { inputs: { variables: [] } } } },
      },
    },
    isFetched: true,
  },
  taskQuery: {
    data: {
      json: {
        type: 'object',
        properties: { env: { type: 'string', default: 'dev' } },
      },
    },
    isFetched: true,
  },
  defaultsQuery: {
    data: {
      json: {
        type: 'object',
        properties: { env: { type: 'string', default: 'dev' } },
      },
    },
    isFetched: true,
    isError: false,
  },
  triggerInputsQuery: {
    data: undefined as unknown,
    isFetched: true,
    isError: false,
  },
  useTaskDetails: vi.fn(),
  useLiteralToJson: vi.fn(),
}))

vi.mock('@/hooks/useOrg', () => ({ useOrg: () => 'org-1' }))
vi.mock('@/hooks/useListTaskVersions', () => ({
  useListTaskVersions: () => mocks.versions,
}))
vi.mock('@/hooks/useTriggers', () => ({
  useGetTriggerDetails: () => mocks.triggerDetails,
}))
vi.mock('@/hooks/useTaskDetails', () => ({
  useTaskDetails: (args: unknown) => {
    mocks.useTaskDetails(args)
    return mocks.taskDetails
  },
}))
vi.mock('@/hooks/useTaskSpecLaunchForm', () => ({
  useTaskSpecLaunchForm: () => mocks.taskQuery,
}))
vi.mock('@/hooks/useDefaultInputsJson', () => ({
  useDefaultInputsJson: () => mocks.defaultsQuery,
}))
vi.mock('@/hooks/useLiteralToJsonSchema', () => ({
  useLiteralToJson: (args: unknown) => {
    mocks.useLiteralToJson(args)
    return mocks.triggerInputsQuery
  },
}))
vi.mock('@/hooks/useQueryParamSort', () => ({
  getSortParamForQueryKey: () => 'created_at',
}))

import type { TriggerName } from '@/gen/flyteidl2/common/identifier_pb'

import { useTriggerLaunchFormData } from './useTriggerLaunchFormData'

const triggerName = {
  name: 'my-trigger',
  taskName: 'my-task',
  project: 'proj',
  domain: 'dev',
} as TriggerName

const lastLiteralToJsonArg = () => {
  const calls = mocks.useLiteralToJson.mock.calls
  return calls[calls.length - 1]?.[0] as {
    literals?: unknown[]
    literalsUri?: string
    triggerId?: unknown
  } | null
}

/** Trigger inputs, as the translator would return them for `env: "prod"`. */
const triggerInputsJson = {
  type: 'object',
  properties: { env: { type: 'string', default: 'prod' } },
}

describe('useTriggerLaunchFormData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.triggerDetails = {
      data: {
        trigger: { spec: { runSpec: {} }, id: { name: 't', revision: 1n } },
      },
      isFetched: true,
    }
    mocks.triggerInputsQuery = {
      data: undefined,
      isFetched: true,
      isError: false,
    }
  })

  it('runs the latest task version', () => {
    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))
    expect(result.current.latestVersion).toBe('v-latest')
    expect(mocks.useTaskDetails).toHaveBeenCalledWith(
      expect.objectContaining({ version: 'v-latest' }),
    )
  })

  it('does not convert any inputs when the trigger has none (bare task defaults)', () => {
    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))
    expect(mocks.useLiteralToJson).toHaveBeenCalledWith(null)
    expect(result.current.formMethods.getValues('formData')).toEqual({
      env: 'dev',
    })
  })

  it('prefills the form with the inline trigger inputs, not the task defaults', () => {
    mocks.triggerDetails.data.trigger.spec = {
      runSpec: {},
      inputWrapper: {
        case: 'inputs',
        value: { literals: [{ name: 'env' }], context: [] },
      },
    }
    mocks.triggerInputsQuery = {
      data: { json: triggerInputsJson },
      isFetched: true,
      isError: false,
    }

    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))

    const arg = lastLiteralToJsonArg()
    expect(arg?.literals).toEqual([{ name: 'env' }])
    expect(arg?.literalsUri).toBeUndefined()
    // This is the bug being fixed: the form must show "prod" (trigger), not "dev" (task default).
    expect(result.current.formMethods.getValues('formData')).toEqual({
      env: 'prod',
    })
  })

  it('reads offloaded trigger inputs server-side via the trigger id owner', () => {
    mocks.triggerDetails.data.trigger.spec = {
      runSpec: {},
      inputWrapper: {
        case: 'offloadedInputData',
        value: { uri: 's3://blob', inputsHash: 'h1' },
      },
    }
    mocks.triggerInputsQuery = {
      data: { json: triggerInputsJson },
      isFetched: true,
      isError: false,
    }

    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))

    const arg = lastLiteralToJsonArg()
    expect(arg?.literalsUri).toBe('s3://blob')
    expect(arg?.triggerId).toEqual({ name: 't', revision: 1n })
    expect(result.current.formMethods.getValues('formData')).toEqual({
      env: 'prod',
    })
  })

  it('waits for the inputs conversion before hydrating (no flash of bare defaults)', () => {
    mocks.triggerDetails.data.trigger.spec = {
      runSpec: {},
      inputWrapper: {
        case: 'inputs',
        value: { literals: [{ name: 'env' }], context: [] },
      },
    }
    mocks.triggerInputsQuery = {
      data: undefined,
      isFetched: false,
      isError: false,
    }

    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))

    expect(result.current.isDataFetched).toBe(false)
    expect(result.current.initialSnapshot).toBeNull()
    expect(result.current.formMethods.getValues('formData')).toBeUndefined()
  })

  it('does not hydrate from the trigger-details list stub before the real fetch lands', () => {
    // useGetTriggerDetails seeds itself from the triggers-list cache with a spec that has no
    // inputs; hydrating off it would prefill task defaults and then overwrite them.
    mocks.triggerDetails = {
      data: { trigger: { spec: { active: true }, id: undefined } },
      isFetched: false,
    }
    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))
    expect(result.current.isDataFetched).toBe(false)
  })

  it('hydrates the run settings from the trigger run spec', () => {
    mocks.triggerDetails.data.trigger.spec = {
      runSpec: {
        labels: { values: { team: 'ml' } },
        envs: { values: [{ key: 'A', value: '1' }, { key: '_F_E_VS' }] },
        interruptible: true,
        cacheConfig: { overwriteCache: true },
        maxActionConcurrency: 0,
        securityContext: { runAs: { k8sServiceAccount: 'sa-1' } },
      },
    }

    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))
    const values = result.current.formMethods.getValues()

    expect(values.labels).toEqual([{ key: 'team', value: 'ml' }])
    // The internal platform env var is plumbing and never shown.
    expect(values.envs).toEqual([{ key: 'A', value: '1' }])
    expect(values.interruptible).toBe(true)
    expect(values.overwriteCache).toBe(true)
    expect(values.serviceAccount).toBe('sa-1')
    // 0 means unlimited and renders as an empty field.
    expect(values.maxActionConcurrency).toBeUndefined()
  })

  it('filters the reserved kickoff-time key out of the inline context', () => {
    mocks.triggerDetails.data.trigger.spec = {
      runSpec: {},
      inputWrapper: {
        case: 'inputs',
        value: {
          literals: [{ name: 'env' }],
          context: [
            { key: KICKOFF, value: 'internal' },
            { key: 'real', value: 'keep' },
          ],
        },
      },
    }
    mocks.triggerInputsQuery = {
      data: { json: triggerInputsJson },
      isFetched: true,
      isError: false,
    }

    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))

    expect(result.current.formMethods.getValues('context')).toEqual([
      { key: 'real', value: 'keep' },
    ])
  })

  it('does not wipe the user edits when a late query settle changes the defaults', () => {
    const { result, rerender } = renderHook(() =>
      useTriggerLaunchFormData(triggerName),
    )
    expect(result.current.formMethods.getValues('formData')).toEqual({
      env: 'dev',
    })

    act(() => {
      result.current.formMethods.setValue(
        'formData',
        { env: 'user-typed' },
        { shouldDirty: true },
      )
    })

    // A slower query resolves and the hydrated defaults change underneath the open form.
    mocks.triggerDetails.data.trigger.spec = {
      runSpec: { labels: { values: { team: 'ml' } } },
    }
    rerender()

    expect(result.current.formMethods.getValues('formData')).toEqual({
      env: 'user-typed',
    })
  })

  it('reports fetched once all queries settle', () => {
    const { result } = renderHook(() => useTriggerLaunchFormData(triggerName))
    expect(result.current.isDataFetched).toBe(true)
  })
})
