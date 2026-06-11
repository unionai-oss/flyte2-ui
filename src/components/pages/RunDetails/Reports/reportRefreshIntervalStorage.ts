/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

export const REPORT_IFRAME_REFRESH_STORAGE_KEY =
  'report-iframe-refresh-interval'

export type ReportRefreshInterval =
  | 'off'
  | 'auto'
  | '1s'
  | '5s'
  | '10s'
  | '30s'
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '1d'

export const REPORT_REFRESH_INTERVALS: {
  label: string
  value: ReportRefreshInterval
  ms: number | null
}[] = [
  { label: 'Off', value: 'off', ms: null },
  // { label: 'Auto', value: 'auto', ms: null }, // TODO: implement "Auto" option that uses visibility API to only refresh when user is actively viewing the tab
  { label: '1s', value: '1s', ms: 1000 },
  { label: '5s', value: '5s', ms: 5000 },
  { label: '10s', value: '10s', ms: 10000 },
  { label: '30s', value: '30s', ms: 30000 },
  { label: '1m', value: '1m', ms: 60000 },
  { label: '5m', value: '5m', ms: 300000 },
  { label: '15m', value: '15m', ms: 900000 },
  { label: '30m', value: '30m', ms: 1800000 },
  { label: '1h', value: '1h', ms: 3600000 },
  { label: '2h', value: '2h', ms: 7200000 },
  { label: '1d', value: '1d', ms: 86400000 },
]

function isReportRefreshInterval(
  value: string,
): value is ReportRefreshInterval {
  return REPORT_REFRESH_INTERVALS.some((i) => i.value === value)
}

/** Milliseconds between auto-refreshes, or `null` for Off / unknown values. */
export function getReportRefreshIntervalMs(
  value: ReportRefreshInterval | undefined,
): number | null {
  const row = REPORT_REFRESH_INTERVALS.find((i) => i.value === (value ?? 'off'))
  return row?.ms ?? null
}

export function parseStoredReportRefreshInterval(
  raw: string,
): ReportRefreshInterval {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'string' && isReportRefreshInterval(parsed))
      return parsed
  } catch {
    // not JSON — e.g. historical `localStorage.setItem(key, '30s')`
  }
  if (isReportRefreshInterval(raw)) return raw
  return 'off'
}
