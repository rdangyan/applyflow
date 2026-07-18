import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { AuthenticationService, OpenAPI } from './generated'

vi.mock('./generated', () => ({
  ApiError: class ApiError extends Error {},
  AuthenticationService: {
    refresh: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
  OpenAPI: {},
}))

const user = { id: '03d5c2ae-7267-4b45-b0d0-871db00767e4', email: 'person@example.com', createdAt: '2026-07-16T00:00:00Z' }
const authentication = { accessToken: 'access-token', expiresIn: 900, user }

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <ThemeProvider theme={createTheme()}>
      <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>
    </ThemeProvider>,
  )
}

describe('identity workflow', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    OpenAPI.TOKEN = undefined
    vi.mocked(AuthenticationService.refresh).mockRejectedValue(new Error('no session'))
    vi.mocked(AuthenticationService.logout).mockResolvedValue(undefined as never)
    vi.mocked(AuthenticationService.getCurrentUser).mockResolvedValue(user)
  })

  it('redirects an anonymous visitor away from the protected workspace', async () => {
    renderApp('/app')
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeVisible()
    expect(window.location.pathname).toBe('/sign-in')
  })

  it('signs in and displays only the current user context', async () => {
    vi.mocked(AuthenticationService.login).mockResolvedValue(authentication)
    renderApp('/sign-in')
    await screen.findByRole('heading', { name: 'Welcome back' })

    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'secure-password-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Your private workspace' })).toBeVisible()
    expect(screen.getByText(user.email)).toBeVisible()
    expect(OpenAPI.TOKEN).toBe('access-token')
  })

  it('restores identity from the refresh cookie without browser token storage', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')

    expect(await screen.findByText(user.email)).toBeVisible()
    expect(AuthenticationService.refresh).toHaveBeenCalledOnce()
    expect(AuthenticationService.getCurrentUser).toHaveBeenCalledOnce()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('clears browser authentication state on logout', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')
    await screen.findByText(user.email)

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(window.location.pathname).toBe('/sign-in'))
    expect(OpenAPI.TOKEN).toBeUndefined()
  })
})
