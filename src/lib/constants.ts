/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

/** Union.ai Flyte v2 user guide (base path for topic links below). */
const UNION_AI_FLYTE_USER_GUIDE_BASE =
  'https://www.union.ai/docs/v2/flyte/user-guide'

/** Primary docs entry (same destination as the legacy BYOC user guide URL). */
export const FLYTE_DOCS_HOME_URL = UNION_AI_FLYTE_USER_GUIDE_BASE

/** In-app documentation nav (user guide landing page). */
export const FLYTE_DOCS_FLYTE2_URL = UNION_AI_FLYTE_USER_GUIDE_BASE

/** Task reports / live output in the UI. */
export const FLYTE_DOCS_REPORTS_URL = `${UNION_AI_FLYTE_USER_GUIDE_BASE}/task-programming/reports/`

/** Flyte Apps (intro). */
export const FLYTE_DOCS_APPS_URL = `${UNION_AI_FLYTE_USER_GUIDE_BASE}/core-concepts/introducing-apps/`

/** `flyte deploy` and Flyte CLI reference. */
export const FLYTE_DOCS_FLYTE_CLI_DEPLOY_URL =
  'https://www.union.ai/docs/v2/flyte/api-reference/flyte-cli/#flyte-deploy'

/** Licensed edition / upgrade CTA. */
export const FLYTE_LICENSED_EDITION_INFO_URL = 'https://www.union.ai/pricing'

/** Granular `source` query param values for licensed-edition upgrade links. */
export const LICENSED_EDITION_UPGRADE_SOURCES = {
  sidebarEnterpriseCta: 'sidebar-enterprise-cta',
  runCode: 'run-code',
  triggerActivity: 'trigger-activity',
  taskCode: 'task-code',
  appCode: 'app-code',
  runExplainError: 'run-explain-error',
} as const

/** Per-chart upgrade sources on the run metrics tab. */
export const RUN_METRICS_UPGRADE_SOURCES = {
  memoryQuota: 'run-metrics-memory-quota',
  cpuCoresQuota: 'run-metrics-cpu-cores-quota',
  gpuMemory: 'run-metrics-gpu-memory',
  gpuUtilization: 'run-metrics-gpu-utilization',
  gpuSmActiveCycles: 'run-metrics-gpu-sm-active-cycles',
  gpuSmOccupancy: 'run-metrics-gpu-sm-occupancy',
} as const

/** Per-chart upgrade sources on the app metrics tab. */
export const APP_METRICS_UPGRADE_SOURCES = {
  replicaCount: 'app-metrics-replica-count',
  requests: 'app-metrics-requests',
  responses: 'app-metrics-responses',
  allocatedMemory: 'app-metrics-allocated-memory',
  memoryUtilization: 'app-metrics-memory-utilization',
  allocatedCpu: 'app-metrics-allocated-cpu',
  cpuUtilization: 'app-metrics-cpu-utilization',
  gpuUtilization: 'app-metrics-gpu-utilization',
  gpuMemory: 'app-metrics-gpu-memory',
  gpuSmActiveCycles: 'app-metrics-gpu-sm-active-cycles',
  gpuSmOccupancy: 'app-metrics-gpu-sm-occupancy',
} as const

export type LicensedEditionUpgradeSource =
  | (typeof LICENSED_EDITION_UPGRADE_SOURCES)[keyof typeof LICENSED_EDITION_UPGRADE_SOURCES]
  | (typeof RUN_METRICS_UPGRADE_SOURCES)[keyof typeof RUN_METRICS_UPGRADE_SOURCES]
  | (typeof APP_METRICS_UPGRADE_SOURCES)[keyof typeof APP_METRICS_UPGRADE_SOURCES]

export function getLicensedEditionInfoUrl(
  source: LicensedEditionUpgradeSource,
): string {
  const url = new URL(FLYTE_LICENSED_EDITION_INFO_URL)
  url.searchParams.set('source', source)
  return url.toString()
}

/** Support contact (e.g. 404 page). */
export const SUPPORT_CONTACT_MAILTO_URL = 'mailto:support@union.ai'

/** @deprecated Use FLYTE_DOCS_HOME_URL */
export const DOCS_BYOC_USER_GUIDE_URL = FLYTE_DOCS_HOME_URL

/** Canonical public repository for this UI (OSS distribution). */
export const FLYTE2_UI_REPO_URL = 'https://github.com/unionai-oss/flyte2-ui'

/** Union License full text in the canonical repository (same file is shipped as `UNION-LICENSE.txt` in this tree). */
export const FLYTE2_UI_LICENSE_URL =
  'https://github.com/unionai-oss/flyte2-ui/blob/main/UNION-LICENSE.txt'
