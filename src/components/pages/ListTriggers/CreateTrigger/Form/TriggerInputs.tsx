/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useDefaultInputsJson } from '@/hooks/useDefaultInputsJson'
import { useOrg } from '@/hooks/useOrg'
import { useTaskDetails } from '@/hooks/useTaskDetails'
import { useTaskSpecLaunchForm } from '@/hooks/useTaskSpecLaunchForm'
import { ProjectDomainPageParams } from '@/types/pageParams'
import { registerFlyteLightTheme, FLYTE_LIGHT_THEME } from '@/utils/monacoThemes'
import MonacoEditor from '@monaco-editor/react'
import { merge } from 'lodash'
import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import stringify from 'safe-stable-stringify'
import { TaskDetails } from '../types'
import { CreateTriggerState } from './types'

export const TriggerInputs = ({
  taskDetails,
}: {
  taskDetails: TaskDetails
}) => {
  const { project, domain } = useParams<ProjectDomainPageParams>()
  const org = useOrg()
  const { setValue, watch, setError, clearErrors, formState } =
    useFormContext<CreateTriggerState>()
  const formDataValues = watch('formData')

  const taskDetailsQuery = useTaskDetails({
    name: taskDetails.taskId,
    version: taskDetails?.taskVersion,
    project,
    domain,
    org,
  })

  const taskQuery = useTaskSpecLaunchForm({
    taskSpec: taskDetailsQuery.data?.details?.spec,
    enabled: !!taskDetailsQuery.data?.details?.spec,
  })

  const literalsQuery = useDefaultInputsJson(
    taskDetails.taskVersion,
    taskDetails.taskId,
    project,
    domain,
  )
  const jsonInputs = merge(
    {},
    taskQuery.data?.json ?? {},
    literalsQuery.data?.json ?? {},
  )

  useEffect(() => {
    if (jsonInputs) {
      setValue('inputs', jsonInputs)
      clearErrors('inputs')
    }
  }, [clearErrors, jsonInputs, setValue])

  return (
    <div>
      <div className="flex justify-between py-2">
        <div className="mb-1 text-xs text-(--system-gray-5)">
          Items marked with * are required
        </div>
      </div>

      <div
        style={{
          height: 'calc(100vh - 295px)',
          width: '100%',
          border: formState.errors.inputs
            ? '1px solid var(--accent-red)'
            : 'none',
          borderRadius: formState.errors.inputs ? '4px' : '0',
        }}
        className="w-full"
      >
        <MonacoEditor
          beforeMount={registerFlyteLightTheme}
          height="100%"
          width="100%"
          defaultLanguage="json"
          onChange={(value) => {
            try {
              if (!value) return
              const parsedData = JSON.parse(value)
              setValue('formData', parsedData)
              clearErrors('inputs')
            } catch (e) {
              const message = e instanceof Error ? `: ${e.message}` : ''
              setError('inputs', {
                message: `Invalid JSON${message}`,
              })
            }
          }}
          value={stringify(formDataValues, null, 2)}
          theme={FLYTE_LIGHT_THEME}
          options={{
            minimap: { enabled: false },
            readOnly: false,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { vertical: 'auto', horizontal: 'auto' },
          }}
        />
      </div>
    </div>
  )
}
