/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import type { OffloadedInputData } from '@/gen/flyteidl2/common/run_pb'
import type { RunSpec } from '@/gen/flyteidl2/task/run_pb'
import { RunSource } from '@/gen/flyteidl2/workflow/run_definition_pb'
import {
  type CreateRunRequest,
  CreateRunRequestSchema,
} from '@/gen/flyteidl2/workflow/run_service_pb'
import { create } from '@bufbuild/protobuf'

type CreateRunRequestWithOffloadedParams = {
  id: CreateRunRequest['id']
  task: CreateRunRequest['task']
  runSpec?: RunSpec
  offloaded: OffloadedInputData
  source?: RunSource
}

export function createRunRequestWithOffloadedInputs({
  id,
  task,
  runSpec,
  offloaded,
  source = RunSource.WEB,
}: CreateRunRequestWithOffloadedParams): CreateRunRequest {
  return create(CreateRunRequestSchema, {
    id,
    task,
    inputWrapper: {
      case: 'offloadedInputData',
      value: offloaded,
    },
    runSpec,
    source,
  })
}
