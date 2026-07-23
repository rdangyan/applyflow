import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { ApiError, AuthenticationService, CompaniesService, OpenAPI } from './generated'

vi.mock('./generated', () => ({
  ApiError: class ApiError extends Error {
    status: number
    body: unknown
    constructor(_request: unknown, response: { status: number, body: unknown }, message = 'API error') {
      super(message); this.status = response.status; this.body = response.body
    }
  },
  AuthenticationService: {
    refresh: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    listSessions: vi.fn(),
    revokeSession: vi.fn(),
    logoutEverywhere: vi.fn(),
    getCurrentUser: vi.fn(),
    updateProfile: vi.fn(),
  },
  CompaniesService: {
    listCompanies: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    archiveCompany: vi.fn(),
    restoreCompany: vi.fn(),
  },
  OpenAPI: {},
}))

const user = {
  id: '03d5c2ae-7267-4b45-b0d0-871db00767e4',
  email: 'person@example.com',
  createdAt: '2026-07-16T00:00:00Z',
  timeZone: 'America/Vancouver',
  version: 0,
}
const authentication = { accessToken: 'access-token', expiresIn: 900, user }
const currentSession = {
  id: '491aed7d-0b01-4ec9-a557-38e64c7dbd3d',
  createdAt: '2026-07-16T00:00:00Z',
  lastUsedAt: '2026-07-19T00:00:00Z',
  expiresAt: '2026-08-18T00:00:00Z',
  current: true,
}
const otherSession = { ...currentSession, id: '8cff945e-1db3-49f7-b1b4-703fcfe54cdd', current: false }
const company = {
  id: 'ef25b842-c06d-4a79-8dc4-902ee45e9f6c',
  name: 'Acme Labs',
  website: 'https://acme.example',
  industry: 'Software',
  location: 'Vancouver',
  notes: 'Growing team',
  archived: false,
  createdAt: '2026-07-22T00:00:00Z',
  updatedAt: '2026-07-22T00:00:00Z',
  version: 0,
}

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
    vi.mocked(AuthenticationService.updateProfile).mockResolvedValue({ ...user, timeZone: 'Asia/Tokyo', version: 1 })
    vi.mocked(AuthenticationService.listSessions).mockResolvedValue({ sessions: [currentSession, otherSession] })
    vi.mocked(AuthenticationService.revokeSession).mockResolvedValue(undefined as never)
    vi.mocked(AuthenticationService.logoutEverywhere).mockResolvedValue(undefined as never)
    vi.mocked(CompaniesService.listCompanies).mockResolvedValue({ companies: [] })
    vi.mocked(CompaniesService.createCompany).mockResolvedValue(company)
    vi.mocked(CompaniesService.updateCompany).mockResolvedValue({ ...company, version: 1 })
    vi.mocked(CompaniesService.archiveCompany).mockResolvedValue({ ...company, archived: true, version: 1 })
    vi.mocked(CompaniesService.restoreCompany).mockResolvedValue({ ...company, archived: false, version: 2 })
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

  it('shows the browser suggestion during registration', async () => {
    renderApp('/register')

    expect(await screen.findByLabelText(/^Time zone/)).toHaveValue(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(screen.getByText(/Suggested from this browser/)).toBeVisible()
  })

  it('updates the persisted profile zone and rerenders shared timestamps', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')
    const field = await screen.findByLabelText(/^Time zone/)
    const before = (await screen.findAllByText(/Last used/))[0].textContent

    fireEvent.change(field, { target: { value: 'Asia/Tokyo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(AuthenticationService.updateProfile).toHaveBeenCalledWith({
      requestBody: { timeZone: 'Asia/Tokyo', version: 0 },
    }))
    expect(await screen.findByText('Time zone saved.')).toBeVisible()
    expect(screen.getAllByText(/Last used/)[0].textContent).not.toBe(before)
  })

  it('shows the empty company view and creates a name-only company', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    renderApp('/app')

    expect(await screen.findByText('No companies yet')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Add company' }))
    fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: '  Acme   Labs  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }))

    await waitFor(() => expect(CompaniesService.createCompany).toHaveBeenCalledWith({
      requestBody: { name: 'Acme Labs', website: '', industry: '', location: '', notes: '' },
    }))
    expect(await screen.findByRole('heading', { name: 'Acme Labs' })).toBeVisible()
  })

  it('archives a company and exposes the archived restore view', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.listCompanies)
      .mockResolvedValueOnce({ companies: [company] })
      .mockResolvedValueOnce({ companies: [{ ...company, archived: true, archivedAt: '2026-07-22T01:00:00Z', version: 1 }] })
    renderApp('/app')

    expect(await screen.findByRole('heading', { name: 'Acme Labs' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    await waitFor(() => expect(CompaniesService.archiveCompany).toHaveBeenCalledWith({ companyId: company.id, requestBody: { version: 0 } }))
    expect(await screen.findByText('No companies yet')).toBeVisible()

    fireEvent.click(screen.getByRole('tab', { name: 'Archived' }))
    expect(await screen.findByRole('button', { name: 'Restore' })).toBeVisible()
  })

  it('keeps a normalized duplicate conflict attached to the company name field', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.createCompany).mockRejectedValue(new ApiError(
      { method: 'POST', url: '/api/v1/companies' },
      { url: '/api/v1/companies', ok: false, status: 409, statusText: 'Conflict', body: { code: 'COMPANY_NAME_CONFLICT' } },
      'Conflict',
    ))
    renderApp('/app')
    await screen.findByText('No companies yet')

    fireEvent.click(screen.getByRole('button', { name: 'Add company' }))
    fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: 'ACME LABS' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save company' }))

    expect(await screen.findByText('A company with this name already exists in your workspace.')).toBeVisible()
  })
})
