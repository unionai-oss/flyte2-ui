/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { FormProvider, UseFormReturn } from 'react-hook-form'
import Drawer from '@/components/Drawer'
import { DrawerBreadcrumbs } from '@/components/DrawerBreadcrumbs'
import { LaunchFormTabs } from './Tabs/LaunchFormTabs'
import { LaunchFormState } from './Tabs/types'
import { useLaunchFormState } from '@/hooks/useLaunchFormState'

interface LaunchFormDrawer {
  formMethods: UseFormReturn<LaunchFormState, unknown, LaunchFormState>
  drawerMeta: {
    title: string
    breadcrumbs: { label?: string; value?: string }[]
  }
  isDataFetched: boolean
  // allows consumers to pass custom handler if necessary
  setIsLaunchFormOpen?: () => void
}

export const LaunchFormDrawer = ({
  formMethods,
  isDataFetched,
  drawerMeta,
  ...props
}: LaunchFormDrawer) => {
  const { isOpen, setIsOpen } = useLaunchFormState()
  const setIsLaunchFormOpen = props.setIsLaunchFormOpen || setIsOpen
  // Only allow the drawer to be open if data is fetched
  const effectiveIsOpen = isOpen && isDataFetched
  return (
    <Drawer
      isOpen={effectiveIsOpen}
      setIsOpen={setIsLaunchFormOpen}
      tabs={
        isDataFetched ? (
          <FormProvider {...formMethods}>
            <LaunchFormTabs />
          </FormProvider>
        ) : null
      }
      size={818}
      hasFullscreen
      title={drawerMeta.title}
      titleSection={<DrawerBreadcrumbs breadcrumbs={drawerMeta.breadcrumbs} />}
    />
  )
}
