/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { GithubIcon } from '@/components/icons/GithubIcon'
import { PagerDutyIcon } from '@/components/icons/PagerDutyIcon'
import { SlackIcon } from '@/components/icons/SlackIcon'

export type WebhookProviderId = 'slack' | 'pagerduty' | 'github'

type WebhookProvider = {
  id: WebhookProviderId
  /** Lowercase brand name to display next to the icon. */
  label: string
  /** Renderable mark (icon, possibly wrapped with brand background). */
  Mark: React.ComponentType
}

const SlackMark = () => <SlackIcon className="size-4" />

const PagerDutyMark = () => (
  <span className="inline-flex size-4 items-center justify-center rounded-sm bg-[#06AC38] text-white">
    <PagerDutyIcon className="h-2.5" />
  </span>
)

const GithubMark = () => <GithubIcon className="size-4 text-(--system-white)" />

const PROVIDERS: WebhookProvider[] = [
  { id: 'slack', label: 'slack', Mark: SlackMark },
  { id: 'pagerduty', label: 'pagerduty', Mark: PagerDutyMark },
  { id: 'github', label: 'github', Mark: GithubMark },
]

const matchProvider = (host: string): WebhookProviderId | null => {
  if (host === 'hooks.slack.com' || host.endsWith('.slack.com')) return 'slack'
  // Match the apex domain or any subdomain, but not a host that just happens
  // to end in the brand name (e.g. `evilpagerduty.com`).
  if (host === 'pagerduty.com' || host.endsWith('.pagerduty.com'))
    return 'pagerduty'
  // GitHub webhook receivers are the REST API host (e.g.
  // `https://api.github.com/repos/{owner}/{repo}/dispatches`).
  if (host === 'api.github.com' || host.endsWith('.github.com')) return 'github'
  return null
}

/**
 * Best-effort detection of well-known webhook providers from the URL so we can
 * surface a recognizable brand mark next to the URL input.
 */
export const getWebhookProvider = (
  url: string | undefined,
): WebhookProvider | null => {
  if (!url) return null
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
  const id = matchProvider(host)
  return id ? (PROVIDERS.find((p) => p.id === id) ?? null) : null
}

type WebhookProviderMarkProps = {
  url: string | undefined
}

/** Renders the provider icon + label in front of a webhook URL when detected. */
export const WebhookProviderMark = ({ url }: WebhookProviderMarkProps) => {
  const provider = getWebhookProvider(url)
  if (!provider) return null
  const { Mark, label } = provider
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-(--system-gray-5)"
      aria-label={`${label} webhook`}
    >
      <Mark />
      {label}
    </span>
  )
}
