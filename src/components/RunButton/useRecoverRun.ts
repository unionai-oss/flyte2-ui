/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { RunDetailsPageParams } from '@/components/pages/RunDetails/types'
import { ProjectIdentifierSchema } from '@/gen/flyteidl2/common/identifier_pb'
import { RelationSchema, RelationType } from '@/gen/flyteidl2/common/run_pb'
import { RecoverSchema, RunSpecSchema } from '@/gen/flyteidl2/task/run_pb'
import { RunService } from '@/gen/flyteidl2/workflow/run_service_pb'
import { useActionData } from '@/hooks/useActionData'
import { useConnectRpcClient } from '@/hooks/useConnectRpc'
import { useOrg } from '@/hooks/useOrg'
import { getRunIdentifier, useRunDetails } from '@/hooks/useRunDetails'
import { useUploadRunInputs } from '@/hooks/useUploadRunInputs'
import { createRunRequestWithOffloadedInputs } from '@/lib/createRunRequestWithOffloadedInputs'
import { clone, create } from '@bufbuild/protobuf'
import { useParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Recovery counterpart to the launch-form rerun path, mirroring `flyte rerun --recover`:
 * a brand new run that replays the source run's task spec and inputs as-is, with
 * `RunSpec.relation` marking it RECOVER so the server reuses the source run's succeeded
 * actions and only re-executes what failed or never ran.
 *
 * Recovery deliberately offers no input/code overrides — it is durability against
 * intermittent failures, not a way to patch a run. The only knob is `forceRerunActions`,
 * the escape hatch that re-executes named actions even though they succeeded.
 */
export function useRecoverRun() {
  const params = useParams<RunDetailsPageParams>()
  const org = useOrg()
  const router = useRouter()
  const runClient = useConnectRpcClient(RunService)
  const { uploadRunInputs } = useUploadRunInputs()

  const runQuery = useRunDetails(params.runId)
  const actionDetails = runQuery.data?.details?.action

  const { data: actionData, isError: isActionDataError } = useActionData({
    actionDetails,
    enabled: !!actionDetails,
  })

  const sourceRunSpec = runQuery.data?.details?.runSpec
  // Recovery always replays the source run's own code, exactly like rerun: never substitute
  // a task looked up elsewhere.
  const taskSpec =
    actionDetails?.spec?.case === 'task' ? actionDetails.spec.value : undefined
  const inputs = actionData?.inputs

  const recoverRun = useCallback(
    async (forceRerunActions: string[] = []) => {
      if (!taskSpec) {
        throw new Error(`Run ${params.runId} has no task spec to recover.`)
      }
      if (!inputs) {
        throw new Error(
          `Run ${params.runId}'s inputs are not available, so it cannot be recovered.`,
        )
      }

      // No run name is offered, so the server generates one — same as `flyte rerun` without --name.
      const id = {
        case: 'projectId' as const,
        value: create(ProjectIdentifierSchema, {
          organization: org,
          domain: params.domain,
          name: params.project,
        }),
      }
      const task = { case: 'taskSpec' as const, value: taskSpec }

      // Inherit the source run's spec wholesale, then reset provenance: it is per-run, so a
      // recovery of a recovery must point at its immediate parent, not the grandparent.
      const runSpec = sourceRunSpec
        ? clone(RunSpecSchema, sourceRunSpec)
        : create(RunSpecSchema, {})
      runSpec.relatedTo = undefined
      runSpec.recover = undefined
      runSpec.relation = create(RelationSchema, {
        relatedTo: getRunIdentifier({
          domain: params.domain,
          name: params.runId,
          org,
          project: params.project,
        }),
        relationType: RelationType.RECOVER,
      })

      const forced = forceRerunActions
        .map((name) => name.trim())
        .filter(Boolean)
      if (forced.length > 0) {
        runSpec.recover = create(RecoverSchema, { forceRerunActions: forced })
      }

      const offloaded = await uploadRunInputs({ id, task, inputs })
      const newRun = await runClient.createRun(
        createRunRequestWithOffloadedInputs({ id, task, runSpec, offloaded }),
      )

      const newAction = newRun.run?.action
      router.push(
        `/domain/${newAction?.id?.run?.domain}/project/${newAction?.id?.run?.project}/runs/${newAction?.id?.run?.name}?i=${newAction?.id?.name}`,
      )
      return newRun
    },
    [
      inputs,
      org,
      params.domain,
      params.project,
      params.runId,
      router,
      runClient,
      sourceRunSpec,
      taskSpec,
      uploadRunInputs,
    ],
  )

  return {
    recoverRun,
    /** False while the task spec or the source inputs are still loading. */
    isReady: !!taskSpec && !!inputs,
    isInputsUnavailable: isActionDataError,
  }
}
