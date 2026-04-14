/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import type { Timestamp } from '@bufbuild/protobuf/wkt'
import { EnrichedAction } from '@/gen/flyteidl2/workflow/run_definition_pb'

export type ActionId = string

export type ActionWithChildren = EnrichedAction & {
  children: ActionId[]
  groupChildren: Record<string, ActionId[]>
  isGroup: boolean
}

export type FlatRunNode = {
  id: ActionId
  depth: number
  node: ActionWithChildren
  isGroup: boolean
  /** Pre-computed timestamps for group nodes (matches clientsv2 RunDetails sidebar). */
  groupTimestamps?: { startTime?: Timestamp; endTime?: Timestamp }
}
