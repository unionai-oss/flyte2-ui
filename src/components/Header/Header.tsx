/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

'use client'

import React, { useMemo, useState } from 'react'

import { type MenuItem, PopoverMenu } from '@/components/Popovers'
import { UserIcon } from '@/components/UserIdentityInfo'
import { useIdentity } from '@/hooks/useIdentity'
import { getLogoutUrl } from '@/lib/apiUtils'
import { resolveUserNameFields } from '@/lib/userIdentityUtils'

interface HeaderProps {
  logoComponent?: React.ReactNode
  showSearch?: boolean
}

export function Header({ logoComponent }: HeaderProps) {
  const { data: identity } = useIdentity()
  const [menuOpen, setMenuOpen] = useState(false)

  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        id: 'logout',
        type: 'custom',
        component: (
          <a
            href={getLogoutUrl()}
            className="flex w-full cursor-pointer items-center px-4.5 py-2 text-[13px] text-(--system-gray-6)"
            onClick={() => setMenuOpen(false)}
          >
            Sign out
          </a>
        ),
      },
    ],
    [],
  )

  const { firstName, lastName, userIdentityString } = resolveUserNameFields(
    identity?.givenName,
    identity?.familyName,
    identity?.email,
    identity?.subject,
  )

  return (
    <div
      className={`flex h-[56px] w-full items-center justify-between bg-(--system-gray-1) px-5 py-3`}
    >
      {logoComponent ? logoComponent : <div />}
      {/* No identity — nothing is authenticating this deployment, so no menu. */}
      {identity && (
        <PopoverMenu
          items={menuItems}
          showChevron={false}
          showCheckboxes={false}
          noSelectedBackground={true}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          placement="bottom-end"
        >
          <button
            type="button"
            className="cursor-pointer rounded-full !p-0 focus:ring-2 focus:ring-(--union) focus:ring-offset-2 focus:ring-offset-(--system-gray-1) focus:outline-none"
            aria-label="User menu"
          >
            <UserIcon
              firstName={firstName}
              lastName={lastName}
              userIdentityString={userIdentityString}
              showUserName
            />
          </button>
        </PopoverMenu>
      )}
    </div>
  )
}
