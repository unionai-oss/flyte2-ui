/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { render, screen } from '@testing-library/react'
import { ActionDetails } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/hooks/useOrg', () => ({ useOrg: () => 'testorg' }))
vi.mock('@/hooks/useTaskDetails', () => ({
  useTaskDetails: () => ({ data: null }),
}))
vi.mock('@/lib/windowUtils', () => ({
  getLocation: () => ({ href: 'https://example.test/run/action' }),
}))
vi.mock('@/components/CopyButton', () => ({
  CopyButton: () => null,
}))
vi.mock('@/components/CopyButtonWithTooltip', () => ({
  CopyButtonWithTooltip: () => null,
}))

import { ActionMetadata } from './ActionMetadata'

function taskAction(taskType?: string): ActionDetails {
  return {
    id: { name: 'a0' },
    metadata: {
      spec: {
        case: 'task',
        value: {
          id: {
            org: 'testorg',
            project: 'testproject',
            domain: 'development',
            name: 'example.tasks.run',
            version: 'v1',
          },
          taskType,
          shortName: 'example-task',
        },
      },
    },
    spec: {
      case: 'task',
      value: {
        taskTemplate: {
          id: {
            org: 'testorg',
            project: 'testproject',
            domain: 'development',
            name: 'example.tasks.run',
            version: 'v1',
          },
        },
      },
    },
  } as unknown as ActionDetails
}

describe('ActionMetadata', () => {
  it('renders the serialized task type independently of the display name', () => {
    render(<ActionMetadata actionDetails={taskAction('python')} />)

    expect(screen.getByText('example-task')).toBeVisible()
    expect(screen.getByTestId('action-task-type')).toHaveTextContent('python')
  })

  it('omits task type metadata when it is unavailable', () => {
    render(<ActionMetadata actionDetails={taskAction()} />)

    expect(screen.queryByTestId('action-task-type')).not.toBeInTheDocument()
  })
})
