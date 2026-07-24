import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import {
  ApiError,
  ApplicationStatus,
  ApplicationsService,
  AuthenticationService,
  CompaniesService,
  EmploymentType,
  OpenAPI,
  PayPeriod,
  SourceCategory,
  WorkplaceArrangement,
} from './generated'

vi.mock('./generated', () => ({
  ApplicationStatus: {
    SAVED: 'SAVED', APPLIED: 'APPLIED', SCREENING: 'SCREENING', INTERVIEWING: 'INTERVIEWING',
    OFFER: 'OFFER', ACCEPTED: 'ACCEPTED', REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN',
  },
  EmploymentType: {
    FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME', CONTRACT: 'CONTRACT',
    TEMPORARY: 'TEMPORARY', INTERNSHIP: 'INTERNSHIP', OTHER: 'OTHER',
  },
  WorkplaceArrangement: { REMOTE: 'REMOTE', HYBRID: 'HYBRID', ON_SITE: 'ON_SITE' },
  PayPeriod: { HOURLY: 'HOURLY', MONTHLY: 'MONTHLY', YEARLY: 'YEARLY' },
  SourceCategory: {
    COMPANY_WEBSITE: 'COMPANY_WEBSITE', LINKEDIN: 'LINKEDIN', INDEED: 'INDEED',
    REFERRAL: 'REFERRAL', RECRUITER: 'RECRUITER', OTHER_JOB_BOARD: 'OTHER_JOB_BOARD',
    CAREER_FAIR: 'CAREER_FAIR', OTHER: 'OTHER',
  },
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
  ApplicationsService: {
    createApplication: vi.fn(),
    getApplication: vi.fn(),
    updateApplication: vi.fn(),
    listApplicationStatusHistory: vi.fn(),
    transitionApplicationStatus: vi.fn(),
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
const application = {
  id: '01e42f7a-6e72-4b9c-a62c-11cc1ca84218',
  company: { id: company.id, name: company.name },
  jobTitle: 'Senior Engineer',
  status: ApplicationStatus.SAVED,
  createdAt: '2026-07-23T00:00:00Z',
  updatedAt: '2026-07-23T00:00:00Z',
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
    vi.mocked(ApplicationsService.createApplication).mockResolvedValue(application)
    vi.mocked(ApplicationsService.getApplication).mockResolvedValue(application)
    vi.mocked(ApplicationsService.updateApplication).mockResolvedValue({ ...application, version: 1 })
    vi.mocked(ApplicationsService.listApplicationStatusHistory).mockResolvedValue([])
    vi.mocked(ApplicationsService.transitionApplicationStatus).mockResolvedValue({
      ...application, status: ApplicationStatus.APPLIED, version: 1,
    })
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
    vi.mocked(CompaniesService.listCompanies).mockImplementation(({ archived } = {}) => Promise.resolve({
      companies: archived
        ? [{ ...company, archived: true, archivedAt: '2026-07-22T01:00:00Z', version: 1 }]
        : [company],
    }) as never)
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

  it('captures a Saved application with an existing active company and structured fields', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.listCompanies).mockResolvedValue({ companies: [company] })
    renderApp('/app')

    const companySelect = await screen.findByRole('combobox', { name: /Existing company/ })
    await waitFor(() => expect(companySelect).toBeEnabled())
    fireEvent.change(companySelect, { target: { value: company.id } })
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: '  Senior   Engineer ' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Employment type' }), { target: { value: 'FULL_TIME' } })
    fireEvent.change(screen.getByLabelText('Salary minimum'), { target: { value: '120000.25' } })
    fireEvent.change(screen.getByLabelText('Salary maximum'), { target: { value: '150000.50' } })
    fireEvent.change(screen.getByLabelText('Currency'), { target: { value: 'cad' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Pay period' }), { target: { value: 'YEARLY' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save application' }))

    await waitFor(() => expect(ApplicationsService.createApplication).toHaveBeenCalledWith({
      requestBody: expect.objectContaining({
        companyId: company.id,
        jobTitle: 'Senior Engineer',
        employmentType: 'FULL_TIME',
        salaryMin: 120000.25,
        salaryMax: 150000.5,
        salaryCurrency: 'CAD',
        salaryPayPeriod: 'YEARLY',
      }),
    }))
    expect(await screen.findByText('Saved Senior Engineer at Acme Labs.')).toBeVisible()
  })

  it('creates a company inline with the application payload', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.listCompanies).mockResolvedValue({ companies: [] })
    vi.mocked(ApplicationsService.createApplication).mockResolvedValue({
      ...application,
      company: { id: '0f47efb1-2236-4f8c-a672-c83f62bedbf5', name: 'New Labs' },
      jobTitle: 'Designer',
    })
    renderApp('/app')

    fireEvent.click(await screen.findByLabelText('Create new inline'))
    fireEvent.change(await screen.findByRole('textbox', { name: /New company name/ }), { target: { value: '  New   Labs ' } })
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Designer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save application' }))

    await waitFor(() => expect(ApplicationsService.createApplication).toHaveBeenCalledWith({
      requestBody: expect.objectContaining({ companyName: 'New Labs', jobTitle: 'Designer' }),
    }))
    expect(await screen.findByText('Saved Designer at New Labs.')).toBeVisible()
  })

  it('rejects an invalid salary range before sending the application', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.listCompanies).mockResolvedValue({ companies: [company] })
    renderApp('/app')

    const companySelect = await screen.findByRole('combobox', { name: /Existing company/ })
    await waitFor(() => expect(companySelect).toBeEnabled())
    fireEvent.change(companySelect, { target: { value: company.id } })
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Engineer' } })
    fireEvent.change(screen.getByLabelText('Salary minimum'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Salary maximum'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save application' }))

    expect(await screen.findByText('Salary maximum must be at least the minimum.')).toBeVisible()
    expect(ApplicationsService.createApplication).not.toHaveBeenCalled()
  })

  it('shows every application detail and submits a backdated local calendar date', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.listCompanies).mockResolvedValue({ companies: [company] })
    vi.mocked(ApplicationsService.getApplication).mockResolvedValue({
      ...application,
      postingUrl: 'https://jobs.example/42',
      location: 'Vancouver',
      description: 'Build useful things',
      notes: 'Ask about the team',
      employmentType: EmploymentType.FULL_TIME,
      workplaceArrangement: WorkplaceArrangement.HYBRID,
      salaryMin: 120000,
      salaryMax: 150000,
      salaryCurrency: 'CAD',
      salaryPayPeriod: PayPeriod.YEARLY,
      sourceCategory: SourceCategory.REFERRAL,
      sourceDetail: 'Former colleague',
    })
    vi.mocked(ApplicationsService.updateApplication).mockResolvedValue({
      ...application,
      jobTitle: 'Principal Engineer',
      applicationDate: '2024-01-15',
      version: 1,
    })
    renderApp(`/app/applications/${application.id}`)

    expect(await screen.findByRole('heading', { name: 'Senior Engineer' })).toBeVisible()
    expect(screen.getByDisplayValue('Build useful things')).toBeVisible()
    expect(screen.getByDisplayValue('Former colleague')).toBeVisible()
    expect(screen.getByText(/America\/Vancouver/)).toBeVisible()

    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Principal Engineer' } })
    fireEvent.change(screen.getByLabelText(/Application date/), { target: { value: '2024-01-15' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(ApplicationsService.updateApplication).toHaveBeenCalledWith({
      applicationId: application.id,
      requestBody: expect.objectContaining({
        companyId: company.id,
        jobTitle: 'Principal Engineer',
        applicationDate: '2024-01-15',
        version: 0,
      }),
    }))
    expect(await screen.findByText('Application details saved.')).toBeVisible()
  })

  it('keeps stale edits visible and offers to load the latest application', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.listCompanies).mockResolvedValue({ companies: [company] })
    vi.mocked(ApplicationsService.updateApplication).mockRejectedValue(new ApiError(
      { method: 'PUT', url: '/api/v1/applications/{applicationId}' },
      {
        url: `/api/v1/applications/${application.id}`,
        ok: false,
        status: 409,
        statusText: 'Conflict',
        body: { code: 'APPLICATION_VERSION_CONFLICT', detail: 'The application changed since it was last read' },
      },
      'Conflict',
    ))
    renderApp(`/app/applications/${application.id}`)

    await screen.findByRole('heading', { name: 'Senior Engineer' })
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'My stale edit' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(/updated elsewhere/)).toBeVisible()
    expect(screen.getByDisplayValue('My stale edit')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Load latest' })).toBeVisible()
  })

  it('explicitly changes status and renders chronological history with local times and notes', async () => {
    vi.mocked(AuthenticationService.refresh).mockResolvedValue(authentication)
    vi.mocked(CompaniesService.listCompanies).mockResolvedValue({ companies: [company] })
    const history = [{
      id: '57355da9-69bc-47cc-900d-42df9055719f',
      applicationId: application.id,
      previousStatus: ApplicationStatus.SAVED,
      newStatus: ApplicationStatus.APPLIED,
      changedAt: '2026-07-23T18:00:00Z',
      note: 'Submitted through the company site',
    }]
    vi.mocked(ApplicationsService.listApplicationStatusHistory)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(history)
    renderApp(`/app/applications/${application.id}`)

    await screen.findByRole('heading', { name: 'Senior Engineer' })
    fireEvent.change(screen.getByLabelText(/Move to status/), { target: { value: ApplicationStatus.APPLIED } })
    fireEvent.change(screen.getByLabelText(/Transition note/), {
      target: { value: 'Submitted through the company site' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Change status' }))

    await waitFor(() => expect(ApplicationsService.transitionApplicationStatus).toHaveBeenCalledWith({
      applicationId: application.id,
      requestBody: {
        newStatus: ApplicationStatus.APPLIED,
        note: 'Submitted through the company site',
        version: 0,
      },
    }))
    const timeline = await screen.findByRole('list', { name: 'Status history' })
    expect(timeline).toHaveTextContent('Saved → Applied')
    expect(timeline).toHaveTextContent('Submitted through the company site')
    expect(screen.getByText('Status moved to Applied.')).toBeVisible()
  })
})
