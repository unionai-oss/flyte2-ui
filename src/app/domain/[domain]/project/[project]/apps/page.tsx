/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { type Metadata } from 'next'

import { ListAppsPage } from '@/components/pages/ListApps/Main'

export const metadata: Metadata = {
  title: 'Apps',
}

export default function Home() {
  return <ListAppsPage />
}
