/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { EnvelopeIcon } from '@heroicons/react/24/solid'
import { useMemo } from 'react'

import { DescriptionListWrapper } from '@/components/DescriptionListWrapper'
import { hydrateNotificationRulesFromRunSpec } from '@/components/LaunchForm/Tabs/LaunchFormNotifications/notificationPayload'
import { getWebhookProvider } from '@/components/LaunchForm/Tabs/LaunchFormNotifications/webhookProviders'
import {
  NOTIFICATION_PHASE_OPTIONS,
  type NotificationRuleFormValue,
} from '@/components/LaunchForm/Tabs/types'
import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import { RunSpec } from '@/gen/flyteidl2/task/run_pb'
import { mapPhaseToDisplayString } from '@/lib/mapPhaseToDisplayString'

const formatPhases = (phases: ActionPhase[]): string => {
  const ordered = NOTIFICATION_PHASE_OPTIONS.filter((p) => phases.includes(p))
  return ordered.map((p) => mapPhaseToDisplayString[p]).join(', ')
}

const formatDestination = (rule: NotificationRuleFormValue): string => {
  if (rule.deliveryKind === 'webhook') {
    return rule.webhook?.url?.trim() || '-'
  }
  const to = rule.email?.to?.trim()
  if (to) return to
  return '-'
}

const renderDestination = (rule: NotificationRuleFormValue) => {
  const destination = formatDestination(rule)

  if (rule.deliveryKind === 'webhook') {
    // Reuse the same provider detection that powers the LaunchForm input
    // so the read-only summary mirrors what the user saw while configuring.
    // No icon when the URL doesn't match a known provider.
    const provider = getWebhookProvider(rule.webhook?.url)
    return (
      <span className="flex min-w-0 items-center gap-2">
        {provider ? (
          <span className="shrink-0">
            <provider.Mark />
          </span>
        ) : null}
        <span className="truncate" title={destination}>
          {destination}
        </span>
      </span>
    )
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <EnvelopeIcon
        className="size-4 shrink-0 text-(--system-gray-5)"
        aria-label="Email destination"
      />
      <span className="truncate" title={destination}>
        {destination}
      </span>
    </span>
  )
}

type RunInfoNotificationsProps = {
  runSpec: RunSpec | null | undefined
}

export const RunInfoNotifications = ({
  runSpec,
}: RunInfoNotificationsProps) => {
  const items = useMemo(() => {
    const rules = hydrateNotificationRulesFromRunSpec(runSpec)
    return rules.map((rule) => ({
      name: formatPhases(rule.phases),
      value: renderDestination(rule),
    }))
  }, [runSpec])

  if (items.length === 0) {
    return null
  }

  return (
    <DescriptionListWrapper
      isRawView={false}
      sections={[
        {
          id: 'Notifications',
          name: 'Notifications',
          items,
        },
      ]}
    />
  )
}
