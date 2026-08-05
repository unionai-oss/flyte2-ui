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

  it('shows the user name and confirms before signing out', async () => {
    identity.data = {
      givenName: 'Kevin',
      familyName: 'Su',
      email: '',
      subject: 'k',
    }
    render(<Header />)
    expect(screen.getByText('Kevin Su')).toBeInTheDocument()

    // The menu item opens the confirmation rather than signing out directly.
    await userEvent.click(screen.getByLabelText('User menu'))
    expect(screen.queryByText('Sign out of Flyte?')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(screen.getByText('Sign out of Flyte?')).toBeInTheDocument()
  })
})
