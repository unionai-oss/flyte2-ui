/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import clsx from 'clsx'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { memo } from 'react'

const MarkdownRendererInner = dynamic(
  () =>
    import('./MarkdownRendererInner').then((mod) => ({
      default: mod.MarkdownRendererInner,
    })),
  { ssr: false },
)

interface MarkdownContentProps {
  text: string
  className?: string
  /**
   * Render raw HTML embedded in the markdown. Off by default. When enabled, the
   * HTML is parsed (rehype-raw) and sanitized (rehype-sanitize) to strip unsafe
   * markup, so it is safe for user-authored content (e.g. condition prompts).
   */
  allowHtml?: boolean
}

/**
 * Wrapper component to render markdown content with proper styling.
 * Shiki, ReactMarkdown, and code-block deps are loaded on first use (dynamic import).
 * Memoized so that when the parent re-renders we don't re-render as long as text is unchanged.
 */
export const MarkdownContent = memo(function MarkdownContent({
  text,
  className,
  allowHtml = false,
}: MarkdownContentProps) {
  const { resolvedTheme } = useTheme()

  return (
    <div
      className={clsx(
        'prose-sm prose max-w-none break-words dark:prose-invert prose-headings:font-semibold prose-p:my-2 prose-ol:my-2 prose-ul:my-2 prose-li:my-1 [&_code]:break-all [&_pre]:overflow-x-auto [&_pre]:break-all [&_pre]:whitespace-pre-wrap [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:shadow-none',
        className,
      )}
    >
      <MarkdownRendererInner
        text={text}
        resolvedTheme={resolvedTheme}
        allowHtml={allowHtml}
      />
    </div>
  )
})
