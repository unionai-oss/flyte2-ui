/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import { KeyValuePair } from '@/gen/flyteidl2/core/literals_pb'

// Run name limits must match API (RunIdentifier.name in idl/common/identifier.proto).
// Character set is restricted for URL and identifier safety (no spaces or special chars).
export const RUN_NAME_MIN_LENGTH = 1
export const RUN_NAME_MAX_LENGTH = 30

/** Only letters, numbers, hyphens, and underscores (URL-safe, no spaces). */
export const RUN_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/

export const RUN_NAME_PATTERN_DESCRIPTION =
  'Run name can only contain letters, numbers, hyphens, and underscores'

export const isRunNameValid = (name: string): boolean => {
  const trimmed = name.trim()
  if (trimmed.length === 0) return false
  if (
    trimmed.length < RUN_NAME_MIN_LENGTH ||
    trimmed.length > RUN_NAME_MAX_LENGTH
  )
    return false
  return RUN_NAME_PATTERN.test(trimmed)
}

export type KVPair = { key: string; value: string }

/** Form-side representation of an `InlineRule`. */
export type NotificationDeliveryKind = 'webhook' | 'email'

export type WebhookDeliveryFormValue = {
  url: string
  headers?: KVPair[]
  bodyTemplate?: string
}

export type EmailDeliveryFormValue = {
  to: string
  cc?: string
  bcc?: string
  subject: string
  textTemplate?: string
  htmlTemplate?: string
}

export type NotificationRuleFormValue = {
  /**
   * Stable id used as the React key when rules are reordered/removed.
   * Generated client-side; not sent in the submit payload.
   */
  id: string
  phases: ActionPhase[]
  deliveryKind: NotificationDeliveryKind
  webhook?: WebhookDeliveryFormValue
  email?: EmailDeliveryFormValue
}

export type LaunchFormState = {
  envs?: KVPair[]
  labels?: KVPair[]
  interruptible?: boolean
  overwriteCache: boolean
  runName: string
  // serviceAccount: string
  inputs?: Record<string, unknown>
  formData?: Record<string, unknown>
  context?: KeyValuePair[]
}

export type LaunchFormTab =
  | 'inputs'
  | 'context'
  | 'settings'
  | 'env-vars'
  | 'labels'
  | 'debug'

/**
 * Phases that the user can select notifications for. The proto allows any
 * `ActionPhase`, but only terminal phases (success/failure variants) make
 * sense in the run-completed notification context, matching the design.
 */
export const NOTIFICATION_PHASE_OPTIONS: ActionPhase[] = [
  ActionPhase.TIMED_OUT,
  ActionPhase.ABORTED,
  ActionPhase.FAILED,
  ActionPhase.SUCCEEDED,
]

export type ErrorWithRawMessage = {
  rawMessage?: string
  name?: string
}
