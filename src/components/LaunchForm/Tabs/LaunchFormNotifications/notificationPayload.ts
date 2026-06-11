/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { create } from '@bufbuild/protobuf'

import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import {
  DeliveryConfigTemplateSchema,
  EmailDeliveryTemplateSchema,
  EmailRecipientSchema,
  HttpMethod,
  InlineEmailTemplateSchema,
  WebhookDeliveryTemplateSchema,
} from '@/gen/flyteidl2/notification/definition_pb'
import {
  type InlineRule,
  InlineRuleListSchema,
  InlineRuleSchema,
  type RunSpec,
} from '@/gen/flyteidl2/task/run_pb'

import {
  type EmailDeliveryFormValue,
  type KVPair,
  NOTIFICATION_PHASE_OPTIONS,
  type NotificationRuleFormValue,
  type WebhookDeliveryFormValue,
} from '../types'

// ---------------------------------------------------------------------------
// Form value -> wire format
// ---------------------------------------------------------------------------

const splitEmails = (raw: string | undefined): string[] => {
  if (!raw) return []
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const buildWebhookTemplate = (webhook: WebhookDeliveryFormValue) => {
  const url = webhook.url.trim()
  if (!url) return undefined
  // Backend requires every header key AND value to be non-empty (min_len=1).
  const headers: Record<string, string> = {}
  for (const kv of webhook.headers ?? []) {
    const k = kv.key?.trim()
    const v = kv.value?.trim() ?? ''
    if (!k || !v) continue
    headers[k] = v
  }
  return create(WebhookDeliveryTemplateSchema, {
    url,
    // Backend rejects HTTP_METHOD_UNSPECIFIED. POST is the only HTTP method
    // that makes sense for a webhook destination, so we hardcode it rather
    // than expose the choice in the UI.
    method: HttpMethod.POST,
    headers,
    bodyTemplate: webhook.bodyTemplate?.trim() ?? '',
  })
}

const buildEmailTemplate = (email: EmailDeliveryFormValue) => {
  const to = splitEmails(email.to)
  const subject = email.subject?.trim() ?? ''
  if (to.length === 0 || !subject) return undefined
  const text = email.textTemplate?.trim() ?? ''
  // Backend requires html_template to be non-empty. If the user hasn't
  // supplied one, fall back to wrapping the text body, or to a minimal
  // template using the subject — both are valid Go templates.
  const htmlTemplate =
    email.htmlTemplate?.trim() ||
    (text ? `<p>${text}</p>` : `<p>${subject}</p>`)
  const toRecipients = to.map((address) =>
    create(EmailRecipientSchema, { address }),
  )
  const ccRecipients = splitEmails(email.cc).map((address) =>
    create(EmailRecipientSchema, { address }),
  )
  const bccRecipients = splitEmails(email.bcc).map((address) =>
    create(EmailRecipientSchema, { address }),
  )
  return create(EmailDeliveryTemplateSchema, {
    to: toRecipients,
    cc: ccRecipients,
    bcc: bccRecipients,
    content: {
      case: 'inline',
      value: create(InlineEmailTemplateSchema, {
        subject,
        textTemplate: text,
        htmlTemplate,
      }),
    },
  })
}

const buildInlineRule = (
  rule: NotificationRuleFormValue,
): InlineRule | null => {
  if (rule.phases.length === 0) return null
  const template =
    rule.deliveryKind === 'webhook'
      ? rule.webhook && buildWebhookTemplate(rule.webhook)
      : rule.email && buildEmailTemplate(rule.email)
  if (!template) return null
  return create(InlineRuleSchema, {
    onPhases: rule.phases,
    delivery: {
      case: 'deliveryTemplate',
      value: create(DeliveryConfigTemplateSchema, {
        [rule.deliveryKind]: template,
      }),
    },
  })
}

/**
 * Build the `notification_settings` oneof for the run spec from the form
 * representation. Returns undefined when there are no complete rules so the
 * field stays unset on the wire.
 */
export const buildNotificationSettings = (
  rules: NotificationRuleFormValue[] | undefined,
): RunSpec['notificationSettings'] | undefined => {
  if (!rules || rules.length === 0) return undefined
  const inlineRules = rules
    .map(buildInlineRule)
    .filter((r): r is InlineRule => r !== null)
  if (inlineRules.length === 0) return undefined
  return {
    case: 'notificationRules',
    value: create(InlineRuleListSchema, { rules: inlineRules }),
  }
}

// ---------------------------------------------------------------------------
// Wire format -> form value
// ---------------------------------------------------------------------------

/**
 * Internal "loose" shape used when reading inline rules. The same data can
 * arrive as a typed protobuf-es Message OR as flat JSON (camelCase or
 * snake_case) depending on whether deserialization was performed by `connect`
 * or by another upstream serializer. We accept all of them.
 */
type FlatInlineRule = {
  onPhases?: InlineRule['onPhases']
  on_phases?: InlineRule['onPhases']
  delivery?: InlineRule['delivery']
  deliveryTemplate?: {
    webhook?: {
      url?: string
      headers?: Record<string, string>
      bodyTemplate?: string
      body_template?: string
    }
    email?: {
      to?: { address?: string }[]
      cc?: { address?: string }[]
      bcc?: { address?: string }[]
      content?: { case?: string; value?: unknown }
      inline?: InlineEmailFlat
    }
  }
  delivery_template?: FlatInlineRule['deliveryTemplate']
}

type InlineEmailFlat = {
  subject?: string
  textTemplate?: string
  text_template?: string
  htmlTemplate?: string
  html_template?: string
}

// Map proto enum string names to numeric values (wire JSON uses strings).
const ACTION_PHASE_BY_NAME: Record<string, ActionPhase> = {
  ACTION_PHASE_QUEUED: ActionPhase.QUEUED,
  ACTION_PHASE_WAITING_FOR_RESOURCES: ActionPhase.WAITING_FOR_RESOURCES,
  ACTION_PHASE_INITIALIZING: ActionPhase.INITIALIZING,
  ACTION_PHASE_RUNNING: ActionPhase.RUNNING,
  ACTION_PHASE_SUCCEEDED: ActionPhase.SUCCEEDED,
  ACTION_PHASE_FAILED: ActionPhase.FAILED,
  ACTION_PHASE_ABORTED: ActionPhase.ABORTED,
  ACTION_PHASE_TIMED_OUT: ActionPhase.TIMED_OUT,
}

const phaseFromAny = (p: unknown): ActionPhase =>
  typeof p === 'number'
    ? (p as ActionPhase)
    : (ACTION_PHASE_BY_NAME[p as string] ?? ActionPhase.UNSPECIFIED)

const SELECTABLE_PHASES = new Set<ActionPhase>(NOTIFICATION_PHASE_OPTIONS)

/**
 * Restrict hydrated phases to the set the UI actually renders chips for. The
 * proto allows any `ActionPhase`, but the editor only lets the user toggle
 * terminal phases — so silently keeping non-terminal phases (or
 * `UNSPECIFIED`, returned by `phaseFromAny` for unknown wire values) would
 * leave hidden, undeletable entries on the rule. Dedupes too, defensively.
 *
 * If filtering empties the array, validation will surface "select at least
 * one phase" so the user can't submit a rule that doesn't match the UI.
 */
const sanitizePhases = (phases: unknown[] | undefined): ActionPhase[] => {
  if (!phases) return []
  const seen = new Set<ActionPhase>()
  const out: ActionPhase[] = []
  for (const raw of phases) {
    const phase = phaseFromAny(raw)
    if (!SELECTABLE_PHASES.has(phase)) continue
    if (seen.has(phase)) continue
    seen.add(phase)
    out.push(phase)
  }
  return out
}

const isOneofShape = (v: unknown): v is RunSpec['notificationSettings'] =>
  !!v &&
  typeof v === 'object' &&
  'case' in (v as object) &&
  'value' in (v as object)

/**
 * Defensive resolver: pulls the inline rule list from a `runSpec`-shaped
 * object whether it came back as a typed protobuf-es Message (with the
 * `notificationSettings` oneof) or as a flat JSON object (with
 * `notificationRules` directly on the spec, as the wire JSON uses).
 */
const resolveInlineRules = (
  runSpec: RunSpec | Record<string, unknown> | undefined | null,
): FlatInlineRule[] | undefined => {
  if (!runSpec) return undefined
  const settings = (runSpec as RunSpec).notificationSettings
  if (settings && settings.case === 'notificationRules') {
    return settings.value.rules as FlatInlineRule[]
  }
  const flat =
    (runSpec as Record<string, unknown>).notificationRules ??
    (runSpec as Record<string, unknown>).notification_rules
  if (
    flat &&
    typeof flat === 'object' &&
    Array.isArray((flat as { rules?: unknown }).rules)
  ) {
    return (flat as { rules: FlatInlineRule[] }).rules
  }
  return undefined
}

type ResolvedTemplate = NonNullable<FlatInlineRule['deliveryTemplate']>

const resolveDeliveryTemplate = (rule: FlatInlineRule): ResolvedTemplate => {
  if (rule.delivery?.case === 'deliveryTemplate') {
    // The typed proto-es message shape is a structural superset of our loose
    // FlatInlineRule shape, so this cast is safe.
    return rule.delivery.value as unknown as ResolvedTemplate
  }
  return rule.deliveryTemplate ?? rule.delivery_template ?? {}
}

const headersToKVPairs = (
  headers: Record<string, string> | undefined,
): KVPair[] =>
  Object.entries(headers ?? {}).map(([key, value]) => ({
    key,
    value: value as string,
  }))

const recipientsToString = (
  recipients: { address?: string }[] | undefined,
): string =>
  (recipients ?? [])
    .map((r) => r?.address ?? '')
    .filter(Boolean)
    .join(', ')

const resolveInlineEmail = (
  email: NonNullable<FlatInlineRule['deliveryTemplate']>['email'],
): InlineEmailFlat | undefined => {
  if (!email) return undefined
  if (email.content?.case === 'inline') {
    return email.content.value as InlineEmailFlat
  }
  return email.inline
}

const hydrateRule = (
  rule: FlatInlineRule,
  index: number,
): NotificationRuleFormValue | null => {
  const phases = sanitizePhases(
    (rule.onPhases ?? rule.on_phases ?? []) as unknown[],
  )
  const { webhook, email } = resolveDeliveryTemplate(rule)
  // Stable id keyed on index so form `reset()` comparisons don't churn.
  const id = `hydrated-${index}`

  if (webhook?.url) {
    return {
      id,
      phases,
      deliveryKind: 'webhook',
      webhook: {
        url: webhook.url,
        headers: headersToKVPairs(webhook.headers),
        bodyTemplate: webhook.bodyTemplate ?? webhook.body_template ?? '',
      },
    }
  }
  if (email) {
    const inline = resolveInlineEmail(email)
    return {
      id,
      phases,
      deliveryKind: 'email',
      email: {
        to: recipientsToString(email.to),
        cc: recipientsToString(email.cc),
        bcc: recipientsToString(email.bcc),
        subject: inline?.subject ?? '',
        textTemplate: inline?.textTemplate ?? inline?.text_template ?? '',
        htmlTemplate: inline?.htmlTemplate ?? inline?.html_template ?? '',
      },
    }
  }
  // Stored-config rules (referenced by name) aren't editable in this form.
  return null
}

/**
 * Convert an existing run's notification config into form values so existing
 * rules can be prepopulated when rerunning an action.
 *
 * Accepts either the full `runSpec` (preferred) or the `notificationSettings`
 * oneof for backwards compatibility. Rules that reference a stored delivery
 * config (rather than an inline template) are skipped because the editor
 * only supports inline templates.
 */
export const hydrateNotificationRulesFromRunSpec = (
  source:
    | RunSpec
    | RunSpec['notificationSettings']
    | Record<string, unknown>
    | undefined
    | null,
): NotificationRuleFormValue[] => {
  let inlineRules: FlatInlineRule[] | undefined
  if (isOneofShape(source)) {
    if (source.case === 'notificationRules') {
      inlineRules = source.value.rules as FlatInlineRule[]
    }
  } else {
    inlineRules = resolveInlineRules(source as RunSpec | undefined)
  }
  if (!inlineRules) return []
  return inlineRules
    .map(hydrateRule)
    .filter((r): r is NotificationRuleFormValue => r !== null)
}
