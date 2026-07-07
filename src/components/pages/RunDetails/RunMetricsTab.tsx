/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { AdvancedMetricsPlaceholder } from '@/components/Charts'
import { TabSection } from '@/components/TabSection'
import { RUN_METRICS_UPGRADE_SOURCES } from '@/lib/constants'

export const RunMetricsTab = () => {
  return (
    <div className="flex h-full flex-col gap-5 p-8 pt-0">
      <div className="flex gap-5">
        <TabSection heading="Memory Quota">
          <AdvancedMetricsPlaceholder
            source={RUN_METRICS_UPGRADE_SOURCES.memoryQuota}
          />
        </TabSection>
        <TabSection heading="CPU Cores Quota">
          <AdvancedMetricsPlaceholder
            source={RUN_METRICS_UPGRADE_SOURCES.cpuCoresQuota}
          />
        </TabSection>
      </div>
      <div className="flex gap-5">
        <TabSection heading="GPU Memory Allocated">
          <AdvancedMetricsPlaceholder
            source={RUN_METRICS_UPGRADE_SOURCES.gpuMemory}
          />
        </TabSection>
        <TabSection heading="GPU Utilization">
          <AdvancedMetricsPlaceholder
            source={RUN_METRICS_UPGRADE_SOURCES.gpuUtilization}
          />
        </TabSection>
      </div>
      <div className="flex gap-5 pb-8">
        <TabSection heading="SM Active Cycles">
          <AdvancedMetricsPlaceholder
            source={RUN_METRICS_UPGRADE_SOURCES.gpuSmActiveCycles}
          />
        </TabSection>
        <TabSection heading="SM Occupancy">
          <AdvancedMetricsPlaceholder
            source={RUN_METRICS_UPGRADE_SOURCES.gpuSmOccupancy}
          />
        </TabSection>
      </div>
    </div>
  )
}
