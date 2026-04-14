/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import type { OffloadedInputData } from '@/gen/flyteidl2/common/run_pb'
import {
  DataProxyService,
  type UploadInputsRequest,
  UploadInputsRequestSchema,
} from '@/gen/flyteidl2/dataproxy/dataproxy_service_pb'
import { create } from '@bufbuild/protobuf'
import { useCallback } from 'react'
import { useConnectRpcClient } from './useConnectRpc'

export type UploadRunInputsParams = Pick<
  UploadInputsRequest,
  'id' | 'task' | 'inputs'
>

/**
 * Offloads run inputs via DataProxy UploadInputs; returns data for CreateRun
 * inputWrapper.offloadedInputData.
 */
export function useUploadRunInputs() {
  const client = useConnectRpcClient(DataProxyService)

  const uploadRunInputs = useCallback(
    async (params: UploadRunInputsParams): Promise<OffloadedInputData> => {
      const response = await client.uploadInputs(
        create(UploadInputsRequestSchema, params),
      )
      const offloaded = response.offloadedInputData
      if (!offloaded?.uri || !offloaded?.inputsHash) {
        throw new Error('UploadInputs did not return offloaded input data')
      }
      return offloaded
    },
    [client],
  )

  return { uploadRunInputs }
}
