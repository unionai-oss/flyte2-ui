/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { type Metadata } from 'next'
import React from 'react'
import { ListTasksPage } from '@/components/pages/ListTasks/Main'

export const metadata: Metadata = {
  title: 'Tasks',
}

export default function TasksPage() {
  return <ListTasksPage />
}
