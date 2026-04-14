/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import React, { Fragment, ReactNode, useMemo } from 'react'
import { CopyButton } from './CopyButton'
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from './DescriptionList'
import { Link } from './Link'
import ThemedJSONTree from './ThemedJSONTree'

export type SectionItem = {
  name: string
  value: unknown
  url?: string
  copyBtn?: boolean
  /** Left padding level (0 = none, 1 = pl-4, 2 = pl-8, etc.). Only used when section has fullWidthItemBorders. */
  level?: number
}
export type Section = {
  id: string
  name: string
  value?: ReactNode
  items?: SectionItem[]
  /** When true, item borders span full width and item level padding is applied. Leave unset for other sections. */
  fullWidthItemBorders?: boolean
}

function itemValueToJson(value: unknown): unknown {
  if (React.isValidElement(value)) {
    return '[Rich content]'
  }
  return value
}

function itemToJsonEntry(item: SectionItem): unknown {
  if (item.url) {
    return {
      value: itemValueToJson(item.value),
      url: item.url,
    }
  }
  return itemValueToJson(item.value)
}

function sectionsToRawJson(sections: Section[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const section of sections) {
    const sectionKey = section.name || section.id || 'section'
    if (section.items?.length) {
      const itemsObj: Record<string, unknown> = {}
      for (const item of section.items) {
        itemsObj[item.name] = itemToJsonEntry(item)
      }
      result[sectionKey] = itemsObj
    } else if (section.value !== undefined) {
      result[sectionKey] = itemValueToJson(section.value)
    }
  }
  return result
}

const renderUnknownValue = (value: unknown) => {
  if (React.isValidElement(value)) {
    return value
  }
  const str = value?.toString() ?? ''
  if (str.length > 0) {
    return str
  }
  return '-'
}

const renderItemValue = (
  item: SectionItem,
  options?: { treatUndefinedAsEmpty?: boolean },
) => {
  const shouldTreatEmpty = options?.treatUndefinedAsEmpty === true

  const content =
    item.value === undefined && shouldTreatEmpty
      ? ''
      : renderUnknownValue(item.value)

  if (item.url) {
    return (
      <Link
        href={item.url}
        className="text-(--accent-text-blue) hover:underline"
      >
        {content}
      </Link>
    )
  }
  return content
}

function PrettySections({ sections }: { sections: Section[] }) {
  return (
    <div className="min-w-[500px] space-y-12">
      {sections.map(({ id, name, value, items, fullWidthItemBorders }) => (
        <div key={id}>
          <div
            className={`grid grid-cols-1 ${name && items?.length ? 'border-b border-(--system-gray-3) pb-2' : ''} ${value ? 'sm:grid-cols-2' : ''}`}
          >
            {name ? (
              <div className="flex items-center">
                <span className="text-xs tracking-[0.25px]">{name}</span>
              </div>
            ) : null}
            {value ? (
              <div className="flex items-center">
                <span className="truncate text-xs tracking-[0.25px]">
                  {value}
                </span>
              </div>
            ) : null}
          </div>

          {(items?.length || 0) > 0 ? (
            fullWidthItemBorders ? (
              <div className="w-full text-base/6 sm:text-sm/6">
                {items?.map((item, index, arr) => (
                  <div
                    key={`${item.name}-${index}`}
                    className={`grid w-full grid-cols-1 sm:grid-cols-2 ${index < arr.length - 1 ? 'border-b border-(--system-gray-3)' : ''}`}
                  >
                    <DescriptionTerm
                      className="border-0"
                      style={
                        item.level != null && item.level > 0
                          ? {
                              paddingLeft: `${item.level * 16}px`,
                            }
                          : undefined
                      }
                    >
                      {item.name}
                    </DescriptionTerm>
                    <DescriptionDetails className="border-0">
                      <div className="flex items-center justify-between gap-5 break-all whitespace-pre-wrap">
                        {renderItemValue(item, {
                          treatUndefinedAsEmpty: true,
                        })}
                        {item.copyBtn ? (
                          <CopyButton
                            value={item.value?.toString() ?? ''}
                          />
                        ) : null}
                      </div>
                    </DescriptionDetails>
                  </div>
                ))}
              </div>
            ) : (
              <DescriptionList>
                {items?.map((item, index, arr) => (
                  <Fragment key={item.name}>
                    <DescriptionTerm
                      className={
                        index < arr.length - 1
                          ? 'border-b border-(--system-gray-3)'
                          : ''
                      }
                    >
                      {item.name}
                    </DescriptionTerm>
                    <DescriptionDetails
                      className={
                        index < arr.length - 1
                          ? 'border-b border-(--system-gray-3)'
                          : ''
                      }
                    >
                      <div className="flex items-center justify-between gap-5 break-all whitespace-pre-wrap">
                        {renderItemValue(item)}
                        {item.copyBtn ? (
                          <CopyButton
                            value={item.value?.toString() ?? ''}
                          />
                        ) : null}
                      </div>
                    </DescriptionDetails>
                  </Fragment>
                ))}
              </DescriptionList>
            )
          ) : null}
        </div>
      ))}
    </div>
  )
}

export interface JsonViewerProps {
  /**
   * When false, renders structured description lists (pretty). When true (default), JSON tree.
   */
  isRawView?: boolean
  rawJson?: Record<string, unknown>
  sections?: Array<Section>
}

export const DescriptionListWrapper: React.FC<JsonViewerProps> = ({
  isRawView = true,
  sections = [],
  rawJson,
}) => {
  const data = useMemo(() => {
    if (rawJson !== undefined && rawJson !== null) {
      return rawJson
    }
    return sectionsToRawJson(sections)
  }, [rawJson, sections])

  return (
    <div
      className="rounded-lg dark:bg-(--system-black)"
      data-testid="dl-wrapper"
    >
      <div className="overflow-x-auto p-4">
        {isRawView ? (
          <ThemedJSONTree data={data} />
        ) : (
          <PrettySections sections={sections} />
        )}
      </div>
    </div>
  )
}
