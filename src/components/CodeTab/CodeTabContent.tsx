/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import React from 'react'
import {
  LICENSED_EDITION_UPGRADE_SOURCES,
  type LicensedEditionUpgradeSource,
} from '@/lib/constants'
import { LicensedEditionPlaceholder } from '../LicensedEditionPlaceholder'

export type CodeTabTarget =
  | {
      type: 'actionAttemptId'
      value: import('@/gen/flyteidl2/common/identifier_pb').ActionAttemptIdentifier
    }
  | {
      type: 'taskId'
      value: import('@/gen/flyteidl2/task/task_definition_pb').TaskIdentifier
    }
  | {
      type: 'appId'
      value: import('@/gen/flyteidl2/app/app_definition_pb').Identifier
    }

export interface CodeTabContentProps {
  taskTemplate?: import('@/gen/flyteidl2/task/task_definition_pb').TaskSpec['taskTemplate']
  container?: import('@/gen/flyteidl2/core/tasks_pb').Container
  target?: CodeTabTarget
  noPadding?: boolean
  /** Tracking source for the upgrade link. Defaults from `target.type` when omitted. */
  upgradeSource?: LicensedEditionUpgradeSource
}

function getDefaultUpgradeSource(
  target?: CodeTabTarget,
): LicensedEditionUpgradeSource {
  switch (target?.type) {
    case 'appId':
      return LICENSED_EDITION_UPGRADE_SOURCES.appCode
    case 'actionAttemptId':
      return LICENSED_EDITION_UPGRADE_SOURCES.runCode
    case 'taskId':
    default:
      return LICENSED_EDITION_UPGRADE_SOURCES.taskCode
  }
}

export const CodeTabContent: React.FC<CodeTabContentProps> = ({
  noPadding = false,
  target,
  upgradeSource,
}) => {
  const source = upgradeSource ?? getDefaultUpgradeSource(target)

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col ${noPadding ? '' : 'p-8 pt-2.5'}`}
    >
      <LicensedEditionPlaceholder fullWidth title="Code" source={source} />
    </div>
  )
}
