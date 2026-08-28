/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { TriggerName } from '@/gen/flyteidl2/common/identifier_pb'
import { Sort, Sort_Direction } from '@/gen/flyteidl2/common/list_pb'
import type { RunSpec } from '@/gen/flyteidl2/task/run_pb'
import { useDefaultInputsJson } from '@/hooks/useDefaultInputsJson'
import { useListTaskVersions } from '@/hooks/useListTaskVersions'
import { useLiteralToJson } from '@/hooks/useLiteralToJsonSchema'
import { useOrg } from '@/hooks/useOrg'
import { getSortParamForQueryKey } from '@/hooks/useQueryParamSort'
import { useTaskDetails } from '@/hooks/useTaskDetails'
import { useTaskSpecLaunchForm } from '@/hooks/useTaskSpecLaunchForm'
import { useGetTriggerDetails } from '@/hooks/useTriggers'
import { getFormDataFromSchemaDefaults } from '@/lib/schemaJsonUtils/utils'
import { KICKOFF_TIME_INPUT_ARG_CONTEXT_KEY } from '@/lib/triggerUtils'
import type { JSONSchema7 } from 'json-schema'
import { merge } from 'lodash'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { LaunchFormState } from '../Tabs/types'

const defaultSort: Sort = {
  key: 'created_at',
  direction: Sort_Direction.DESCENDING,
} as Sort

const RESET_OPTIONS = {
  keepDirty: false,
  keepTouched: false,
  keepErrors: false,
} as const

/**
 * Internal env var injected by the platform. It is plumbing, not something the
 * user set, so it is filtered out when hydrating env vars for display.
 */
const INTERNAL_ENV_VAR_KEY = '_F_E_VS'

/** The run-configuration slice of the form, hydrated from the trigger's RunSpec. */
const mapRunSpecToRunSettings = (runSpec: RunSpec | undefined) => ({
  labels: Object.entries(runSpec?.labels?.values ?? {}).map(([key, value]) => ({
    key,
    value,
  })),
  envs: (runSpec?.envs?.values ?? [])
    .filter((e) => e.key !== INTERNAL_ENV_VAR_KEY)
    .map((e) => ({ key: e.key, value: e.value })),
  interruptible: runSpec?.interruptible ?? undefined,
  // RunSpec.overwrite_cache is deprecated in favor of cacheConfig.overwriteCache.
  overwriteCache:
    runSpec?.cacheConfig?.overwriteCache ?? runSpec?.overwriteCache ?? false,
  serviceAccount: runSpec?.securityContext?.runAs?.k8sServiceAccount,
  // 0 (unlimited) is normalized to undefined so the field renders as empty.
  maxActionConcurrency: runSpec?.maxActionConcurrency || undefined,
})

/**
 * Builds the launch-form data for manually running a trigger, rehydrating the inputs (and run-spec
 * settings) the trigger was configured with rather than the bare task defaults.
 *
 * This is what makes a manual run from the trigger page behave like a scheduled fire. `CreateRun`
 * only falls back to the trigger's stored inputs when the request carries no input wrapper, and the
 * console always submits an explicit one (the user may edit the values), so the trigger's inputs
 * have to reach the run through the form.
 *
 * Trigger inputs are read from `spec.inputWrapper`:
 *  - inline inputs (`case: 'inputs'`, written by older SDKs and by this console's create-trigger
 *    flow) are converted to launch-form JSON from the literals themselves;
 *  - offloaded inputs (`case: 'offloadedInputData'`, SDK >= 2.3.6) are read back server-side by the
 *    translator, which resolves the URI from the trigger's own spec — hence the trigger id owner.
 *
 * Shapes its return value like {@link useTaskLaunchFormData} so it is a drop-in for the trigger run
 * flow.
 */
export const useTriggerLaunchFormData = (
  triggerName: TriggerName | undefined,
) => {
  const org = useOrg()

  const taskName = triggerName?.taskName
  const project = triggerName?.project
  const domain = triggerName?.domain

  // Triggers always run the latest task version (matches the pre-existing behavior).
  const allVersionsQuery = useListTaskVersions({
    taskName: taskName || '',
    project,
    domain,
    sort: {
      sortBy: defaultSort,
      sortForQueryKey: getSortParamForQueryKey(defaultSort),
    },
  })
  const latestVersion =
    allVersionsQuery.data?.pages?.[0]?.versions?.[0]?.version
  const isVersionsFetched = allVersionsQuery.isFetched

  // NOTE: this query seeds itself from the triggers-list cache with a stub spec that carries no
  // inputs. `isFetched` is false until the real GetTriggerDetails response lands (react-query only
  // counts actual fetches), so gating hydration on it is what keeps us from reading that stub.
  const triggerDetailsQuery = useGetTriggerDetails({
    org,
    domain: domain ?? '',
    projectId: project ?? '',
    name: triggerName?.name ?? '',
    taskName: taskName ?? '',
  })
  const triggerSpec = triggerDetailsQuery.data?.trigger?.spec
  // Full trigger identity (name + revision) used to authorize the offloaded read.
  const triggerId = triggerDetailsQuery.data?.trigger?.id

  const taskDetails = useTaskDetails({
    name: taskName ?? '',
    version: latestVersion || '',
    project: project ?? '',
    domain: domain ?? '',
    org,
    enabled: !!latestVersion && !!taskName && !!project && !!domain,
  })
  const taskInterfaceInputs =
    taskDetails.data?.details?.spec?.taskTemplate?.interface?.inputs

  const taskQuery = useTaskSpecLaunchForm({
    taskSpec: taskDetails.data?.details?.spec,
    enabled: !!taskDetails.data?.details?.spec,
  })

  const defaultsQuery = useDefaultInputsJson(
    latestVersion || '',
    taskName,
    project,
    domain,
  )

  const inlineInputs =
    triggerSpec?.inputWrapper?.case === 'inputs'
      ? triggerSpec.inputWrapper.value
      : undefined
  const offloadedInputs =
    triggerSpec?.inputWrapper?.case === 'offloadedInputData'
      ? triggerSpec.inputWrapper.value
      : undefined

  const hasInlineInputs = !!(
    inlineInputs &&
    inlineInputs.literals.length > 0 &&
    taskInterfaceInputs
  )
  const hasOffloadedInputs = !!(
    offloadedInputs?.uri &&
    triggerId &&
    taskInterfaceInputs
  )
  const hasTriggerInputs = hasInlineInputs || hasOffloadedInputs

  // Convert the trigger's configured inputs to launch-form JSON. Inline literals are sent directly;
  // offloaded inputs are named by the trigger id and read from storage by the translator.
  const triggerInputsQuery = useLiteralToJson(
    hasInlineInputs
      ? {
          literals: inlineInputs!.literals,
          variables: taskInterfaceInputs,
        }
      : hasOffloadedInputs
        ? {
            literalsUri: offloadedInputs!.uri,
            triggerId,
            variables: taskInterfaceInputs,
          }
        : null,
  )

  const formMethods = useForm<LaunchFormState>({
    defaultValues: {
      envs: [],
      labels: [],
      interruptible: undefined,
      overwriteCache: false,
      inputs: {},
    },
  })

  const hydratedDefaults: LaunchFormState | undefined = useMemo(() => {
    if (!taskDetails.isFetched || !taskDetails.data) return undefined
    if (!triggerDetailsQuery.isFetched) return undefined
    if (!taskQuery.isFetched) return undefined
    if (!defaultsQuery.isFetched && !defaultsQuery.isError) return undefined

    // When the trigger has configured inputs, wait for their conversion before hydrating so we do
    // not flash the bare task defaults and then overwrite them.
    if (
      hasTriggerInputs &&
      !triggerInputsQuery.isFetched &&
      !triggerInputsQuery.isError
    ) {
      return undefined
    }

    // Context lives only on inline inputs; drop the reserved kickoff-time key (internal plumbing).
    const context = (inlineInputs?.context ?? []).filter(
      (kv) => kv.key !== KICKOFF_TIME_INPUT_ARG_CONTEXT_KEY,
    )

    // Schema first, task defaults, then the trigger's configured values — later wins.
    const inputs = merge(
      {},
      taskQuery.data?.json,
      defaultsQuery.data?.json,
      triggerInputsQuery.data?.json,
    )

    return {
      ...mapRunSpecToRunSettings(triggerSpec?.runSpec),
      inputs,
      formData: getFormDataFromSchemaDefaults(inputs as JSONSchema7),
      runName: '',
      context,
    } as LaunchFormState
  }, [
    taskDetails.isFetched,
    taskDetails.data,
    triggerDetailsQuery.isFetched,
    taskQuery.isFetched,
    taskQuery.data,
    defaultsQuery.isFetched,
    defaultsQuery.isError,
    defaultsQuery.data,
    hasTriggerInputs,
    triggerInputsQuery.isFetched,
    triggerInputsQuery.isError,
    triggerInputsQuery.data,
    triggerSpec,
    inlineInputs,
  ])

  const initialRef = useRef<LaunchFormState | null>(null)
  // Subscribed during render so react-hook-form actually tracks it.
  const { isDirty } = formMethods.formState

  useEffect(() => {
    if (!hydratedDefaults) return
    const prev = initialRef.current
    if (prev && JSON.stringify(prev) === JSON.stringify(hydratedDefaults)) {
      return
    }
    // Several queries feed the hydrated defaults and they settle at different times. Once the user
    // has edited the form, a late settle must not reset it out from under them.
    if (prev && isDirty) return
    initialRef.current = hydratedDefaults
    formMethods.reset(hydratedDefaults, RESET_OPTIONS)
  }, [hydratedDefaults, isDirty, formMethods])

  const drawerMeta = useMemo(
    () => ({
      title: 'Run:',
      breadcrumbs: [
        { label: 'Task', value: taskName },
        { label: 'Version', value: latestVersion },
      ],
    }),
    [taskName, latestVersion],
  )

  // hydratedDefaults is undefined until every query it reads has settled, so it doubles as the
  // readiness signal — only the versions query is not among its inputs.
  const isDataFetched = isVersionsFetched && !!hydratedDefaults

  return {
    drawerMeta,
    isDataFetched,
    formMethods,
    initialSnapshot: initialRef.current,
    taskDetails: taskDetails.data?.details,
    latestVersion,
    isVersionsFetched,
    isVersionsLoading: allVersionsQuery.isLoading,
  }
}
