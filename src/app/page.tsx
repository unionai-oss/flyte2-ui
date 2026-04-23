/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export const dynamic = 'force-dynamic'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    router.push('/projects')
  }, [router])
  return null
}
