/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { type Metadata } from 'next'

import { AppDetailsPage } from '@/components/pages/AppDetails/Main'

export const metadata: Metadata = {
  title: 'App Details',
}

export default function Home() {
  return <AppDetailsPage />
}
