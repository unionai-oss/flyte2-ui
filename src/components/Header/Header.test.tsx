/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Header } from './Header'

const identity = vi.hoisted(() => ({ data: undefined as unknown }))
vi.mock('@/hooks/useIdentity', () => ({ useIdentity: () => identity }))

describe('Header', () => {
  it('renders no user menu when there is no identity', () => {
    identity.data = undefined
    render(<Header />)
    expect(screen.queryByLabelText('User menu')).not.toBeInTheDocument()
  })

  it('shows the user name and a Sign out link', async () => {
    identity.data = { givenName: 'Kevin', familyName: 'Su', email: '', subject: 'k' }
    render(<Header />)
    expect(screen.getByText('Kevin Su')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('User menu'))
    expect(screen.getByRole('link', { name: 'Sign out' })).toHaveAttribute(
      'href',
      expect.stringContaining('/logout'),
    )
  })
})
