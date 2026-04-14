/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { Button } from '@/components/Button'
import { RerunIcon } from '@/components/icons/RerunIcon'
import { PlayIcon } from '@/components/icons/PlayIcon'
import { RunDetailsPageParams } from '@/components/pages/RunDetails/types'
import { useTriggerRun } from '@/components/RunButton/useTriggerRun'
import {
  convertRjsfInternalFormats as normalizeJsonInputValues,
  skipUndefinedFormValues,
} from '@/lib/schemaJsonUtils/utils'
import { RunService } from '@/gen/flyteidl2/workflow/run_service_pb'
import { TranslatorService } from '@/gen/flyteidl2/workflow/translator_service_pb'
import { useConnectRpcClient } from '@/hooks/useConnectRpc'
import { useLaunchFormState } from '@/hooks/useLaunchFormState'
import { useOrg } from '@/hooks/useOrg'
import { useTaskDetails } from '@/hooks/useTaskDetails'
import { useUploadRunInputs } from '@/hooks/useUploadRunInputs'
import { createRunRequestWithOffloadedInputs } from '@/lib/createRunRequestWithOffloadedInputs'
import { JsonObject } from '@bufbuild/protobuf'
import { useParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useFormContext } from 'react-hook-form'
import { buildLaunchRunSubmitPayload } from './buildLaunchRunSubmitPayload'
import { ErrorWithRawMessage, LaunchFormState } from './types'

export const LaunchFormButtons = () => {
  const router = useRouter()
  const runClient = useConnectRpcClient(RunService)
  const { uploadRunInputs } = useUploadRunInputs()
  const translatorClient = useConnectRpcClient(TranslatorService)
  const params = useParams<RunDetailsPageParams>()
  const org = useOrg()
  const { buttonText, setIsOpen, taskSpec, triggerName } = useLaunchFormState()

  const { handleSubmit, getValues, setError, formState } =
    useFormContext<LaunchFormState>()

  const formatErrorMessage = useCallback(
    (genericMessage: string, e: Error | unknown): string => {
      const rawMessage = (e as ErrorWithRawMessage)?.rawMessage
      if (!rawMessage) return genericMessage
      return `Error: ${rawMessage}`
    },
    [],
  )

  const { latestVersion } = useTriggerRun(triggerName ?? undefined)
  const { data: triggerTaskDetailsData } = useTaskDetails({
    version: latestVersion || '',
    name: triggerName?.taskName ?? '',
    project: triggerName?.project ?? '',
    domain: triggerName?.domain ?? '',
    org: triggerName?.org ?? '',
    enabled: !!triggerName,
  })

  const onSubmit = useCallback(async () => {
    try {
      const formValues = getValues()

      if (formState.errors.inputs) {
        setError('root', {
          message: 'Please fix JSON errors in inputs before submitting',
          type: 'validation',
        })
        return
      }

      if (
        formState.errors.context ||
        formState.errors.envs ||
        formState.errors.labels
      ) {
        setError('root', {
          message: 'Please fix validation errors in the form',
          type: 'validation',
        })
        return
      }

      if (!taskSpec && !triggerName) {
        setError('root', {
          message: 'Error: missing task spec or trigger name',
          type: 'data',
        })
        return
      }

      const values = skipUndefinedFormValues(
        normalizeJsonInputValues(
          (formValues.inputs ?? {}) as import('json-schema').JSONSchema7,
          (formValues.formData ?? {}) as JsonObject,
        ),
      ) as JsonObject
      const literals = await translatorClient.jsonValuesToLiterals({
        variables:
          taskSpec?.taskTemplate?.interface?.inputs ??
          triggerTaskDetailsData?.details?.spec?.taskTemplate?.interface
            ?.inputs,
        values,
      })

      const projectDomain = triggerName
        ? { domain: triggerName.domain, project: triggerName.project }
        : { domain: params.domain || '', project: params.project || '' }

      const payload = buildLaunchRunSubmitPayload({
        org,
        domain: projectDomain.domain,
        formValues,
        literals: literals.literals,
        name: projectDomain.project,
        taskSpec: taskSpec ?? undefined,
        triggerName: triggerName ?? undefined,
      })
      if (!payload) {
        return
      }

      const offloaded = await uploadRunInputs({
        id: payload.id,
        task: payload.task,
        inputs: payload.inputs,
      })

      const newRun = await runClient.createRun(
        createRunRequestWithOffloadedInputs({
          id: payload.id,
          task: payload.task,
          runSpec: payload.runSpec,
          offloaded,
        }),
      )
      const newAction = newRun.run?.action
      const path = `/domain/${newAction?.id?.run?.domain}/project/${newAction?.id?.run?.project}/runs/${newAction?.id?.run?.name}?i=${newAction?.id?.name}`
      router.push(path)
    } catch (e) {
      console.error('Error submitting run', e)
      setError('root', {
        type: 'api',
        message: formatErrorMessage(
          'An error occurred while submitting your run',
          e,
        ),
      })
    }
  }, [
    getValues,
    formState.errors.inputs,
    formState.errors.context,
    formState.errors.envs,
    formState.errors.labels,
    taskSpec,
    translatorClient,
    org,
    params.domain,
    params.project,
    uploadRunInputs,
    runClient,
    router,
    setError,
    formatErrorMessage,
    triggerName,
    triggerTaskDetailsData,
  ])

  return (
    <>
      <Button
        outline
        color="zinc"
        className="ml-auto dark:!text-(--system-white)"
        onClick={() => setIsOpen(false)}
      >
        Cancel
      </Button>
      <Button
        color="union"
        onClick={handleSubmit(onSubmit)}
        disabled={
          !!formState.errors.inputs ||
          !!formState.errors.runName ||
          !!formState.errors.context ||
          !!formState.errors.envs ||
          !!formState.errors.labels ||
          formState.isSubmitting
        }
        title={
          formState.errors.inputs
            ? 'Please fix JSON errors in inputs before submitting'
            : formState.errors.runName
              ? 'Please fix run name validation errors'
              : formState.errors.context
                ? 'Please fix context validation errors'
                : formState.errors.envs
                  ? 'Please fix environment variable validation errors'
                  : formState.errors.labels
                    ? 'Please fix label validation errors'
                    : 'Submit the form'
        }
      >
        {buttonText === 'Run' ? (
          <PlayIcon className="size-3" fill="currentColor" />
        ) : (
          <RerunIcon className="size-3" />
        )}
        {buttonText}
      </Button>
    </>
  )
}
