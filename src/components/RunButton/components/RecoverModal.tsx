/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import { type ButtonConfig, SimpleDialog } from '@/components/SimpleDialog'
import { useRunStore } from '@/components/pages/RunDetails/state/RunStore'
import { ActionPhase } from '@/gen/flyteidl2/common/phase_pb'
import { XMarkIcon } from '@heroicons/react/20/solid'
import { useEffect, useMemo, useState } from 'react'
import { useRecoverRun } from '../useRecoverRun'

/** Suggestions are capped so a run with tens of thousands of actions stays usable. */
const MAX_SUGGESTIONS = 50

const inputClassName =
  'block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-(--system-gray-3) dark:bg-(--system-gray-1) dark:text-(--system-white) dark:placeholder-(--system-gray-4)'

/**
 * Names of actions the source run already completed — the only ones for which forcing a
 * re-run means anything. Failed and never-run actions re-execute in a recovery anyway.
 * The root action is excluded: forcing it would re-execute the whole run, which is a rerun.
 */
function useReusableActionNames() {
  const actions = useRunStore((s) => s.actions)
  const rootName = useRunStore((s) => s.run?.action?.id?.name)

  return useMemo(() => {
    const names: string[] = []
    for (const entry of Object.values(actions)) {
      const name = entry.action?.id?.name
      const phase = entry.action?.status?.phase
      if (!name || name === rootName) continue
      if (phase === ActionPhase.SUCCEEDED || phase === ActionPhase.RECOVERED) {
        names.push(name)
      }
    }
    return names.sort()
  }, [actions, rootName])
}

const ForceRerunActionPicker = ({
  selected,
  setSelected,
  disabled,
}: {
  selected: string[]
  setSelected: (names: string[]) => void
  disabled: boolean
}) => {
  const reusableNames = useReusableActionNames()
  const [query, setQuery] = useState('')

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matches = reusableNames.filter(
      (name) => !selected.includes(name) && name.toLowerCase().includes(needle),
    )
    return { shown: matches.slice(0, MAX_SUGGESTIONS), total: matches.length }
  }, [query, reusableNames, selected])

  const add = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed || selected.includes(trimmed)) return
    setSelected([...selected, trimmed])
    setQuery('')
  }

  return (
    <div className="mt-4">
      <label
        htmlFor="recover-force-rerun-action"
        className="block text-sm font-medium text-zinc-700 dark:text-(--system-gray-5)"
      >
        Force re-run actions (optional)
      </label>
      <div className="mt-1 mb-2 text-xs text-zinc-500">
        Actions listed here re-execute even though they succeeded in the source
        run. A listed parent re-enqueues its children — list them too to force
        the whole subtree.
      </div>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selected.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-md bg-(--system-gray-2) px-2 py-1 text-xs text-zinc-700 dark:text-(--system-white)"
            >
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                disabled={disabled}
                onClick={() => setSelected(selected.filter((n) => n !== name))}
                className="cursor-pointer disabled:cursor-not-allowed"
              >
                <XMarkIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        id="recover-force-rerun-action"
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            add(query)
          }
        }}
        placeholder="Search action names, or type one and press Enter"
        className={inputClassName}
      />

      {suggestions.shown.length > 0 && (
        <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-zinc-200 dark:border-(--system-gray-3)">
          {suggestions.shown.map((name) => (
            <button
              key={name}
              type="button"
              disabled={disabled}
              onClick={() => add(name)}
              className="block w-full cursor-pointer px-3 py-1 text-left text-xs text-zinc-700 hover:bg-(--system-gray-2) disabled:cursor-not-allowed dark:text-(--system-white)"
            >
              {name}
            </button>
          ))}
          {suggestions.total > suggestions.shown.length && (
            <div className="px-3 py-1 text-xs text-zinc-500">
              {suggestions.total - suggestions.shown.length} more — keep typing
              to narrow the list.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const RecoverDialogContent = ({
  errorMessage,
  forceRerunActions,
  isRecovering,
  isInputsUnavailable,
  runId,
  setForceRerunActions,
}: {
  errorMessage: string
  forceRerunActions: string[]
  isRecovering: boolean
  isInputsUnavailable: boolean
  runId: string
  setForceRerunActions: (names: string[]) => void
}) => (
  <>
    <div className="mb-2 text-lg font-semibold">Recover run</div>
    {errorMessage && <div className="mb-2 text-rose-500">{errorMessage}</div>}
    {isInputsUnavailable && !errorMessage && (
      <div className="mb-2 text-rose-500">
        This run&apos;s inputs are no longer available, so it cannot be
        recovered.
      </div>
    )}
    <div className="mb-3 text-zinc-500">
      This creates a new run from{' '}
      <span className="font-mono text-zinc-700 dark:text-(--system-white)">
        {runId}
      </span>{' '}
      that reuses its succeeded actions and re-runs only what failed or never
      ran. The code and inputs are replayed as-is and cannot be changed — use
      Rerun instead to edit inputs.
    </div>
    <ForceRerunActionPicker
      selected={forceRerunActions}
      setSelected={setForceRerunActions}
      disabled={isRecovering}
    />
  </>
)

export interface RecoverModalProps {
  isOpen?: boolean
  setIsOpen?: (isOpen: boolean) => void
}

export const RecoverModal = ({
  isOpen = false,
  setIsOpen = () => {},
}: RecoverModalProps) => {
  const runId = useRunStore((s) => s.run?.action?.id?.run?.name) ?? ''
  const { recoverRun, isReady, isInputsUnavailable } = useRecoverRun()
  const [errorMessage, setErrorMessage] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)
  const [forceRerunActions, setForceRerunActions] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('')
      setForceRerunActions([])
    }
  }, [isOpen])

  const dialogButtons: ButtonConfig[] = useMemo(
    () => [
      {
        color: 'union',
        displayText: isRecovering ? 'Recovering...' : 'Recover',
        disabled: isRecovering || !isReady,
        onClick: async () => {
          setIsRecovering(true)
          setErrorMessage('')
          try {
            await recoverRun(forceRerunActions)
            setIsOpen(false)
          } catch (e) {
            console.error('Error recovering run', e)
            setErrorMessage(
              e instanceof Error
                ? e.message
                : 'There was an error. Try again later.',
            )
          } finally {
            setIsRecovering(false)
          }
        },
      },
      {
        color: 'dark/zinc',
        displayText: 'Cancel',
        onClick: () => setIsOpen(false),
        outline: true,
        disabled: isRecovering,
      },
    ],
    [forceRerunActions, isReady, isRecovering, recoverRun, setIsOpen],
  )

  return (
    <SimpleDialog
      buttons={dialogButtons}
      content={
        <RecoverDialogContent
          errorMessage={errorMessage}
          forceRerunActions={forceRerunActions}
          isRecovering={isRecovering}
          isInputsUnavailable={isInputsUnavailable}
          runId={runId}
          setForceRerunActions={setForceRerunActions}
        />
      }
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (!isRecovering) {
          setIsOpen(open)
        }
      }}
      shouldShowCloseButton={!isRecovering}
    />
  )
}
