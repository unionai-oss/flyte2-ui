/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { create } from '@bufbuild/protobuf'
import clsx from 'clsx'

import { BaseButton } from '@/components/Buttons/BaseButton'
import { CopyButton } from '@/components/CopyButton'
import { CheckMarkIcon } from '@/components/icons/CheckMarkIcon'
import { CrossMarkIcon } from '@/components/icons/CrossMarkIcon'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { MarkdownContent } from '@/components/MarkdownRenderer'
import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import type { Literal } from '@/gen/flyteidl2/core/literals_pb'
import type { LiteralType } from '@/gen/flyteidl2/core/types_pb'
import { SimpleType } from '@/gen/flyteidl2/core/types_pb'
import {
  ActionDetails,
  ConditionAction,
  ConditionActionMetadata,
  ConditionPromptType,
} from '@/gen/flyteidl2/workflow/run_definition_pb'
import {
  EventPayload,
  EventPayloadSchema,
  RunService,
  SignalEventRequestSchema,
} from '@/gen/flyteidl2/workflow/run_service_pb'
import { useActionData } from '@/hooks/useActionData'
import { useConnectRpcClient } from '@/hooks/useConnectRpc'
import { isActionTerminal } from '@/lib/actionUtils'
import { toDateFormat } from '@/lib/dateUtils'
import { getUserIdentityString } from '@/lib/userIdentityUtils'

interface SignalTypeConfig {
  /** Short label shown in the header and used as the input placeholder. */
  label: string
  /** Placeholder value rendered in the CLI snippet. */
  cliExample: string
  /** Placeholder value rendered in the Python snippet. */
  pythonExample: string
}

// Signals only accept these primitive types (see the EventPayload oneof). Each
// entry drives the type label and the example values shown in the CLI/Python tabs.
const SIGNAL_TYPE_CONFIG: Partial<Record<SimpleType, SignalTypeConfig>> = {
  [SimpleType.INTEGER]: {
    label: 'int',
    cliExample: '<value>',
    pythonExample: '0',
  },
  [SimpleType.FLOAT]: {
    label: 'float',
    cliExample: '<value>',
    pythonExample: '0.0',
  },
  [SimpleType.STRING]: {
    label: 'string',
    cliExample: '<value>',
    pythonExample: '"value"',
  },
  [SimpleType.BOOLEAN]: {
    label: 'bool',
    cliExample: 'true',
    pythonExample: 'True',
  },
}

export const getSimpleType = (type?: LiteralType): SimpleType | undefined =>
  type?.type?.case === 'simple' ? type.type.value : undefined

export const getConditionTypeLabel = (type?: LiteralType): string => {
  const simple = getSimpleType(type)
  if (simple !== undefined) return SIGNAL_TYPE_CONFIG[simple]?.label ?? '-'
  return type?.type?.case ?? '-'
}

const SIGNAL_MODES = ['UI', 'CLI', 'Python'] as const
type SignalMode = (typeof SIGNAL_MODES)[number]

const SegmentedControl = ({
  value,
  onChange,
}: {
  value: SignalMode
  onChange: (mode: SignalMode) => void
}) => (
  <div className="flex items-center gap-1 rounded-lg border border-(--system-gray-2) bg-(--system-gray-1) p-0.5">
    {SIGNAL_MODES.map((mode) => (
      <button
        key={mode}
        type="button"
        onClick={() => onChange(mode)}
        className={clsx(
          'cursor-pointer rounded-md px-3 py-1 text-[13px] font-medium transition-colors',
          value === mode
            ? 'border border-(--system-gray-3) bg-(--system-gray-2) text-(--system-gray-7) shadow-sm'
            : 'border border-transparent text-(--system-gray-5) hover:text-(--system-gray-6)',
        )}
      >
        {mode}
      </button>
    ))}
  </div>
)

const CodeSnippet = ({ code }: { code: string }) => (
  <div className="relative">
    <pre className="scrollbar-styled overflow-x-auto rounded-lg bg-(--system-gray-1) p-3 pr-10 text-[12px] leading-5 text-(--system-gray-6)">
      <code>{code}</code>
    </pre>
    <div className="absolute top-1.5 right-1.5">
      <CopyButton value={code} />
    </div>
  </div>
)

const MetadataField = ({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) => (
  <div className="flex items-center gap-1.5 text-[12px]">
    <span className="text-(--system-gray-5)">{label}</span>
    <span className="font-medium text-(--system-gray-6)">{value}</span>
  </div>
)

/**
 * Builds the EventPayload oneof variant matching the condition's declared type.
 * Returns null when the raw input can't be coerced to the expected type.
 */
export const buildPayloadValue = (
  simpleType: SimpleType | undefined,
  raw: string,
): EventPayload['value'] | null => {
  switch (simpleType) {
    case SimpleType.BOOLEAN:
      return { case: 'boolValue', value: raw === 'true' }
    case SimpleType.INTEGER: {
      if (!/^-?\d+$/.test(raw.trim())) return null
      try {
        return { case: 'intValue', value: BigInt(raw.trim()) }
      } catch {
        return null
      }
    }
    case SimpleType.FLOAT: {
      const n = Number(raw)
      if (raw.trim() === '' || Number.isNaN(n)) return null
      return { case: 'floatValue', value: n }
    }
    case SimpleType.STRING:
      return { case: 'stringValue', value: raw }
    default:
      return null
  }
}

/** Extracts a display string from a signaled scalar primitive Literal. */
export const getSignaledValueLabel = (
  literal?: Literal,
): string | undefined => {
  const scalar =
    literal?.value?.case === 'scalar' ? literal.value.value : undefined
  const prim =
    scalar?.value?.case === 'primitive' ? scalar.value.value : undefined
  switch (prim?.value.case) {
    case 'boolean':
      return prim.value.value ? 'Yes (True)' : 'No (False)'
    case 'integer':
      return String(prim.value.value)
    case 'floatValue':
      return String(prim.value.value)
    case 'stringValue':
      return prim.value.value
    default:
      return undefined
  }
}

/** Human-readable timeout from a protobuf Duration's seconds (e.g. "24 hrs"). */
export const formatTimeout = (seconds?: bigint): string | undefined => {
  if (!seconds) return undefined
  const s = Number(seconds)
  if (s <= 0) return undefined
  if (s % 3600 === 0) return `${s / 3600} hrs`
  if (s % 60 === 0) return `${s / 60} min`
  return `${s}s`
}

const BOOLEAN_OPTIONS = [
  { value: true, label: 'Yes (True)', Icon: CheckMarkIcon },
  { value: false, label: 'No (False)', Icon: CrossMarkIcon },
] as const

const inputClassName =
  'rounded-lg border border-(--system-gray-3) bg-(--system-gray-1) text-[13px] text-(--system-gray-7) placeholder-(--system-gray-4) focus:border-(--system-gray-5) focus:outline-none'

const SubmitButton = ({
  onClick,
  disabled,
}: {
  onClick: () => void
  disabled?: boolean
}) => (
  <BaseButton color="brand" filled onClick={onClick} disabled={disabled}>
    Signal
  </BaseButton>
)

interface SignalControlsProps {
  simpleType?: SimpleType
  typeLabel: string
  textValue: string
  onTextChange: (value: string) => void
  isSubmitting: boolean
  onSubmit: (value: EventPayload['value'] | null) => void
  disabled?: boolean
}

/** Renders the appropriate input for the condition's primitive type while paused. */
const SignalControls = ({
  simpleType,
  typeLabel,
  textValue,
  onTextChange,
  isSubmitting,
  onSubmit,
  disabled = false,
}: SignalControlsProps) => {
  const submitText = () => onSubmit(buildPayloadValue(simpleType, textValue))

  if (isSubmitting) {
    return <LoadingSpinner size="sm" delay={0} text="Submitting..." />
  }

  if (simpleType === SimpleType.BOOLEAN) {
    return (
      <div className="flex items-center gap-2">
        {BOOLEAN_OPTIONS.map(({ value, label, Icon }) => (
          <BaseButton
            key={label}
            color="med-gray"
            className="bg-(--system-gray-2) hover:bg-(--system-gray-3)"
            leadingIcon={<Icon className="size-4 text-(--system-gray-5)" />}
            onClick={() => onSubmit({ case: 'boolValue', value })}
            disabled={disabled}
          >
            {label}
          </BaseButton>
        ))}
      </div>
    )
  }

  if (simpleType === SimpleType.STRING) {
    return (
      <div className="flex flex-col items-start gap-3">
        <textarea
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={typeLabel}
          rows={4}
          disabled={disabled}
          className={clsx(
            inputClassName,
            'min-h-24 w-full resize-y px-3 py-2',
            disabled && 'cursor-not-allowed opacity-40',
          )}
        />
        <SubmitButton onClick={submitText} disabled={disabled} />
      </div>
    )
  }

  if (simpleType === SimpleType.INTEGER || simpleType === SimpleType.FLOAT) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={typeLabel}
          disabled={disabled}
          className={clsx(
            inputClassName,
            'h-8 w-56 px-3',
            disabled && 'cursor-not-allowed opacity-40',
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitText()
          }}
        />
        <SubmitButton onClick={submitText} disabled={disabled} />
      </div>
    )
  }

  return (
    <p className="text-[13px] text-(--system-gray-5)">
      This condition type ({typeLabel}) can&apos;t be signaled from the UI. Use
      the CLI or Python tabs.
    </p>
  )
}

interface ConditionSignalProps {
  actionDetails: ActionDetails
}

export const ConditionSignal = ({ actionDetails }: ConditionSignalProps) => {
  const client = useConnectRpcClient(RunService)
  const [mode, setMode] = useState<SignalMode>('UI')
  const [textValue, setTextValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const conditionSpec =
    actionDetails.spec?.case === 'condition'
      ? (actionDetails.spec.value as ConditionAction)
      : undefined
  const conditionMetadata =
    actionDetails.metadata?.spec?.case === 'condition'
      ? (actionDetails.metadata.spec.value as ConditionActionMetadata)
      : undefined

  const eventName = conditionSpec?.name || conditionMetadata?.name || ''
  const conditionType = conditionSpec?.type ?? conditionMetadata?.type
  const simpleType = getSimpleType(conditionType)
  const typeLabel = getConditionTypeLabel(conditionType)
  const typeConfig =
    simpleType !== undefined ? SIGNAL_TYPE_CONFIG[simpleType] : undefined
  const prompt = conditionSpec?.prompt ?? ''
  const description = conditionSpec?.description ?? ''
  const renderPromptAsMarkdown =
    conditionSpec?.promptType !== ConditionPromptType.TEXT

  const timeoutLabel = formatTimeout(conditionSpec?.timeout?.seconds) ?? '-'
  const webhookUrl = conditionSpec?.webhook?.url

  const phase = actionDetails.status?.phase
  const isPaused = phase === ActionPhase.PAUSED
  const isTerminal = isActionTerminal(actionDetails)

  // Conditions store their signaled value as outputs.literals[0] (a single
  // NamedLiteral keyed by the condition name). Only fetch once the action
  // reaches a terminal phase.
  // GetActionData is used directly — GetActionDataURIs is skipped for conditions.
  const {
    data: actionData,
    refetch: refetchActionData,
    clusterEndpoint,
  } = useActionData({
    actionDetails,
    enabled: isTerminal,
  })

  // GetActionData 404s (no outputs) until the condition resolves, and that
  // miss is cached with `staleTime: Infinity` / no window-focus refetch — so
  // it never re-fires on its own. Once terminal (and the dataplane endpoint is
  // resolved) force a refetch to pick up the now-available signaled output.
  useEffect(() => {
    if (isTerminal && clusterEndpoint) {
      refetchActionData()
    }
  }, [isTerminal, clusterEndpoint, refetchActionData])

  const signalInfo =
    actionDetails.result?.case === 'signalInfo'
      ? actionDetails.result.value
      : undefined

  // Prefer the value embedded in signalInfo (always available once resolved);
  // fall back to the separately-fetched outputs for older payloads.
  const signaledValueLabel = getSignaledValueLabel(
    signalInfo?.output ?? actionData?.outputs?.literals?.[0]?.value,
  )
  // A signaled string can legitimately be "", so check for presence explicitly
  // rather than truthiness (which would treat "" as "no value").
  const hasSignaledValue = signaledValueLabel !== undefined
  const signalledByLabel = signalInfo?.signalledBy
    ? getUserIdentityString(signalInfo.signalledBy)
    : undefined

  const submitSignal = useCallback(
    async (value: EventPayload['value'] | null) => {
      if (!actionDetails.id) {
        setErrorMessage('Action identifier is missing.')
        return
      }
      // parentActionName is required for routing the signal to the right run.
      // Sending an empty string fails server-side in a non-obvious way, so
      // validate it up front and surface a clear message.
      const parentActionName = actionDetails.metadata?.parent
      if (!parentActionName) {
        setErrorMessage('Parent action is missing; unable to signal.')
        return
      }
      if (!value) {
        setErrorMessage(`Enter a valid ${typeLabel} value.`)
        return
      }
      setIsSubmitting(true)
      setErrorMessage('')
      try {
        await client.signalEvent(
          create(SignalEventRequestSchema, {
            actionId: actionDetails.id,
            parentActionName,
            payload: create(EventPayloadSchema, { value }),
          }),
        )
        setTextValue('')
      } catch (e) {
        console.error('Error signaling condition:', e)
        setErrorMessage('There was an error submitting the signal. Try again.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [actionDetails.id, actionDetails.metadata?.parent, client, typeLabel],
  )

  const runId = actionDetails.id?.run
  const cliSnippet = useMemo(() => {
    const valueExample = typeConfig?.cliExample ?? '<value>'
    const project = runId?.project ? ` -p ${runId.project}` : ''
    const domain = runId?.domain ? ` -d ${runId.domain}` : ''
    return `flyte signal condition${project}${domain} ${runId?.name ?? '<run>'} ${actionDetails.id?.name ?? '<action>'} ${valueExample}`
  }, [runId, actionDetails.id?.name, typeConfig])

  const pythonSnippet = useMemo(() => {
    const valueExample = typeConfig?.pythonExample ?? 'value'
    const project = runId?.project ?? '<project>'
    const domain = runId?.domain ?? '<domain>'
    const runName = runId?.name ?? '<run>'
    const actionName = actionDetails.id?.name ?? '<action>'
    return `import flyte
from flyte.remote import Condition

flyte.init(project="${project}", domain="${domain}")

condition = await Condition.get.aio(
    "${eventName}",
    run_name="${runName}",
    action_name="${actionName}",
)
await condition.signal.aio(${valueExample})`
  }, [eventName, runId, actionDetails.id?.name, typeConfig])

  const hasPromptContent = Boolean(prompt || description)

  const resolvedLabel =
    phase === ActionPhase.TIMED_OUT
      ? 'Timed out'
      : phase === ActionPhase.ABORTED
        ? 'Aborted'
        : phase === ActionPhase.FAILED
          ? 'Failed'
          : 'Signaled'

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h3 className="text-sm font-bold">
            {eventName ? `Condition: ${eventName}` : 'Event'}
          </h3>
          <MetadataField label="Data type:" value={typeLabel} />
          <MetadataField label="Timeout:" value={timeoutLabel} />
          {webhookUrl && (
            <MetadataField
              label="Webhook:"
              value={
                <span className="max-w-xs truncate" title={webhookUrl}>
                  {webhookUrl}
                </span>
              }
            />
          )}
        </div>
        <SegmentedControl value={mode} onChange={setMode} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-(--system-gray-2) bg-(--system-black) p-5">
        {prompt ? (
          renderPromptAsMarkdown ? (
            <MarkdownContent text={prompt} allowHtml />
          ) : (
            <h4 className="text-base font-semibold text-(--system-gray-7)">
              {prompt}
            </h4>
          )
        ) : null}

        {description ? (
          <p className="text-sm whitespace-pre-wrap text-(--system-gray-5)">
            {description}
          </p>
        ) : null}

        <div
          className={clsx(
            'flex flex-col gap-2',
            hasPromptContent
              ? 'mt-2 border-t border-(--system-gray-3) pt-4'
              : 'pt-1',
          )}
        >
          {/* UI view: input controls to submit the signal. Shown while paused
              (enabled) and also for terminal-but-unsignaled actions (e.g.
              aborted/timed out) where they render disabled for context. */}
          {mode === 'UI' && (isPaused || (isTerminal && !hasSignaledValue)) && (
            <>
              <SignalControls
                simpleType={simpleType}
                typeLabel={typeLabel}
                textValue={textValue}
                onTextChange={setTextValue}
                isSubmitting={isSubmitting}
                onSubmit={submitSignal}
                disabled={isTerminal}
              />
              {errorMessage && !isTerminal && (
                <p className="text-[13px] text-(--accent-graphic-red)">
                  {errorMessage}
                </p>
              )}
            </>
          )}

          {/* UI view, resolved: the signaled value (UI-only). */}
          {mode === 'UI' && !isPaused && hasSignaledValue && (
            <h4 className="text-base font-semibold text-(--system-gray-7)">
              {signaledValueLabel}
            </h4>
          )}

          {mode === 'CLI' && <CodeSnippet code={cliSnippet} />}
          {mode === 'Python' && <CodeSnippet code={pythonSnippet} />}

          {/* Resolution summary, shown in every view once resolved. */}
          {!isPaused && (
            <p className="text-[13px] text-(--system-gray-5)">
              {resolvedLabel}:{' '}
              {toDateFormat({ timestamp: actionDetails.status?.endTime })}
              {signalledByLabel ? ` · by ${signalledByLabel}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
