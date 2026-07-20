import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { StrictMode } from 'react'
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
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    logoutEverywhere: vi.fn(),
    getCurrentUser: vi.fn(),
  },
  OpenAPI: {},
}))

const user = { id: '03d5c2ae-7267-4b45-b0d0-871db00767e4', email: 'person@example.com', createdAt: '2026-07-16T00:00:00Z' }
const authentication = { accessToken: 'access-token', expiresIn: 900, user }
const currentSession = {
  id: '491aed7d-0b01-4ec9-a557-38e64c7dbd3d',
  createdAt: '2026-07-16T00:00:00Z',
  lastUsedAt: '2026-07-19T00:00:00Z',
  expiresAt: '2026-08-18T00:00:00Z',
  current: true,
}
const otherSession = { ...currentSession, id: '8cff945e-1db3-49f7-b1b4-703fcfe54cdd', current: false }

function renderApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <ThemeProvider theme={createTheme()}>
      <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>
    </ThemeProvider>,
  )
}

function renderStrictApp(path: string) {
  window.history.pushState({}, '', path)
  return render(
    <StrictMode>
      <ThemeProvider theme={createTheme()}>
        <BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  )
}

describe('identity workflow', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    OpenAPI.TOKEN = undefined
    vi.mocked(AuthenticationService.refresh).mockRejectedValue(new Error('no session'))
    vi.mocked(AuthenticationService.logout).mockResolvedValue(undefined as never)
    vi.mocked(AuthenticationService.getCurrentUser).mockResolvedValue(user)
    vi.mocked(AuthenticationService.listSessions).mockResolvedValue({ sessions: [currentSession, otherSession] })
    vi.mocked(AuthenticationService.revokeSession).mockResolvedValue(undefined as never)
    vi.mocked(AuthenticationService.logoutEverywhere).mockResolvedValue(undefined as never)
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
    expect(AuthenticationService.getCurrentUser).toHaveBeenCalledTimes(2)
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('deduplicates session restoration under StrictMode', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderStrictApp('/app')

    expect(await screen.findByText(user.email)).toBeVisible()
    expect(AuthenticationService.refresh).toHaveBeenCalledOnce()
  })

  it('revalidates a session when re-entering the protected workspace', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')
    expect(await screen.findByText(user.email)).toBeVisible()

    fireEvent.click(screen.getByRole('link', { name: 'ApplyFlow' }))
    expect(await screen.findByRole('heading', { name: 'Keep your job search moving.' })).toBeVisible()
    vi.mocked(AuthenticationService.getCurrentUser).mockRejectedValueOnce(new Error('session revoked'))

    window.history.pushState({}, '', '/app')
    window.dispatchEvent(new PopStateEvent('popstate'))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeVisible()
    expect(OpenAPI.TOKEN).toBeUndefined()
  })

  it('returns cleanly to sign-in when scheduled silent refresh fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(AuthenticationService.refresh)
      .mockResolvedValueOnce(authentication)
      .mockRejectedValueOnce(new Error('session expired'))
    renderApp('/app')
    expect(await screen.findByText(user.email)).toBeVisible()

    await act(async () => { await vi.advanceTimersByTimeAsync(870_100) })

    expect(window.location.pathname).toBe('/sign-in')
    expect(OpenAPI.TOKEN).toBeUndefined()
  })

  it('clears browser authentication state on logout', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')
    await screen.findByText(user.email)

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(window.location.pathname).toBe('/sign-in'))
    expect(OpenAPI.TOKEN).toBeUndefined()
  })

  it('lists device sessions and revokes one without signing out the current device', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')

    expect(await screen.findByRole('heading', { name: 'Device sessions' })).toBeVisible()
    expect(await screen.findByText('This device')).toBeVisible()
    expect(screen.getByText('Signed-in device')).toBeVisible()
    const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' })
    fireEvent.click(revokeButtons[1])

    await waitFor(() => expect(AuthenticationService.revokeSession).toHaveBeenCalledWith({ sessionId: otherSession.id }))
    expect(screen.queryByText('Signed-in device')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/app')
  })

  it('signs out locally after logout everywhere', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')
    await screen.findByRole('heading', { name: 'Device sessions' })
    await screen.findByText('This device')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out everywhere' }))

    await waitFor(() => expect(window.location.pathname).toBe('/sign-in'))
    expect(AuthenticationService.logoutEverywhere).toHaveBeenCalledOnce()
    expect(OpenAPI.TOKEN).toBeUndefined()
  })
})
