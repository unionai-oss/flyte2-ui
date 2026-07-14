/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { PopoverMenu, type MenuItem } from '@/components/Popovers'
import { StatusIcon } from '@/components/StatusIcons'
import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import { useQueryFilters } from '@/hooks/useQueryFilters'
import { useMemo } from 'react'

type FilterConfig = {
  label: string
  phase: ActionPhase
  value: keyof typeof ActionPhase
}

export const filterConfigs: FilterConfig[] = [
  {
    label: 'Completed',
    phase: ActionPhase.SUCCEEDED,
    value: 'SUCCEEDED',
  },
  {
    label: 'Queued',
    phase: ActionPhase.QUEUED,
    value: 'QUEUED',
  },
  {
    label: 'Waiting for resources',
    phase: ActionPhase.WAITING_FOR_RESOURCES,
    value: 'WAITING_FOR_RESOURCES',
  },
  {
    label: 'Initializing',
    phase: ActionPhase.INITIALIZING,
    value: 'INITIALIZING',
  },
  {
    label: 'Running',
    phase: ActionPhase.RUNNING,
    value: 'RUNNING',
  },
  {
    label: 'Paused',
    phase: ActionPhase.PAUSED,
    value: 'PAUSED',
  },
  {
    label: 'Timed out',
    phase: ActionPhase.TIMED_OUT,
    value: 'TIMED_OUT',
  },
  {
    label: 'Aborted',
    phase: ActionPhase.ABORTED,
    value: 'ABORTED',
  },
  {
    label: 'Failed',
    phase: ActionPhase.FAILED,
    value: 'FAILED',
  },
]

/**
 * Statuses hidden from the *runs list* Status filter (see `StatusFilter` below).
 *
 * PAUSED is excluded there because that filter can't express it correctly:
 *  - The runs-list Status filter turns each selection into a `phase` column
 *    filter on the run's *root* action. A human-in-the-loop pause, however,
 *    lives on a *child* gate action, so a root-only `phase = PAUSED` filter
 *    never matches the runs users expect to see.
 *  - The backend does expose `paused_actions_only` (a correlated EXISTS
 *    subquery), but it's a top-level boolean flag on `ListRunsRequest`, not a
 *    `Filter`. It is therefore not AND-composed with the other column filters
 *    this dropdown builds, so it can't be wired into the multi-select alongside
 *    the other phases without behaving incorrectly (e.g. combining "Paused" with
 *    another status).
 *
 * Paused runs are surfaced instead via the dedicated "waiting for signal"
 * banner/filter (PausedRunsBanner), which sends `paused_actions_only` on its
 * own request.
 *
 * NOTE: this only applies to the runs list. On the run details page the filter
 * operates on the run's individual actions, where a PAUSED gate action is a
 * real, directly-filterable phase — so that filter keeps PAUSED (it does not
 * pass `excludeValues`).
 */
const RUNS_LIST_HIDDEN_STATUS_VALUES: ReadonlySet<keyof typeof ActionPhase> =
  new Set(['PAUSED'])

export const useStatusFilterMenuItems = (
  excludeValues?: ReadonlySet<keyof typeof ActionPhase>,
) => {
  const { filters, toggleFilter } = useQueryFilters()
  const menuItems: MenuItem[] = useMemo(() => {
    return filterConfigs
      .filter((config) => !excludeValues?.has(config.value))
      .map((config) => ({
        id: config.label,
        label: config.label,
        onClick: () => toggleFilter({ type: 'status', status: config.value }),
        selected: !!filters.status?.includes(config.value),
        type: 'item',
        icon: <StatusIcon phase={config.phase} isStatic={true} />,
      }))
  }, [filters.status, toggleFilter, excludeValues])
  return menuItems
}

export const StatusFilter = () => {
  const { filters, clearFilter } = useQueryFilters()
  const menuItems = useStatusFilterMenuItems(RUNS_LIST_HIDDEN_STATUS_VALUES)
  return (
    <PopoverMenu
      label="Status"
      items={menuItems}
      variant="filter"
      menuClassName="min-w-56"
      filterProps={{
        displayedValues: (
          <div className="flex items-center">
            {filters.status?.slice(0, 3).map((s) => (
              <StatusIcon
                key={s}
                phase={ActionPhase[s as keyof typeof ActionPhase]}
                isStatic={true}
              />
            ))}
          </div>
        ),
        valuesCount: filters.status?.length || 0,
        onClearClick: () => clearFilter(),
      }}
      closeOnItemClick={false}
    />
  )
}
