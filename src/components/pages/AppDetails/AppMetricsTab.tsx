/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { AdvancedMetricsPlaceholder } from '@/components/Charts/AdvancedMetricsPlaceholder'
import {
  DatePickerPopover,
  quickRanges7Days,
  useDateRangeParams,
} from '@/components/DatePicker'
import { TabSection } from '@/components/TabSection'
import { APP_METRICS_UPGRADE_SOURCES } from '@/lib/constants'
import { subDays } from 'date-fns'
import { useEffect } from 'react'

export const AppMetricsTab = ({}: { appId: string | undefined }) => {
  const { dateRange, setDateRange } = useDateRangeParams()

  // Sync the DatePicker to "Last 7 days" when no existing date params provided
  useEffect(() => {
    if (!dateRange) {
      const now = new Date()
      setDateRange({ from: subDays(now, 7), to: now }, 'Last 7 days')
    }
  }, [dateRange, setDateRange])

  return (
    <div>
      <div className="sticky top-0 z-20 bg-(--system-gray-2)">
        <DatePickerPopover
          labelPrefix="Requests"
          maxDaysBack={7}
          quickRanges={quickRanges7Days}
        />
      </div>
      <div className="flex flex-col gap-5 [&>*:last-child]:mb-5">
        <div className="flex gap-5">
          <TabSection heading="Replica Count">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.replicaCount}
            />
          </TabSection>
        </div>
        <div className="flex gap-5">
          <TabSection heading="Requests">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.requests}
            />
          </TabSection>
          <TabSection heading="Responses">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.responses}
            />
          </TabSection>
        </div>
        <div className="flex gap-5">
          <TabSection heading="Allocated Memory">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.allocatedMemory}
            />
          </TabSection>
          <TabSection heading="Memory Utilization">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.memoryUtilization}
            />
          </TabSection>
        </div>
        <div className="flex gap-5">
          <TabSection heading="Allocated CPU">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.allocatedCpu}
            />
          </TabSection>
          <TabSection heading="CPU Utilization">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.cpuUtilization}
            />
          </TabSection>
        </div>
        <div className="flex gap-5">
          <TabSection heading="GPU Utilization">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.gpuUtilization}
            />
          </TabSection>
          <TabSection heading="GPU Memory Allocated">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.gpuMemory}
            />
          </TabSection>
        </div>
        <div className="flex gap-5">
          <TabSection heading="GPU SM Active Cycles">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.gpuSmActiveCycles}
            />
          </TabSection>
          <TabSection heading="GPU SM Occupancy">
            <AdvancedMetricsPlaceholder
              source={APP_METRICS_UPGRADE_SOURCES.gpuSmOccupancy}
            />
          </TabSection>
        </div>
      </div>
    </div>
  )
}
