/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { render, screen } from '@testing-library/react'
import { TaskLog_LinkType } from '@/gen/flyteidl2/core/execution_pb'
import { ActionAttempt } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { describe, expect, it } from 'vitest'

import { ActionDashboardLinks } from './ActionDashboardLinks'

function attemptWithLinks(
  logInfo: NonNullable<ActionAttempt['logInfo']>,
): ActionAttempt {
  return { logInfo } as ActionAttempt
}

describe('ActionDashboardLinks', () => {
  it('renders dashboard and external links safely on the summary', () => {
    const attempt = attemptWithLinks([
      {
        name: 'Provider Console',
        uri: 'https://provider.example/jobs/1',
        ready: true,
        linkType: TaskLog_LinkType.EXTERNAL,
      },
      {
        name: 'Kubernetes Dashboard',
        uri: 'https://dashboard.example/pods/example',
        ready: true,
        linkType: TaskLog_LinkType.DASHBOARD,
      },
    ])

    render(<ActionDashboardLinks attempt={attempt} />)

    for (const name of ['Provider Console', 'Kubernetes Dashboard']) {
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'rel',
        'noopener noreferrer',
      )
      expect(screen.getByRole('link', { name })).toHaveAttribute(
        'target',
        '_blank',
      )
    }
  })

  it('deduplicates links with the same name and URL', () => {
    const link = {
      name: 'Provider Console',
      uri: 'https://provider.example/jobs/1',
      ready: true,
    }
    const attempt = attemptWithLinks([
      { ...link, linkType: TaskLog_LinkType.EXTERNAL },
      { ...link, linkType: TaskLog_LinkType.DASHBOARD },
    ])

    render(<ActionDashboardLinks attempt={attempt} />)

    expect(
      screen.getAllByRole('link', { name: 'Provider Console' }),
    ).toHaveLength(1)
  })

  it('does not make pending or empty links interactive', () => {
    const attempt = attemptWithLinks([
      {
        name: 'Pending Console',
        uri: 'https://provider.example/jobs/pending',
        ready: false,
        linkType: TaskLog_LinkType.EXTERNAL,
      },
      {
        name: 'Empty Console',
        uri: '',
        ready: true,
        linkType: TaskLog_LinkType.EXTERNAL,
      },
    ])

    render(<ActionDashboardLinks attempt={attempt} />)

    expect(screen.getByText('Pending Console')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Pending Console' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Empty Console')).not.toBeInTheDocument()
  })

  it('renders nothing when no supported links are available', () => {
    const attempt = attemptWithLinks([
      {
        name: 'IDE',
        uri: 'https://ide.example/session',
        ready: true,
        linkType: TaskLog_LinkType.IDE,
      },
    ])

    const { container } = render(<ActionDashboardLinks attempt={attempt} />)

    expect(container).toBeEmptyDOMElement()
  })
})
