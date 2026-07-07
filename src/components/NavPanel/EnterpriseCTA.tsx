/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import {
  getLicensedEditionInfoUrl,
  LICENSED_EDITION_UPGRADE_SOURCES,
} from '@/lib/constants'
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { Tooltip } from '../Tooltip'
import { NavPanelWidth } from './types'

type EnterpriseCTAProps = {
  size: NavPanelWidth
}

const EnterpriseArrowIcon = ({
  className,
  color = '#EDEDED',
}: {
  className?: string
  color?: string
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="9"
    height="11"
    viewBox="0 0 9 11"
    fill="none"
    className={className}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.14349 4.75273C8.00148 4.90294 7.77124 4.90294 7.62923 4.75273L4.61364 1.56316V9.86538C4.61364 10.0778 4.45083 10.25 4.25 10.25C4.04917 10.25 3.88636 10.0778 3.88636 9.86538L3.88636 1.56316L0.870767 4.75273C0.728757 4.90294 0.498516 4.90294 0.356507 4.75273C0.214498 4.60253 0.214498 4.35901 0.356507 4.20881L3.99287 0.362651C4.13488 0.21245 4.36512 0.21245 4.50713 0.362651L8.14349 4.20881C8.2855 4.35901 8.2855 4.60253 8.14349 4.75273Z"
      fill={color}
      stroke={color}
      strokeWidth="0.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const RoundedArrowButton = ({ className = '' }: { className?: string }) => (
  <div
    className={`flex aspect-square h-6 w-6 shrink-0 items-center justify-center gap-2.5 rounded-[16px] bg-(--union) px-0.5 py-[1px] ${className}`}
  >
    <EnterpriseArrowIcon className="shrink-0" color="#EDEDED" />
  </div>
)

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
        className={isThin ? 'mt-3 mb-2 px-0' : 'mt-3 mb-2 px-0.5'}
      >
        <Link
          href={getLicensedEditionInfoUrl(
            LICENSED_EDITION_UPGRADE_SOURCES.sidebarEnterpriseCta,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          {isThin ? (
            // Thin mode: just the icon with tooltip
            <Tooltip content="Upgrade to Enterprise" placement="right">
              <RoundedArrowButton className="mx-auto transition-all duration-200 group-hover:bg-(--union) hover:bg-(--union) hover:shadow-lg" />
            </Tooltip>
          ) : (
            // Wide mode: full CTA
            <div className="relative w-[220px] overflow-hidden rounded-lg border border-(--union) py-1.5 pr-[15px] pl-2.5 transition-all duration-200 group-hover:bg-(--union)/10 hover:bg-(--union)/10 hover:shadow-lg">
              {/* Content */}
              <div className="relative flex items-center justify-between">
                <div className="flex flex-1 flex-col">
                  <div className="text-sm leading-[150%] font-semibold text-(--union)">
                    Upgrade to Enterprise
                  </div>
                  <div className="mt-0.5 text-xs leading-[150%] font-medium text-(--system-gray-5)">
                    Unlock more benefits
                  </div>
                </div>

                <RoundedArrowButton className="ml-2" />
              </div>
            </div>
          )}
        </Link>
      </motion.div>
    </AnimatePresence>
  )
}
