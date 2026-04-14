'use client'

/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogBody,
} from '@/components/Dialog'
import { Button } from '@/components/Button'
import { Logo } from '@/components/Logo'
import { useAuthStatus } from '@/providers/authStatus'
import { getLoginUrl } from '@/lib/apiUtils'
import { getWindow } from '@/lib/windowUtils'

export function LoginPanel() {
  const { expired } = useAuthStatus()
  return (
    <Dialog
      open={!!expired}
      onClose={() => null}
      size="lg"
      aria-labelledby="login-dialog-title"
      className="border-1 p-10 dark:border-(--system-gray-3)"
      backdropClassName="!bg-white dark:!bg-black"
    >
      <div className="flex w-full flex-col items-center gap-1">
        <Logo width={55} height={44} className="shrink-0" />
        <DialogTitle
          id="login-dialog-title"
          className="text-center !text-2xl font-semibold"
        >
          Authorization Required
        </DialogTitle>
        <DialogBody className="!mt-2 w-full !p-0">
          <p
            id="login-dialog-description"
            className="text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400"
          >
            Your session has expired. Sign in again to continue.
          </p>
        </DialogBody>
        <DialogActions className="flex sm:flex-col">
          <Button
            color="union"
            size="lg"
            className="!w-[311px] justify-center"
            data-testid="login-button-overlay"
            onClick={() => {
              const w = getWindow()
              if (w) w.location.href = getLoginUrl()
            }}
          >
            Back to Sign in
          </Button>
        </DialogActions>
      </div>
    </Dialog>
  )
}
