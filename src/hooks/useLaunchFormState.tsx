/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { LaunchFormTab } from '@/components/LaunchForm/Tabs/types'
import { TaskSpec } from '@/gen/flyteidl2/task/task_definition_pb'
import { useSearchParams } from 'next/navigation'
import { useQueryState } from 'nuqs'
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react'
import { TriggerName } from '@/gen/flyteidl2/common/identifier_pb'

type Ctx = {
  buttonText: string
  isOpen: boolean
  launchFormTab: LaunchFormTab
  setLaunchFormTab: (tab?: LaunchFormTab | null) => void
  setIsOpen: (newState: boolean) => void
  taskSpec: TaskSpec | null | undefined
  setTaskSpec: React.Dispatch<React.SetStateAction<TaskSpec | null | undefined>>
  triggerName: TriggerName | null | undefined
  setTriggerName: React.Dispatch<
    React.SetStateAction<TriggerName | null | undefined>
  >
}

const LaunchFormStateContext = createContext<Ctx | null>(null)

export const LaunchFormStateProvider: React.FC<{
  buttonText: string
  children: React.ReactNode
}> = ({ buttonText, children }) => {
  const searchParams = useSearchParams()
  const [launchFormTabParam, setLaunchFormTabParam] = useQueryState(
    'launchTab',
    {
      defaultValue: 'inputs',
    },
  )

  const [taskSpec, setTaskSpec] = useState<TaskSpec | null | undefined>()
  const [triggerName, setTriggerName] = useState<
    TriggerName | null | undefined
  >()
  const [isOpen, setIsOpen] = useState(!!searchParams.get('launchTab'))

  const setLaunchFormTab = useCallback(
    (newValue: LaunchFormTab | null = 'inputs') =>
      setLaunchFormTabParam(newValue),
    [setLaunchFormTabParam],
  )

  const value = useMemo<Ctx>(
    () => ({
      buttonText,
      isOpen,
      launchFormTab: launchFormTabParam as LaunchFormTab,
      setIsOpen,
      setLaunchFormTab,
      taskSpec,
      setTaskSpec,
      triggerName,
      setTriggerName,
    }),
    [
      buttonText,
      isOpen,
      launchFormTabParam,
      setLaunchFormTab,
      taskSpec,
      triggerName,
    ],
  )

  return (
    <LaunchFormStateContext.Provider value={value}>
      {children}
    </LaunchFormStateContext.Provider>
  )
}

export const useLaunchFormState = () => {
  const ctx = useContext(LaunchFormStateContext)
  if (!ctx)
    throw new Error(
      'useLaunchFormState must be used within LaunchFormStateProvider',
    )
  return ctx
}
