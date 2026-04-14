/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  DescriptionListWrapper,
  type Section,
} from './DescriptionListWrapper'

describe('DescriptionListWrapper', () => {
  describe('raw JSON (default)', () => {
    it('renders raw JSON from sections when rawJson is omitted', () => {
      const sections: Section[] = [
        {
          id: 'main',
          name: 'Main',
          items: [
            { name: 'Name', value: 'my-task' },
            { name: 'Version', value: 'v1', copyBtn: true },
          ],
        },
      ]
      render(<DescriptionListWrapper sections={sections} />)
      expect(screen.getByTestId('dl-wrapper')).toBeInTheDocument()
      expect(screen.getByText(/Main/)).toBeInTheDocument()
      expect(screen.getByText(/Name/)).toBeInTheDocument()
      expect(screen.getByText(/my-task/)).toBeInTheDocument()
    })

    it('includes url next to value in JSON when item has url', () => {
      const sections: Section[] = [
        {
          id: 'main',
          name: '',
          items: [
            {
              name: 'Image',
              value: 'my-registry.io/image:tag',
              url: '/v2/domain/d/project/p/runs/run-123',
              copyBtn: true,
            },
          ],
        },
      ]
      render(<DescriptionListWrapper sections={sections} />)
      expect(screen.getByTestId('dl-wrapper')).toBeInTheDocument()
      expect(screen.getByText(/url/)).toBeInTheDocument()
      expect(
        screen.getByText(/\/v2\/domain\/d\/project\/p\/runs\/run-123/),
      ).toBeInTheDocument()
    })

    it('renders explicit rawJson when provided', () => {
      const rawJson = { task: 'spec' }
      render(<DescriptionListWrapper rawJson={rawJson} sections={[]} />)
      expect(screen.getByTestId('dl-wrapper')).toBeInTheDocument()
      expect(screen.getByText(/task/)).toBeInTheDocument()
      expect(screen.getByText(/"spec"/)).toBeInTheDocument()
    })
  })

  describe('pretty view', () => {
    it('renders section items with name and value', () => {
      const sections: Section[] = [
        {
          id: 'main',
          name: 'Main',
          items: [
            { name: 'Name', value: 'my-task' },
            { name: 'Version', value: 'v1', copyBtn: true },
          ],
        },
      ]
      render(
        <DescriptionListWrapper isRawView={false} sections={sections} />,
      )
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('my-task')).toBeInTheDocument()
      expect(screen.getByText('Version')).toBeInTheDocument()
      expect(screen.getByText('v1')).toBeInTheDocument()
    })

    it('renders item with url as a link with expected href and value text', () => {
      const sections: Section[] = [
        {
          id: 'main',
          name: '',
          items: [
            {
              name: 'Image',
              value: 'my-registry.io/image:tag',
              url: '/v2/domain/d/project/p/runs/run-123',
              copyBtn: true,
            },
          ],
        },
      ]
      render(
        <DescriptionListWrapper isRawView={false} sections={sections} />,
      )
      const link = screen.getByRole('link', {
        name: 'my-registry.io/image:tag',
      })
      expect(link).toHaveAttribute('href', '/v2/domain/d/project/p/runs/run-123')
    })
  })
})
