/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SignOutPanel } from './SignOutPanel'

const location = vi.hoisted(() => ({ href: '' }))
vi.mock('@/lib/windowUtils', () => ({ getWindow: () => ({ location }) }))

describe('SignOutPanel', () => {
  it('renders nothing while closed', () => {
    render(<SignOutPanel open={false} onCancel={vi.fn()} />)
    expect(screen.queryByText('Sign out of Flyte?')).not.toBeInTheDocument()
  })

  it('confirms to the logout url and cancels without leaving', async () => {
    const onCancel = vi.fn()
    render(<SignOutPanel open onCancel={onCancel} />)
    expect(screen.getByText('Sign out of Flyte?')).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('signout-cancel'))
    expect(onCancel).toHaveBeenCalled()
    expect(location.href).toBe('')

    await userEvent.click(screen.getByTestId('signout-confirm'))
    expect(location.href).toBe('/v2/logout?redirect_url=%2Fv2%2Fprojects')
  })
})
