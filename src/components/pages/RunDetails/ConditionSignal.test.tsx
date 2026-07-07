/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import type { Literal } from '@/gen/flyteidl2/core/literals_pb'
import type { LiteralType } from '@/gen/flyteidl2/core/types_pb'
import { SimpleType } from '@/gen/flyteidl2/core/types_pb'
import type { ActionDetails } from '@/gen/flyteidl2/workflow/run_definition_pb'
import { ConditionPromptType } from '@/gen/flyteidl2/workflow/run_definition_pb'

import {
  buildPayloadValue,
  ConditionSignal,
  formatTimeout,
  getConditionTypeLabel,
  getSignaledValueLabel,
  getSimpleType,
} from './ConditionSignal'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockSignalEvent,
  mockActionData,
  mockUseActionData,
  mockRefetchActionData,
  mockClusterEndpoint,
} = vi.hoisted(() => ({
  mockSignalEvent: vi.fn(),
  mockActionData: { current: undefined as unknown },
  mockUseActionData: vi.fn(),
  mockRefetchActionData: vi.fn(),
  mockClusterEndpoint: { current: 'https://dataplane.example' as unknown },
}))

vi.mock('@/hooks/useConnectRpc', () => ({
  useConnectRpcClient: () => ({ signalEvent: mockSignalEvent }),
}))

vi.mock('@/hooks/useActionData', () => ({
  useActionData: (props: { enabled?: boolean }) => {
    mockUseActionData(props)
    return {
      data: mockActionData.current,
      refetch: mockRefetchActionData,
      clusterEndpoint: mockClusterEndpoint.current,
    }
  },
}))

vi.mock('@/lib/dateUtils', () => ({
  toDateFormat: () => 'formatted-date',
}))

vi.mock('@/components/MarkdownRenderer', () => ({
  MarkdownContent: ({ text }: { text: string }) => (
    <div data-testid="markdown">{text}</div>
  ),
}))

vi.mock('@/components/CopyButton', () => ({
  CopyButton: () => <button data-testid="copy-button">copy</button>,
}))

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ text }: { text?: string }) => (
    <div data-testid="loading-spinner">{text}</div>
  ),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const simpleLiteralType = (value: SimpleType): LiteralType =>
  ({ type: { case: 'simple', value } }) as unknown as LiteralType

/** Builds a primitive scalar Literal as stored in a resolved condition's outputs. */
const primitiveLiteral = (
  primCase: 'boolean' | 'integer' | 'floatValue' | 'stringValue' | 'datetime',
  primValue: unknown,
): Literal =>
  ({
    value: {
      case: 'scalar',
      value: {
        value: {
          case: 'primitive',
          value: { value: { case: primCase, value: primValue } },
        },
      },
    },
  }) as unknown as Literal

interface SignalledByOptions {
  firstName?: string
  lastName?: string
  email?: string
  subject?: string
}

interface MakeDetailsOptions {
  simpleType?: SimpleType
  phase?: ActionPhase
  prompt?: string
  promptType?: ConditionPromptType
  description?: string
  timeoutSeconds?: bigint
  webhookUrl?: string
  withId?: boolean
  withParent?: boolean
  signalInfoOutput?: Literal
  signalledBy?: SignalledByOptions
}

/** Builds the EnrichedIdentity carried on a resolved condition's signalInfo. */
const enrichedUser = ({
  firstName = '',
  lastName = '',
  email = '',
  subject,
}: SignalledByOptions) => ({
  principal: {
    case: 'user',
    value: {
      id: subject ? { subject } : undefined,
      spec: { firstName, lastName, email },
    },
  },
})

const makeActionDetails = ({
  simpleType = SimpleType.BOOLEAN,
  phase = ActionPhase.PAUSED,
  prompt,
  promptType,
  description,
  timeoutSeconds,
  webhookUrl,
  withId = true,
  withParent = true,
  signalInfoOutput,
  signalledBy,
}: MakeDetailsOptions = {}): ActionDetails =>
  ({
    id: withId
      ? {
          name: 'action-1',
          run: { name: 'run-1', project: 'proj', domain: 'dom' },
        }
      : undefined,
    spec: {
      case: 'condition',
      value: {
        name: 'my-event',
        type: simpleLiteralType(simpleType),
        prompt,
        promptType,
        description,
        timeout:
          timeoutSeconds !== undefined
            ? { seconds: timeoutSeconds }
            : undefined,
        webhook: webhookUrl ? { url: webhookUrl } : undefined,
      },
    },
    metadata: {
      parent: withParent ? 'parent-action' : '',
      spec: { case: 'condition', value: { name: 'my-event' } },
    },
    status: { phase, endTime: { seconds: 1700000000n } },
    result:
      signalInfoOutput || signalledBy
        ? {
            case: 'signalInfo',
            value: {
              output: signalInfoOutput,
              signalledBy: signalledBy ? enrichedUser(signalledBy) : undefined,
            },
          }
        : undefined,
  }) as unknown as ActionDetails

const lastSignalPayload = () => {
  const req = mockSignalEvent.mock.calls.at(-1)?.[0]
  return req?.payload?.value
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

describe('getSimpleType', () => {
  it('returns the simple type for a simple LiteralType', () => {
    expect(getSimpleType(simpleLiteralType(SimpleType.INTEGER))).toBe(
      SimpleType.INTEGER,
    )
  })

  it('returns undefined for a non-simple LiteralType', () => {
    expect(
      getSimpleType({
        type: { case: 'collectionType', value: {} },
      } as unknown as LiteralType),
    ).toBeUndefined()
  })

  it('returns undefined when the type is missing', () => {
    expect(getSimpleType(undefined)).toBeUndefined()
  })
})

describe('getConditionTypeLabel', () => {
  it.each([
    [SimpleType.INTEGER, 'int'],
    [SimpleType.FLOAT, 'float'],
    [SimpleType.STRING, 'string'],
    [SimpleType.BOOLEAN, 'bool'],
  ])('labels simple type %s as %s', (type, label) => {
    expect(getConditionTypeLabel(simpleLiteralType(type))).toBe(label)
  })

  it('returns "-" for a signalable-incompatible simple type (e.g. DATETIME)', () => {
    expect(getConditionTypeLabel(simpleLiteralType(SimpleType.DATETIME))).toBe(
      '-',
    )
  })

  it('falls back to the oneof case name for non-simple types', () => {
    expect(
      getConditionTypeLabel({
        type: { case: 'collectionType', value: {} },
      } as unknown as LiteralType),
    ).toBe('collectionType')
  })

  it('returns "-" when the type is missing', () => {
    expect(getConditionTypeLabel(undefined)).toBe('-')
  })
})

describe('buildPayloadValue', () => {
  describe('boolean', () => {
    it('coerces "true" to true', () => {
      expect(buildPayloadValue(SimpleType.BOOLEAN, 'true')).toEqual({
        case: 'boolValue',
        value: true,
      })
    })

    it.each(['false', 'anything-else', ''])('coerces %s to false', (raw) => {
      expect(buildPayloadValue(SimpleType.BOOLEAN, raw)).toEqual({
        case: 'boolValue',
        value: false,
      })
    })
  })

  describe('integer', () => {
    it('parses a positive integer', () => {
      expect(buildPayloadValue(SimpleType.INTEGER, '42')).toEqual({
        case: 'intValue',
        value: 42n,
      })
    })

    it('parses a negative integer', () => {
      expect(buildPayloadValue(SimpleType.INTEGER, '-5')).toEqual({
        case: 'intValue',
        value: -5n,
      })
    })

    it('trims surrounding whitespace', () => {
      expect(buildPayloadValue(SimpleType.INTEGER, '  7  ')).toEqual({
        case: 'intValue',
        value: 7n,
      })
    })

    it.each(['1.5', 'abc', '', '  '])('rejects non-integer input %s', (raw) => {
      expect(buildPayloadValue(SimpleType.INTEGER, raw)).toBeNull()
    })
  })

  describe('float', () => {
    it('parses a decimal', () => {
      expect(buildPayloadValue(SimpleType.FLOAT, '3.14')).toEqual({
        case: 'floatValue',
        value: 3.14,
      })
    })

    it('parses zero', () => {
      expect(buildPayloadValue(SimpleType.FLOAT, '0')).toEqual({
        case: 'floatValue',
        value: 0,
      })
    })

    it.each(['', '   ', 'abc'])('rejects non-numeric input %s', (raw) => {
      expect(buildPayloadValue(SimpleType.FLOAT, raw)).toBeNull()
    })
  })

  describe('string', () => {
    it('passes the raw string through', () => {
      expect(buildPayloadValue(SimpleType.STRING, 'hello')).toEqual({
        case: 'stringValue',
        value: 'hello',
      })
    })

    it('allows an empty string', () => {
      expect(buildPayloadValue(SimpleType.STRING, '')).toEqual({
        case: 'stringValue',
        value: '',
      })
    })
  })

  it('returns null for an unsupported type', () => {
    expect(buildPayloadValue(SimpleType.DATETIME, 'x')).toBeNull()
  })

  it('returns null when the type is undefined', () => {
    expect(buildPayloadValue(undefined, 'x')).toBeNull()
  })
})

describe('getSignaledValueLabel', () => {
  it('formats boolean true', () => {
    expect(getSignaledValueLabel(primitiveLiteral('boolean', true))).toBe(
      'Yes (True)',
    )
  })

  it('formats boolean false', () => {
    expect(getSignaledValueLabel(primitiveLiteral('boolean', false))).toBe(
      'No (False)',
    )
  })

  it('formats an integer', () => {
    expect(getSignaledValueLabel(primitiveLiteral('integer', 42n))).toBe('42')
  })

  it('formats a float', () => {
    expect(getSignaledValueLabel(primitiveLiteral('floatValue', 3.5))).toBe(
      '3.5',
    )
  })

  it('formats a string', () => {
    expect(getSignaledValueLabel(primitiveLiteral('stringValue', 'hi'))).toBe(
      'hi',
    )
  })

  it('returns undefined for an unhandled primitive (datetime)', () => {
    expect(
      getSignaledValueLabel(primitiveLiteral('datetime', {})),
    ).toBeUndefined()
  })

  it('returns undefined when the literal is missing', () => {
    expect(getSignaledValueLabel(undefined)).toBeUndefined()
  })

  it('returns undefined when the literal is not a scalar primitive', () => {
    expect(
      getSignaledValueLabel({
        value: { case: 'collection', value: {} },
      } as unknown as Literal),
    ).toBeUndefined()
  })
})

describe('formatTimeout', () => {
  it.each([
    [undefined, undefined],
    [0n, undefined],
    [-5n, undefined],
    [3600n, '1 hrs'],
    [7200n, '2 hrs'],
    [60n, '1 min'],
    [3660n, '61 min'],
    [90n, '90s'],
    [45n, '45s'],
  ])('formats %s as %s', (seconds, expected) => {
    expect(formatTimeout(seconds as bigint | undefined)).toBe(expected)
  })
})

// ── Component ─────────────────────────────────────────────────────────────────

describe('ConditionSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignalEvent.mockResolvedValue({})
    mockActionData.current = undefined
    mockClusterEndpoint.current = 'https://dataplane.example'
  })

  const lastUseActionDataProps = () =>
    mockUseActionData.mock.calls.at(-1)?.[0] as
      | { enabled?: boolean }
      | undefined

  describe('header', () => {
    it('renders the condition name, data type, timeout and webhook', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            timeoutSeconds: 3600n,
            webhookUrl: 'https://example.com/hook',
          })}
        />,
      )
      expect(screen.getByText('Condition: my-event')).toBeInTheDocument()
      expect(screen.getByText('bool')).toBeInTheDocument()
      expect(screen.getByText('1 hrs')).toBeInTheDocument()
      expect(screen.getByText('https://example.com/hook')).toBeInTheDocument()
    })

    it('renders a "-" timeout when none is set', () => {
      render(<ConditionSignal actionDetails={makeActionDetails()} />)
      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })

  describe('prompt rendering', () => {
    it('renders the prompt as markdown by default', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ prompt: '## Approve?' })}
        />,
      )
      expect(screen.getByTestId('markdown')).toHaveTextContent('## Approve?')
    })

    it('renders the prompt as plain text when promptType is TEXT', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            prompt: 'Approve?',
            promptType: ConditionPromptType.TEXT,
          })}
        />,
      )
      expect(screen.queryByTestId('markdown')).not.toBeInTheDocument()
      expect(screen.getByText('Approve?')).toBeInTheDocument()
    })

    it('renders the description', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ description: 'Some context' })}
        />,
      )
      expect(screen.getByText('Some context')).toBeInTheDocument()
    })
  })

  describe('boolean controls', () => {
    it('signals true when "Yes (True)" is clicked', async () => {
      render(<ConditionSignal actionDetails={makeActionDetails()} />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Yes (True)' }))
      })
      expect(mockSignalEvent).toHaveBeenCalledTimes(1)
      expect(lastSignalPayload()).toEqual({ case: 'boolValue', value: true })
    })

    it('signals false when "No (False)" is clicked', async () => {
      render(<ConditionSignal actionDetails={makeActionDetails()} />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'No (False)' }))
      })
      expect(lastSignalPayload()).toEqual({ case: 'boolValue', value: false })
    })

    it('passes the parent action name on the request', async () => {
      render(<ConditionSignal actionDetails={makeActionDetails()} />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Yes (True)' }))
      })
      expect(mockSignalEvent.mock.calls[0][0].parentActionName).toBe(
        'parent-action',
      )
    })
  })

  describe('string controls', () => {
    it('signals the entered string value', async () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ simpleType: SimpleType.STRING })}
        />,
      )
      fireEvent.change(screen.getByPlaceholderText('string'), {
        target: { value: 'hello world' },
      })
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Signal' }))
      })
      expect(lastSignalPayload()).toEqual({
        case: 'stringValue',
        value: 'hello world',
      })
    })
  })

  describe('numeric controls', () => {
    it('signals an integer on click', async () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ simpleType: SimpleType.INTEGER })}
        />,
      )
      fireEvent.change(screen.getByPlaceholderText('int'), {
        target: { value: '42' },
      })
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Signal' }))
      })
      expect(lastSignalPayload()).toEqual({ case: 'intValue', value: 42n })
    })

    it('signals an integer when Enter is pressed', async () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ simpleType: SimpleType.INTEGER })}
        />,
      )
      const input = screen.getByPlaceholderText('int')
      fireEvent.change(input, { target: { value: '7' } })
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter' })
      })
      expect(lastSignalPayload()).toEqual({ case: 'intValue', value: 7n })
    })

    it('signals a float', async () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ simpleType: SimpleType.FLOAT })}
        />,
      )
      fireEvent.change(screen.getByPlaceholderText('float'), {
        target: { value: '3.14' },
      })
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Signal' }))
      })
      expect(lastSignalPayload()).toEqual({ case: 'floatValue', value: 3.14 })
    })

    it('shows a validation error and does not signal on invalid integer input', async () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ simpleType: SimpleType.INTEGER })}
        />,
      )
      fireEvent.change(screen.getByPlaceholderText('int'), {
        target: { value: '1.5' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Signal' }))
      expect(
        await screen.findByText('Enter a valid int value.'),
      ).toBeInTheDocument()
      expect(mockSignalEvent).not.toHaveBeenCalled()
    })
  })

  describe('unsupported type', () => {
    it('explains that the type cannot be signaled from the UI', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ simpleType: SimpleType.STRUCT })}
        />,
      )
      expect(
        screen.getByText(/can't be signaled from the UI/i),
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Signal' }),
      ).not.toBeInTheDocument()
    })
  })

  describe('submission states', () => {
    it('shows a submitting indicator while the request is in flight', async () => {
      mockSignalEvent.mockReturnValue(new Promise(() => {}))
      render(<ConditionSignal actionDetails={makeActionDetails()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Yes (True)' }))
      expect(await screen.findByText('Submitting...')).toBeInTheDocument()
    })

    it('surfaces an error when the request fails', async () => {
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})
      mockSignalEvent.mockRejectedValueOnce(new Error('boom'))
      render(<ConditionSignal actionDetails={makeActionDetails()} />)
      fireEvent.click(screen.getByRole('button', { name: 'Yes (True)' }))
      expect(
        await screen.findByText(
          'There was an error submitting the signal. Try again.',
        ),
      ).toBeInTheDocument()
      expect(consoleError).toHaveBeenCalledWith(
        'Error signaling condition:',
        expect.any(Error),
      )
      consoleError.mockRestore()
    })

    it('reports a missing action identifier instead of calling the RPC', async () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ withId: false })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Yes (True)' }))
      expect(
        await screen.findByText('Action identifier is missing.'),
      ).toBeInTheDocument()
      expect(mockSignalEvent).not.toHaveBeenCalled()
    })

    it('reports a missing parent action instead of calling the RPC', async () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ withParent: false })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Yes (True)' }))
      expect(
        await screen.findByText('Parent action is missing; unable to signal.'),
      ).toBeInTheDocument()
      expect(mockSignalEvent).not.toHaveBeenCalled()
    })
  })

  describe('resolved states', () => {
    it('shows the signaled value and timestamp when succeeded', () => {
      mockActionData.current = {
        outputs: { literals: [{ value: primitiveLiteral('integer', 7n) }] },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.INTEGER,
            phase: ActionPhase.SUCCEEDED,
          })}
        />,
      )
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('Signaled: formatted-date')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Signal' }),
      ).not.toBeInTheDocument()
    })

    it('shows a timed-out label', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.TIMED_OUT })}
        />,
      )
      expect(screen.getByText('Timed out: formatted-date')).toBeInTheDocument()
    })

    it('shows an aborted label', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.ABORTED })}
        />,
      )
      expect(screen.getByText('Aborted: formatted-date')).toBeInTheDocument()
    })

    it('shows the signaled value when timed out but outputs are present', () => {
      mockActionData.current = {
        outputs: { literals: [{ value: primitiveLiteral('integer', 7n) }] },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.INTEGER,
            phase: ActionPhase.TIMED_OUT,
          })}
        />,
      )
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('Timed out: formatted-date')).toBeInTheDocument()
    })

    it('shows the signaled value when aborted but outputs are present', () => {
      mockActionData.current = {
        outputs: {
          literals: [{ value: primitiveLiteral('stringValue', 'done') }],
        },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.STRING,
            phase: ActionPhase.ABORTED,
          })}
        />,
      )
      expect(screen.getByText('done')).toBeInTheDocument()
      expect(screen.getByText('Aborted: formatted-date')).toBeInTheDocument()
    })

    it('shows the signaled value when failed but outputs are present', () => {
      mockActionData.current = {
        outputs: { literals: [{ value: primitiveLiteral('boolean', true) }] },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            phase: ActionPhase.FAILED,
          })}
        />,
      )
      expect(screen.getByText('Yes (True)')).toBeInTheDocument()
      expect(screen.getByText('Failed: formatted-date')).toBeInTheDocument()
    })
  })

  describe('terminal (unsignaled) controls', () => {
    it('renders boolean buttons disabled when aborted with no signaled value', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.ABORTED })}
        />,
      )
      expect(screen.getByRole('button', { name: 'Yes (True)' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'No (False)' })).toBeDisabled()
    })

    it('does not signal when a disabled boolean button is clicked', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.ABORTED })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Yes (True)' }))
      expect(mockSignalEvent).not.toHaveBeenCalled()
    })

    it('renders the string textarea and submit disabled when timed out', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.STRING,
            phase: ActionPhase.TIMED_OUT,
          })}
        />,
      )
      expect(screen.getByPlaceholderText('string')).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Signal' })).toBeDisabled()
    })

    it('renders the numeric input and submit disabled when failed', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.INTEGER,
            phase: ActionPhase.FAILED,
          })}
        />,
      )
      expect(screen.getByPlaceholderText('int')).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Signal' })).toBeDisabled()
    })

    it('still shows the resolution summary alongside the disabled controls', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.ABORTED })}
        />,
      )
      expect(screen.getByText('Aborted: formatted-date')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Yes (True)' })).toBeDisabled()
    })

    it('shows the signaled value instead of disabled controls when terminal with a value', () => {
      mockActionData.current = {
        outputs: { literals: [{ value: primitiveLiteral('boolean', true) }] },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.ABORTED })}
        />,
      )
      expect(screen.getByText('Yes (True)')).toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Yes (True)' }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'No (False)' }),
      ).not.toBeInTheDocument()
    })

    it('treats a fetched empty string output as a value, not as missing', () => {
      mockActionData.current = {
        outputs: { literals: [{ value: primitiveLiteral('stringValue', '') }] },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.STRING,
            phase: ActionPhase.ABORTED,
          })}
        />,
      )
      // No disabled input controls should render for a (legitimately empty) value.
      expect(screen.queryByPlaceholderText('string')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Signal' }),
      ).not.toBeInTheDocument()
    })

    it('treats a signalInfo empty string as signaled, not as missing', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.STRING,
            phase: ActionPhase.SUCCEEDED,
            signalInfoOutput: primitiveLiteral('stringValue', ''),
          })}
        />,
      )
      // The empty string is a valid signaled value: no disabled controls render.
      expect(screen.queryByPlaceholderText('string')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'Signal' }),
      ).not.toBeInTheDocument()
      expect(screen.getByText('Signaled: formatted-date')).toBeInTheDocument()
    })

    it('keeps the controls enabled while paused', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.PAUSED })}
        />,
      )
      expect(screen.getByRole('button', { name: 'Yes (True)' })).toBeEnabled()
    })
  })

  describe('signalInfo', () => {
    it('prefers the value embedded in signalInfo over the fetched outputs', () => {
      mockActionData.current = {
        outputs: { literals: [{ value: primitiveLiteral('integer', 99n) }] },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.INTEGER,
            phase: ActionPhase.SUCCEEDED,
            signalInfoOutput: primitiveLiteral('integer', 7n),
          })}
        />,
      )
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.queryByText('99')).not.toBeInTheDocument()
    })

    it('falls back to the fetched outputs when signalInfo has no output', () => {
      mockActionData.current = {
        outputs: { literals: [{ value: primitiveLiteral('integer', 42n) }] },
      }
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.INTEGER,
            phase: ActionPhase.SUCCEEDED,
            signalledBy: { firstName: 'Carina', lastName: 'Didilescu' },
          })}
        />,
      )
      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('renders the signaller attribution when present', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            phase: ActionPhase.SUCCEEDED,
            signalInfoOutput: primitiveLiteral('boolean', true),
            signalledBy: { firstName: 'Carina', lastName: 'Didilescu' },
          })}
        />,
      )
      expect(
        screen.getByText('Signaled: formatted-date · by Carina Didilescu'),
      ).toBeInTheDocument()
    })

    it('omits the attribution when no signaller is present', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            phase: ActionPhase.SUCCEEDED,
            signalInfoOutput: primitiveLiteral('boolean', true),
          })}
        />,
      )
      expect(screen.getByText('Signaled: formatted-date')).toBeInTheDocument()
      expect(screen.queryByText(/· by/)).not.toBeInTheDocument()
    })

    it('shows the resolution line (with attribution) in every view', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            phase: ActionPhase.SUCCEEDED,
            signalInfoOutput: primitiveLiteral('boolean', true),
            signalledBy: { firstName: 'Carina', lastName: 'Didilescu' },
          })}
        />,
      )
      const attribution = 'Signaled: formatted-date · by Carina Didilescu'
      expect(screen.getByText(attribution)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'CLI' }))
      expect(screen.getByText(attribution)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Python' }))
      expect(screen.getByText(attribution)).toBeInTheDocument()
    })

    it('shows the signaled value only in the UI view', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({
            simpleType: SimpleType.INTEGER,
            phase: ActionPhase.SUCCEEDED,
            signalInfoOutput: primitiveLiteral('integer', 7n),
          })}
        />,
      )
      expect(screen.getByText('7')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'CLI' }))
      expect(screen.queryByText('7')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Python' }))
      expect(screen.queryByText('7')).not.toBeInTheDocument()
    })
  })

  describe('useActionData enablement', () => {
    it.each([
      ['SUCCEEDED', ActionPhase.SUCCEEDED],
      ['TIMED_OUT', ActionPhase.TIMED_OUT],
      ['ABORTED', ActionPhase.ABORTED],
      ['FAILED', ActionPhase.FAILED],
    ])('is enabled in the terminal phase %s', (_label, phase) => {
      render(<ConditionSignal actionDetails={makeActionDetails({ phase })} />)
      expect(lastUseActionDataProps()?.enabled).toBe(true)
    })

    it.each([
      ['PAUSED', ActionPhase.PAUSED],
      ['RUNNING', ActionPhase.RUNNING],
    ])('is disabled in the non-terminal phase %s', (_label, phase) => {
      render(<ConditionSignal actionDetails={makeActionDetails({ phase })} />)
      expect(lastUseActionDataProps()?.enabled).toBe(false)
    })

    it('refetches once terminal so a cached pre-resolution miss is replaced', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.SUCCEEDED })}
        />,
      )
      expect(mockRefetchActionData).toHaveBeenCalled()
    })

    it('does not refetch while the action is non-terminal', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.PAUSED })}
        />,
      )
      expect(mockRefetchActionData).not.toHaveBeenCalled()
    })

    it('does not refetch before the dataplane endpoint is resolved', () => {
      mockClusterEndpoint.current = undefined
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ phase: ActionPhase.SUCCEEDED })}
        />,
      )
      expect(mockRefetchActionData).not.toHaveBeenCalled()
    })
  })

  describe('CLI and Python snippets', () => {
    it('renders a CLI snippet with run/action identifiers and example value', () => {
      render(<ConditionSignal actionDetails={makeActionDetails()} />)
      fireEvent.click(screen.getByRole('button', { name: 'CLI' }))
      expect(
        screen.getByText(
          'flyte signal condition -p proj -d dom run-1 action-1 true',
        ),
      ).toBeInTheDocument()
    })

    it('renders a Python snippet using the condition name and run', () => {
      render(
        <ConditionSignal
          actionDetails={makeActionDetails({ simpleType: SimpleType.STRING })}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: 'Python' }))
      const snippet = screen.getByText(/Condition\.get\.aio/)
      expect(snippet).toHaveTextContent(
        'flyte.init(project="proj", domain="dom")',
      )
      expect(snippet).toHaveTextContent('"my-event"')
      expect(snippet).toHaveTextContent('run_name="run-1"')
      expect(snippet).toHaveTextContent('action_name="action-1"')
      expect(snippet).toHaveTextContent('await condition.signal.aio("value")')
    })
  })
})
