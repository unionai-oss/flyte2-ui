/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { TableState } from '@/components/Tables'
import { ProjectIdentifier } from '@/gen/flyteidl2/common/identifier_pb'
import { Filter } from '@/gen/flyteidl2/common/list_pb'
import { ListRunsResponse } from '@/gen/flyteidl2/workflow/run_service_pb'
import { useWatchRuns } from '@/hooks/useWatchRuns'
import { ColumnDef } from '@tanstack/react-table'
import { ListRunsTable } from './table/ListRunsTable'
import { RunsTableRow } from './table/types'
import { TableRunsEmptyContent } from './TableRunsEmptyContent'

interface ListRunsTableViewProps {
  projectId?: ProjectIdentifier
  filters?: Filter[]
  // 'any' because of complex type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<RunsTableRow, any>[]
  noRowsMessage?: string
  enabled?: boolean
  hideLastRowBorder?: boolean
  /** Restrict the list to runs with an action awaiting a signal (PAUSED). */
  pausedActionsOnly?: boolean
}

export const ListRunsTableView = ({
  projectId,
  filters = [],
  columns,
  noRowsMessage = 'Get started by triggering a run with flyte from the CLI',
  enabled = true,
  hideLastRowBorder = false,
  pausedActionsOnly = false,
}: ListRunsTableViewProps) => {
  // Encapsulate the query inside the component
  const runsQuery = useWatchRuns({
    projectId,
    filters,
    enabled,
    pausedActionsOnly,
  })

  // Flatten all pages into a single array of runs
  const allRuns =
    runsQuery.data?.pages?.flatMap(
      (page: ListRunsResponse) => page.runs ?? [],
    ) ?? []

  // Show loading if query is disabled or if query is loading
  const isLoading = !enabled || runsQuery.isLoading

  return (
    <TableState
      dataLabel="runs"
      data={allRuns}
      isError={runsQuery.isError}
      isLoading={isLoading}
      subtitle={noRowsMessage}
      content={<TableRunsEmptyContent />}
    >
      {(data) => (
        <ListRunsTable
          runs={data}
          runsQuery={runsQuery}
          columns={columns}
          hideLastRowBorder={hideLastRowBorder}
        />
      )}
    </TableState>
  )
}
