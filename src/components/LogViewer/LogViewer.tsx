/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { Switch } from '@/components/Switch'
import { RunLogType } from '@/components/pages/RunDetails/types'
import {
  LogLine,
  LogLineOriginator,
} from '@/gen/flyteidl2/logs/dataplane/payload_pb'
import { getLogDateString } from '@/lib/dateUtils'
import { stringToColor } from '@/lib/stringToColor'

import { ArrowPathIcon } from '@heroicons/react/24/outline'
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type WheelEventHandler,
} from 'react'
import type { ScrollerProps } from 'react-virtuoso'
import { Virtuoso } from 'react-virtuoso'
import { PopoverMenu, type MenuItem } from '../Popovers'
import { SearchBar } from '../SearchBar'
import { AppLogType } from '../pages/AppDetails/LogSwitch'
import { LogViewerRow, SourceOption } from './LogViewerRow'
import { useLogViewerTimestamps } from './useLogViewerTimestamps'
import LogViewerIcons from './LogViewerIcons'

/** Minimum width (px) for the log viewer container and content to avoid layout thrashing / resize loops. */
export const LOG_VIEWER_MIN_WIDTH_PX = 700

/**
 * Pixels from the bottom Virtuoso still treats as "at bottom". Streaming +
 * variable row heights can briefly report "not at bottom" with a tight
 * threshold, which disables followOutput until the user scrolls.
 */
const LOG_VIEWER_AT_BOTTOM_THRESHOLD_PX = 80

/** Ignore brief atBottomStateChange(false) blips during layout (ms). */
const LOG_VIEWER_TAIL_RELEASE_DEBOUNCE_MS = 220

/** Wheel deltaY below this (content moving up) counts as leaving the tail. */
const LOG_VIEWER_WHEEL_UP_RELEASE_DELTA = 10

/** In-list spacer so the absolute streaming bar does not cover the last log line (Virtuoso scroll height is item-based). */
const LogViewerStreamingTailSpacer = () => (
  <div className="h-9 w-full shrink-0" aria-hidden />
)

const LogViewerVirtuosoFooterEmpty = () => null

type LogViewerVirtuosoContext = {
  onUserScrollContentUp?: () => void
}

const LogViewerScroller = forwardRef<
  HTMLDivElement,
  ScrollerProps & { context?: LogViewerVirtuosoContext }
>(function LogViewerScroller(props, ref) {
  const { context, ...rest } = props
  const { onWheel: virtuosoOnWheel, ...restDom } = rest as ScrollerProps & {
    onWheel?: WheelEventHandler<HTMLDivElement>
  }

  const onWheel: WheelEventHandler<HTMLDivElement> = (e) => {
    if (e.deltaY < -LOG_VIEWER_WHEEL_UP_RELEASE_DELTA) {
      context?.onUserScrollContentUp?.()
    }
    virtuosoOnWheel?.(e)
  }

  return (
    <div
      ref={ref}
      {...(restDom as ScrollerProps)}
      data-testid="logviewer-scroll"
      onWheel={onWheel}
      className={`min-h-0 min-w-0 flex-1 overflow-auto pb-4 [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-(--system-gray-4) [&::-webkit-scrollbar-thumb:hover]:bg-(--system-gray-5) [&::-webkit-scrollbar-track]:bg-transparent ${(props as { className?: string }).className ?? ''}`}
      style={{
        ...(restDom.style as CSSProperties | undefined),
        overflowAnchor: 'none',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--system-gray-4) transparent',
      }}
    />
  )
})

interface LogViewerProps {
  enableSourceFilter?: boolean
  logs?: LogLine[]
  waiting?: boolean
  done?: boolean
  error?: Error | null
  logType?: RunLogType | AppLogType
  shouldSkipIcon?: boolean
}

const getDisplayNameByType = (type: RunLogType | AppLogType | undefined) => {
  if (type === RunLogType.K8S || type === AppLogType.SCALING) {
    return 'events'
  } else if (type === RunLogType.RUN || AppLogType.APP) {
    return 'logs'
  }
  return 'logs'
}

const getLongNameByType = (type: RunLogType | AppLogType | undefined) => {
  if (type === RunLogType.K8S) {
    return 'Kubernetes events'
  } else if (type === AppLogType.SCALING) {
    return 'scaling events'
  } else if (type === RunLogType.RUN || AppLogType.APP) {
    return 'logs'
  }
  return 'logs'
}

const EmptyStateMessage: React.FC<{
  logType?: RunLogType | AppLogType
}> = ({ logType }) => (
  <div className="flex flex-col items-center">
    <h2 className="mb-2 text-xl font-semibold text-(--system-gray-5)">
      No {getDisplayNameByType(logType)}
    </h2>
    <p className="text-base text-(--system-gray-5)">
      We didn&apos;t find any {getLongNameByType(logType)} for the specified
      source
    </p>
  </div>
)

const LogViewerRenderer = ({
  logs = [],
  searchQuery,
  logType,
  unfilteredLogCount,
  showEmpty,
  showStreaming,
  shouldSkipIcon,
  showTimestamps,
}: LogViewerProps & {
  selectedSource: string
  searchQuery: string
  /** Length of the upstream log list before search/source filtering; used to reset tail-follow only when the stream clears. */
  unfilteredLogCount: number
  showEmpty?: boolean
  showStreaming?: boolean
  shouldSkipIcon?: boolean
  showTimestamps?: boolean
}) => {
  /** While true, keep following the streaming tail despite flaky isAtBottom during remeasure. */
  const stickToStreamingTailRef = useRef(true)
  const tailReleaseTimeoutRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined)
  const [showTopShadow, setShowTopShadow] = useState<boolean>(false)
  const [showBottomShadow, setShowBottomShadow] = useState<boolean>(false)

  useEffect(() => {
    return () => {
      if (tailReleaseTimeoutRef.current !== undefined) {
        clearTimeout(tailReleaseTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (unfilteredLogCount !== 0) return
    stickToStreamingTailRef.current = true
    if (tailReleaseTimeoutRef.current !== undefined) {
      clearTimeout(tailReleaseTimeoutRef.current)
      tailReleaseTimeoutRef.current = undefined
    }
  }, [unfilteredLogCount])

  const releaseStreamingTailNow = useCallback(() => {
    if (tailReleaseTimeoutRef.current !== undefined) {
      clearTimeout(tailReleaseTimeoutRef.current)
      tailReleaseTimeoutRef.current = undefined
    }
    stickToStreamingTailRef.current = false
  }, [])

  const onAtBottomChange = useCallback((atBottom: boolean) => {
    setShowBottomShadow(!atBottom)
    if (atBottom) {
      if (tailReleaseTimeoutRef.current !== undefined) {
        clearTimeout(tailReleaseTimeoutRef.current)
        tailReleaseTimeoutRef.current = undefined
      }
      stickToStreamingTailRef.current = true
      return
    }
    if (tailReleaseTimeoutRef.current !== undefined) {
      clearTimeout(tailReleaseTimeoutRef.current)
    }
    tailReleaseTimeoutRef.current = setTimeout(() => {
      tailReleaseTimeoutRef.current = undefined
      stickToStreamingTailRef.current = false
    }, LOG_VIEWER_TAIL_RELEASE_DEBOUNCE_MS)
  }, [])

  const onAtTopChange = useCallback(
    (atTop: boolean) => setShowTopShadow(!atTop),
    [],
  )

  const followStreamingOutput = useCallback((_isAtBottom: boolean) => {
    if (stickToStreamingTailRef.current) return 'auto'
    return _isAtBottom ? 'auto' : false
  }, [])

  const virtuosoContext = useMemo(
    () => ({ onUserScrollContentUp: releaseStreamingTailNow }),
    [releaseStreamingTailNow],
  )

  const virtuosoComponents = useMemo(
    () => ({
      Scroller: LogViewerScroller,
      Footer: showStreaming
        ? LogViewerStreamingTailSpacer
        : LogViewerVirtuosoFooterEmpty,
    }),
    [showStreaming],
  )

  const computeItemKey = useMemo(
    () => (index: number, log: LogLine) =>
      `${index}-${log.timestamp?.seconds ?? ''}-${log.timestamp?.nanos ?? ''}-${log.message?.slice(0, 48) ?? ''}`,
    [],
  )

  // Show empty state when there are no logs and showEmpty is true
  if (showEmpty && logs.length === 0) {
    return (
      <div className="relative h-full min-h-0">
        <div
          className={`flex h-full flex-col overflow-hidden bg-(--system-black)`}
        >
          <div className="w-1 rounded-tl-lg"></div>
          <div className="flex flex-1 items-center justify-center">
            <EmptyStateMessage logType={logType} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0" data-testid="logviewer">
      {showStreaming === false && showEmpty === false && (
        <>
          {showTopShadow && (
            <div className="absolute z-1 top-0 right-2.5 h-8 w-full bg-linear-to-b from-white to-black/0 dark:from-black dark:to-white/0" />
          )}
          {showBottomShadow && (
            <div className="absolute z-1 -bottom-4 right-2.5 h-8 w-full bg-linear-to-t from-white to-black/0 dark:from-black dark:to-white/0" />
          )}
        </>
      )}
      <div
        className={`flex h-full flex-col overflow-hidden bg-(--system-black)`}
      >
        <div className="w-1 rounded-tl-lg"></div>
        <div className="relative min-h-0 min-w-0 flex-1">
          {/*
            react-virtuoso: vertical margins on item roots or protruding past the
            row container are not included in height measurement — total scroll
            can end short. LogViewerRow uses padding, not margin, between lines.
          */}
          <Virtuoso<LogLine, LogViewerVirtuosoContext>
            style={{ height: '100%', minWidth: LOG_VIEWER_MIN_WIDTH_PX }}
            className="min-h-0 min-w-0"
            data={logs}
            context={virtuosoContext}
            components={virtuosoComponents}
            computeItemKey={computeItemKey}
            defaultItemHeight={24}
            atBottomThreshold={LOG_VIEWER_AT_BOTTOM_THRESHOLD_PX}
            atBottomStateChange={onAtBottomChange}
            atTopStateChange={onAtTopChange}
            followOutput={followStreamingOutput}
            increaseViewportBy={{ top: 240, bottom: 240 }}
            initialTopMostItemIndex={
              logs.length > 0 ? { align: 'end', index: 'LAST' } : 0
            }
            itemContent={(index, log) => (
              <LogViewerRow
                log={log}
                searchQuery={searchQuery}
                skipOriginatorIcon={shouldSkipIcon}
                showTimestamp={showTimestamps}
              />
            )}
          />

          {showStreaming ? (
            <div className="pointer-events-none absolute bottom-0 left-0 w-full">
              <div className="mx-auto mt-2 flex w-4/5 items-center">
                <div className="flex-grow border-t border-dotted border-[#FCB51D]"></div>
                <span className="mx-4 flex items-center text-sm whitespace-nowrap text-[#FCB51D]">
                  <ArrowPathIcon className="mr-2 inline-block h-4 w-4 animate-spin" />
                  streaming
                </span>
                <div className="flex-grow border-t border-dotted border-[#FCB51D]"></div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const SourcesDropdown: React.FC<{
  selectedSource: SourceOption
  setSelectedSource: (source: SourceOption) => void
  sources: string[]
}> = ({ setSelectedSource, selectedSource, sources }) => {
  const menuItems: MenuItem[] = useMemo(() => {
    return sources.map((source) => ({
      id: source,
      label: (
        <div className="flex items-center gap-x-2 text-sm/5">
          {source !== 'All sources' && (
            <div
              className={`mr-0 h-[8px] w-[8px] rounded-[2px] ${stringToColor(source)}`}
            />
          )}
          <span className="font-medium text-(--system-gray-5)">{source}</span>
        </div>
      ),
      onClick: () => setSelectedSource(source),
      selected: source === selectedSource,
    }))
  }, [selectedSource, setSelectedSource, sources])

  return (
    <div className="min-h-0 min-w-[95px] text-(--system-gray-5)">
      <PopoverMenu label={selectedSource} items={menuItems}></PopoverMenu>
    </div>
  )
}

const LogsSearch: React.FC<{
  searchQuery: string
  setSearchQuery: (query: string) => void
}> = ({ searchQuery, setSearchQuery }) => (
  <SearchBar
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Escape') {
        setSearchQuery('')
      }
    }}
    className="!w-[258px]"
    onClear={() => setSearchQuery('')}
  />
)

export const LogViewer = ({
  enableSourceFilter = true,
  logs = [],
  done = false,
  waiting,
  error,
  logType,
  shouldSkipIcon = false,
}: LogViewerProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] =
    useState<SourceOption>('All sources')
  const [showError, setShowError] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)
  const [showStreaming, setShowStreaming] = useState(false)
  const [showWaiting, setShowWaiting] = useState(false)
  const [showTimestamps, setShowTimestamps] = useLogViewerTimestamps()

  // Dynamically get unique sources from logs
  // Memoize to prevent recalculation when logs array reference changes but content is the same
  const uniqueSources = useMemo(
    () =>
      Array.from(
        new Set(logs.map((log) => LogLineOriginator[log.originator])),
      ).sort(),
    [logs],
  )
  const sources: SourceOption[] = useMemo(
    () => ['All sources', ...uniqueSources],
    [uniqueSources],
  )

  // no source filtering for K8s logs
  const rendererLogSource = useMemo(
    () => (logType !== RunLogType.K8S ? selectedSource : 'All sources'),
    [logType, selectedSource],
  )

  const shouldDisplayControls = useMemo(
    () =>
      !waiting &&
      !error &&
      (logs?.length > 0 ||
        searchQuery.length > 0 ||
        selectedSource !== 'All sources'),
    [waiting, error, logs?.length, searchQuery, selectedSource],
  )

  // Delay showing error screen by 500ms for streaming logs
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    if (error) {
      timeout = setTimeout(() => setShowError(true), 500)
    } else {
      setShowError(false)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [error])

  // Delay showing streaming indicator by 500ms to avoid flashing
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    if (!done) {
      timeout = setTimeout(() => setShowStreaming(true), 500)
    } else {
      setShowStreaming(false)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [done])

  // Delay showing waiting screen by 500ms to avoid flashing
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    if (waiting) {
      timeout = setTimeout(() => setShowWaiting(true), 500)
    } else {
      setShowWaiting(false)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [waiting])

  // Filter logs based on search query and selected source
  const filteredLogs = useMemo(() => {
    if (!logs) return []

    const searchLower = searchQuery.toLowerCase()

    return logs.filter((log) => {
      const originator =
        LogLineOriginator[
          log.originator || LogLineOriginator.UNKNOWN
        ]?.toString()
      const message = log.message || ''
      const timestamp = getLogDateString(log.timestamp)

      // Check source filter
      const matchesSource =
        selectedSource === 'All sources' || originator === selectedSource
      if (!matchesSource) return false

      // Check search filter
      if (!searchQuery) return true

      return (
        message.toLowerCase().includes(searchLower) ||
        timestamp.includes(searchQuery) ||
        originator?.toLowerCase().includes(searchLower)
      )
    })
  }, [logs, searchQuery, selectedSource])

  // Check if there are active filters (search or source selection)
  const hasActiveFilters = useMemo(
    () => searchQuery.length > 0 || selectedSource !== 'All sources',
    [searchQuery, selectedSource],
  )

  // Delay showing empty screen by 500ms for streaming logs
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined
    if (filteredLogs.length === 0 && !error && !waiting && done) {
      timeout = setTimeout(() => setShowEmpty(true), 500)
    } else {
      setShowEmpty(false)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [filteredLogs.length, error, waiting, done])

  // Show waiting state after delay
  if (showWaiting && waiting) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg">
        <div className="flex flex-col items-center">
          <h2 className="mb-2 text-xl font-semibold text-(--system-gray-5)">
            Waiting
          </h2>
          <p className="text-base text-(--system-gray-5)">
            Logs are not available yet
          </p>
        </div>
      </div>
    )
  }

  // Show error screen after delay
  if (showError && error) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg">
        <div className="flex flex-col items-center">
          <h2 className="mb-2 text-xl font-bold text-(--system-gray-5)">
            Error
          </h2>
          <p className="text-base text-(--system-gray-5)">
            We&apos;re having trouble loading the logs
          </p>
        </div>
      </div>
    )
  }

  // Show empty screen after delay - only early return if no logs and no active filters
  // If there are active filters, show empty state within the main component so controls remain visible
  if (showEmpty && !hasActiveFilters && logs.length === 0) {
    return (
      <div className={`flex flex-1 items-center justify-center rounded-lg`}>
        <EmptyStateMessage logType={logType} />
      </div>
    )
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {shouldDisplayControls && (
        <div className="space-between flex min-h-0 shrink-0 items-center justify-between">
          {enableSourceFilter && (
            <SourcesDropdown
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              sources={sources}
            />
          )}

          <div className="gap flex flex-row items-center">
            <LogsSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-(--system-gray-5)">
                Timestamps
              </span>
              <Switch
                checked={showTimestamps}
                onChange={setShowTimestamps}
                color="green"
                size="sm"
              />
            </div>
            <LogViewerIcons logs={logs} />
          </div>
        </div>
      )}

      <LogViewerRenderer
        searchQuery={searchQuery}
        selectedSource={rendererLogSource}
        unfilteredLogCount={logs.length}
        shouldSkipIcon={shouldSkipIcon}
        showTimestamps={showTimestamps}
        waiting={waiting}
        error={error}
        done={done}
        logs={filteredLogs}
        logType={logType}
        showEmpty={showEmpty && hasActiveFilters}
        showStreaming={showStreaming}
      />
    </div>
  )
}
