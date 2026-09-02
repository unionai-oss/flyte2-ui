/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { Button } from '@/components/Button'
import ComboButton from '@/components/ComboButton'
import { RerunIcon } from '@/components/icons/RerunIcon'
import { LaunchFormDrawer } from '@/components/LaunchForm'
import { LaunchFormMode } from '@/components/LaunchForm/Tabs/types'
import { TaskSpec } from '@/gen/flyteidl2/task/task_definition_pb'
import { useLaunchFormState } from '@/hooks/useLaunchFormState'
import { ArrowUturnLeftIcon, PlayIcon } from '@heroicons/react/24/solid'
import { useEffect, useState } from 'react'
import { useRunLaunchFormData } from '../LaunchForm/hooks/useRunLaunchFormData'
import { useTaskLaunchFormData } from '../LaunchForm/hooks/useTaskLaunchFormData'
import { AbortModal } from './components/AbortModal'

export const RunButton = () => {
  const [abortOpen, setAbortOpen] = useState(false)
  const { setTaskSpec, setIsOpen, setLaunchMode } = useLaunchFormState()

  // Rerun and recover share the launch drawer — a recovery takes the same inputs and
  // settings, and only differs in what the submit does with the source run.
  const openLaunchForm = (mode: LaunchFormMode) => {
    setLaunchMode(mode)
    setIsOpen(true)
  }

  const { drawerMeta, isDataFetched, isTerminalPhase, formMethods, spec } =
    useRunLaunchFormData()

  useEffect(() => {
    if (spec && spec.$typeName === 'flyteidl2.task.TaskSpec') {
      setTaskSpec((prev) => (prev ? prev : spec))
    }
  }, [spec, setTaskSpec])

  return (
    <>
      <ComboButton
        color={isTerminalPhase ? 'union' : 'rose'}
        options={
          isTerminalPhase
            ? [
                {
                  name: (
                    <span className="flex items-center">
                      <RerunIcon className="mr-2 size-3" />
                      Rerun
                    </span>
                  ),
                  onClick: () => openLaunchForm('rerun'),
                },
                {
                  name: (
                    <span className="flex items-center">
                      <ArrowUturnLeftIcon className="mr-2 size-3" />
                      Recover
                    </span>
                  ),
                  onClick: () => openLaunchForm('recover'),
                },
              ]
            : [
                // Per design request, when not in terminal phase, show abort in the dropdown as well
                {
                  name: 'Abort run',
                  onClick: () => {
                    setAbortOpen(true)
                  },
                },
                {
                  name: 'Abort run',
                  onClick: () => {
                    setAbortOpen(true)
                  },
                },
                {
                  name: 'Rerun',
                  onClick: () => openLaunchForm('rerun'),
                },
              ]
        }
      />
      <AbortModal isOpen={abortOpen} setIsOpen={setAbortOpen} />
      <LaunchFormDrawer {...{ drawerMeta, formMethods, isDataFetched }} />
    </>
  )
}

type TaskRunButtonProps = {
  taskSpec: TaskSpec | undefined
  version: string
}

export const TaskRunButton = ({ taskSpec, version }: TaskRunButtonProps) => {
  const [abortOpen, setAbortOpen] = useState(false)
  const { buttonText, setIsOpen, setTaskSpec } = useLaunchFormState()

  const { drawerMeta, isDataFetched, formMethods } = useTaskLaunchFormData({
    version,
  })

  useEffect(() => {
    if (taskSpec) {
      setTaskSpec((prev) => (prev ? prev : taskSpec))
    }
  }, [taskSpec, setTaskSpec])

  return (
    <>
      <Button
        type="button"
        className="border-none !px-3 [&::after]:shadow-none [&::before]:shadow-none"
        color="union"
        onClick={() => setIsOpen(true)}
      >
        <span className="flex items-center">
          <PlayIcon className="mr-2 size-4 text-(--union-on-union)" />
          {buttonText}
        </span>
      </Button>
      <AbortModal isOpen={abortOpen} setIsOpen={setAbortOpen} />
      <LaunchFormDrawer
        drawerMeta={drawerMeta}
        formMethods={formMethods}
        isDataFetched={isDataFetched}
      />
    </>
  )
}
