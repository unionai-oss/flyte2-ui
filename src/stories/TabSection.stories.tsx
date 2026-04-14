/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import type { Meta, StoryObj } from '@storybook/nextjs'
import { TabSection } from '@/components/TabSection'

const meta: Meta<typeof TabSection> = {
  title: 'Components/TabSection',
  component: TabSection,
  args: {
    heading: 'Example Section',
  },
}
export default meta

type Story = StoryObj<typeof TabSection>

// --- Simple usage with children ---
export const Simple: Story = {
  args: {
    children: (
      <div className="p-4 text-sm text-gray-800 dark:text-gray-200">
        <p>
          This is the <strong>simple TabSection</strong>. It just renders its
          children inside the layout.
        </p>
      </div>
    ),
    copyButtonContent: 'Some text to copy',
  },
}

// --- JSON body (typical raw data section) ---
export const WithJsonBody: Story = {
  args: {
    copyButtonContent: '{ "foo": "bar", "count": 42 }',
    children: (
      <pre className="overflow-auto p-4 text-xs text-white">
        {`{ "foo": "bar", "count": 42 }`}
      </pre>
    ),
  },
}
