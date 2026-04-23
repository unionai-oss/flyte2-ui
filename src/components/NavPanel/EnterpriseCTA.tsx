/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { FLYTE_LICENSED_EDITION_INFO_URL } from '@/lib/constants'
import { ArrowUpIcon } from '@heroicons/react/16/solid'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { Tooltip } from '../Tooltip'
import { NavPanelWidth } from './types'

type EnterpriseCTAProps = {
  size: NavPanelWidth
}

export const EnterpriseCTA = ({ size }: EnterpriseCTAProps) => {
  const isThin = size === 'thin'

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key="enterprise-cta"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={isThin ? 'px-0' : 'px-0.5'}
      >
        <Link
          href={FLYTE_LICENSED_EDITION_INFO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          {isThin ? (
            // Thin mode: just the icon with tooltip
            <Tooltip content="Upgrade to Enterprise" placement="right">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--union) transition-all duration-200 hover:bg-(--union)/10 group-hover:bg-(--union)/10 hover:shadow-lg"
              >
                <ArrowUpIcon className="h-4 w-4 text-(--union)" />
              </div>
            </Tooltip>
          ) : (
            // Wide mode: full CTA
            <div
              className="relative overflow-hidden rounded-lg border border-(--union) p-3 transition-all duration-200 hover:bg-(--union)/10 group-hover:bg-(--union)/10 hover:shadow-lg"
            >
              {/* Content */}
              <div className="relative flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-(--union)">
                    Upgrade to Enterprise
                  </div>
                  <div className="text-2xs text-(--system-gray-5)">
                    Unlock more benefits
                  </div>
                </div>

                <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-(--union)">
                  <ArrowUpIcon className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          )}
        </Link>
      </motion.div>
    </AnimatePresence>
  )
}
