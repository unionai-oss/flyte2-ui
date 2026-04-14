/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { FormProvider, useForm } from 'react-hook-form'
import { CreateTriggerState } from './types'

export const CreateTriggerFormProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const methods = useForm<CreateTriggerState>({ mode: 'onChange' })

  return <FormProvider {...methods}>{children}</FormProvider>
}
