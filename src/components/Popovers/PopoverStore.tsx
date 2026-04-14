/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { create } from 'zustand'

type PopoverStore = {
  openId: string | null
  setOpenId: (id: string | null) => void
}

export const usePopoverStore = create<PopoverStore>((set) => ({
  openId: null,
  setOpenId: (id) => set({ openId: id }),
}))
