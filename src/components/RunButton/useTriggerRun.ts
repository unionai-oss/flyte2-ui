/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useTriggerLaunchFormData } from '@/components/LaunchForm/hooks/useTriggerLaunchFormData'
import { TriggerName } from '@/gen/flyteidl2/common/identifier_pb'
import { useLaunchFormState } from '@/hooks/useLaunchFormState'

export function useTriggerRun(triggerName: TriggerName | undefined) {
  const { buttonText, setIsOpen, setTriggerName, isOpen } = useLaunchFormState()

  // Prefill the form from the trigger's configured inputs (not the bare task defaults), so a
  // manual run reproduces what a scheduled fire would launch with.
  const {
    drawerMeta,
    isDataFetched,
    formMethods,
    latestVersion,
    isVersionsFetched,
    isVersionsLoading,
  } = useTriggerLaunchFormData(triggerName)

  const isReady =
    triggerName && latestVersion && isVersionsFetched && isDataFetched
  const isLoading =
    isVersionsLoading ||
    !isVersionsFetched ||
    (!!latestVersion && !isDataFetched)

  return {
    buttonText,
    setTriggerName,
    triggerName,
    isOpen,
    setIsOpen,
    latestVersion,
    isVersionsFetched,
    isDataFetched,
    isReady,
    isLoading,
    drawerMeta,
    formMethods,
  }
}
