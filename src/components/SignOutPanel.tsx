/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */
'use client'

import { Button } from '@/components/Button'
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogTitle,
} from '@/components/Dialog'
import { Logo } from '@/components/Logo'
import { getLogoutUrl } from '@/lib/apiUtils'
import { getWindow } from '@/lib/windowUtils'

export interface SignOutPanelProps {
  open: boolean
  onCancel: () => void
}

/**
 * Confirmation shown before signing out — matches the session-expired panel.
 * Signing out ends the proxy session, so it is worth a deliberate click rather
 * than firing on the menu item itself.
 */
export function SignOutPanel({ open, onCancel }: SignOutPanelProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      size="lg"
      aria-labelledby="signout-dialog-title"
      className="border-1 p-10 dark:border-(--system-gray-3)"
    >
      <div className="flex w-full flex-col items-center gap-1">
        <Logo width={55} height={44} className="shrink-0" />
        <DialogTitle
          id="signout-dialog-title"
          className="text-center !text-2xl font-semibold"
        >
          Sign out of Flyte?
        </DialogTitle>
        <DialogBody className="!mt-2 w-full !p-0">
          <p className="text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            You will need to sign in again to continue.
          </p>
        </DialogBody>
        <DialogActions className="flex sm:flex-col">
          <Button
            color="union"
            size="lg"
            className="!w-[311px] justify-center"
            data-testid="signout-confirm"
            onClick={() => {
              const w = getWindow()
              if (w) w.location.href = getLogoutUrl()
            }}
          >
            Sign out
          </Button>
          <Button
            outline
            size="lg"
            className="!w-[311px] justify-center"
            data-testid="signout-cancel"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  )
}
