/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import {
  type ProjectIdentifier,
  ProjectIdentifierSchema,
  type RunIdentifier,
  RunIdentifierSchema,
  type TriggerName,
  TriggerNameSchema,
} from '@/gen/flyteidl2/common/identifier_pb'
import { KeyValuePair } from '@/gen/flyteidl2/core/literals_pb'
import {
  type Inputs,
  InputsSchema,
  NamedLiteral,
} from '@/gen/flyteidl2/task/common_pb'
import { type RunSpec, RunSpecSchema } from '@/gen/flyteidl2/task/run_pb'
import { TaskSpec } from '@/gen/flyteidl2/task/task_definition_pb'
import { create } from '@bufbuild/protobuf'
import { isRunNameValid, type KVPair, type LaunchFormState } from './types'

const filterOutEmptyKVPairs = (items: KVPair[] | undefined) => {
  if (
    !items ||
    items?.length === 0 ||
    items.every((i) => i.key === '' && i.value === '')
  ) {
    return undefined
  }
  return items.filter((i) => i.key !== '' && i.value !== '')
}

const filterEnvsForSubmit = (items: KVPair[] | undefined) => {
  if (
    !items ||
    items.length === 0 ||
    items.every((i) => !(i.key?.trim() ?? ''))
  ) {
    return undefined
  }
  const filtered = items.filter((i) => (i.key?.trim() ?? '') !== '')
  return filtered.length > 0 ? filtered : undefined
}

const formatEnvs = (envs: LaunchFormState['envs']) => {
  const filteredEnvs = filterEnvsForSubmit(envs)
  if (!filteredEnvs) return undefined
  return {
    values: filteredEnvs.map((kv) => ({
      key: kv.key,
      value: kv.value,
    })),
  }
}

const formatLabels = (labels: LaunchFormState['labels']) => {
  const labelsChecked = filterOutEmptyKVPairs(labels)
  if (!labelsChecked) return undefined
  return {
    values: labelsChecked.reduce(
      (acc, { key, value }) => {
        acc[key] = value
        return acc
      },
      {} as Record<string, string>,
    ),
  }
}

const filterOutEmptyKeyValuePairs = (
  items: KeyValuePair[] | undefined,
): KeyValuePair[] | undefined => {
  if (
    !items ||
    items.length === 0 ||
    items.every(
      (i) =>
        (!i.key || i.key.trim() === '') && (!i.value || i.value.trim() === ''),
    )
  ) {
    return undefined
  }
  const filtered = items.filter(
    (i) => i.key && i.key.trim() !== '' && i.value && i.value.trim() !== '',
  )
  return filtered.length > 0 ? filtered : undefined
}

export type BuildLaunchRunSubmitPayloadProps = {
  org: string
  domain: string
  formValues: Omit<LaunchFormState, 'inputs'>
  literals: NamedLiteral[]
  name: string
  taskSpec?: TaskSpec
  triggerName?: TriggerName
}

export type LaunchRunSubmitPayload = {
  id:
    | { case: 'runId'; value: RunIdentifier }
    | { case: 'projectId'; value: ProjectIdentifier }
  task:
    | { case: 'triggerName'; value: TriggerName }
    | { case: 'taskSpec'; value: TaskSpec }
  inputs: Inputs
  runSpec: RunSpec
}

/** Id, task, inputs, and run spec shared by UploadInputs and CreateRun. */
export function buildLaunchRunSubmitPayload({
  org,
  literals,
  formValues,
  domain,
  name,
  taskSpec,
  triggerName,
}: BuildLaunchRunSubmitPayloadProps): LaunchRunSubmitPayload | null {
  const taskField = triggerName
    ? {
        case: 'triggerName' as const,
        value: create(TriggerNameSchema, {
          org: triggerName.org,
          project: triggerName.project,
          domain: triggerName.domain,
          name: triggerName.name,
          taskName: triggerName.taskName,
        }),
      }
    : taskSpec
      ? {
          case: 'taskSpec' as const,
          value: taskSpec,
        }
      : null

  if (!taskField) {
    return null
  }

  const runName = formValues.runName?.trim()
  const id =
    runName && isRunNameValid(runName)
      ? {
          case: 'runId' as const,
          value: create(RunIdentifierSchema, {
            org,
            project: name,
            domain,
            name: runName,
          }),
        }
      : {
          case: 'projectId' as const,
          value: create(ProjectIdentifierSchema, {
            organization: org,
            domain,
            name,
          }),
        }

  return {
    id,
    task: taskField,
    inputs: create(InputsSchema, {
      literals,
      context: filterOutEmptyKeyValuePairs(formValues.context) ?? [],
    }),
    runSpec: create(RunSpecSchema, {
      envs: formatEnvs(formValues.envs),
      labels: formatLabels(formValues.labels),
      interruptible: formValues.interruptible,
      overwriteCache: formValues.overwriteCache,
      maxActionConcurrency: formValues.maxActionConcurrency ?? 0,
      ...(formValues.serviceAccount && {
        securityContext: {
          runAs: {
            k8sServiceAccount: formValues.serviceAccount,
          },
        },
      }),
    }),
  }
}
