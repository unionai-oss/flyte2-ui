/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

/**
 * DO_NOT_TRACK=1 (https://donottrack.sh) is the one switch shared by
 * flyte-sdk, the Flyte backend and this console. FLYTE_DISABLE_TELEMETRY opts
 * out of Flyte alone.
 */
export const TELEMETRY_OPT_OUT_VARS = [
  'DO_NOT_TRACK',
  'FLYTE_DISABLE_TELEMETRY',
] as const

const TRUTHY = ['true', '1', 'yes']

/**
 * Whether the deployment opted out of telemetry. `read` resolves an env var at
 * request time (next-runtime-env's `env` on the server), so the switch works on
 * a prebuilt image without a rebuild.
 */
export const isTelemetryDisabled = (
  read: (name: string) => string | undefined,
): boolean =>
  TELEMETRY_OPT_OUT_VARS.some((name) =>
    TRUTHY.includes((read(name) ?? '').trim().toLowerCase()),
  )
