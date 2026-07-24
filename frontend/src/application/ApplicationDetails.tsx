import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link, useParams } from 'react-router-dom'
import {
  ApiError,
  ApplicationStatus,
  ApplicationsService,
  CompaniesService,
  EmploymentType,
  PayPeriod,
  SourceCategory,
  WorkplaceArrangement,
  type Application,
  type Company,
  type ProblemDetail,
  type StatusHistoryEntry,
  type UpdateApplicationRequest,
} from '../generated'
import { problemMessage, useAuth } from '../auth/AuthContext'
import { formatDateTime } from '../dateTime'

type FormState = {
  companyId: string
  jobTitle: string
  applicationDate: string
  postingUrl: string
  location: string
  description: string
  notes: string
  employmentType: '' | EmploymentType
  workplaceArrangement: '' | WorkplaceArrangement
  salaryMin: string
  salaryMax: string
  salaryCurrency: string
  salaryPayPeriod: '' | PayPeriod
  sourceCategory: '' | SourceCategory
  sourceDetail: string
}

const emptyForm: FormState = {
  companyId: '',
  jobTitle: '',
  applicationDate: '',
  postingUrl: '',
  location: '',
  description: '',
  notes: '',
  employmentType: '',
  workplaceArrangement: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: '',
  salaryPayPeriod: '',
  sourceCategory: '',
  sourceDetail: '',
}

function isApplication(value: Application | ProblemDetail): value is Application {
  return 'id' in value
}

function formFrom(application: Application): FormState {
  return {
    companyId: application.company.id,
    jobTitle: application.jobTitle,
    applicationDate: application.applicationDate ?? '',
    postingUrl: application.postingUrl ?? '',
    location: application.location ?? '',
    description: application.description ?? '',
    notes: application.notes ?? '',
    employmentType: application.employmentType ?? '',
    workplaceArrangement: application.workplaceArrangement ?? '',
    salaryMin: application.salaryMin?.toString() ?? '',
    salaryMax: application.salaryMax?.toString() ?? '',
    salaryCurrency: application.salaryCurrency ?? '',
    salaryPayPeriod: application.salaryPayPeriod ?? '',
    sourceCategory: application.sourceCategory ?? '',
    sourceDetail: application.sourceDetail ?? '',
  }
}

function optional(value: string) {
  return value.trim() || undefined
}

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function apiProblem(error: unknown) {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body) {
    return error.body as ProblemDetail
  }
  return null
}

export default function ApplicationDetails() {
  const { applicationId = '' } = useParams()
  const { state } = useAuth()
  const timeZone = state.kind === 'authenticated' ? state.user.timeZone : 'UTC'
  const [application, setApplication] = useState<Application | null>(null)
  const [history, setHistory] = useState<StatusHistoryEntry[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [conflict, setConflict] = useState(false)
  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>('')
  const [statusNote, setStatusNote] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [statusConflict, setStatusConflict] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setConflict(false)
    try {
      const [applicationResponse, companyResponse, historyResponse] = await Promise.all([
        ApplicationsService.getApplication({ applicationId }),
        CompaniesService.listCompanies({ archived: false }),
        ApplicationsService.listApplicationStatusHistory({ applicationId }),
      ])
      if (!isApplication(applicationResponse)) throw new Error(applicationResponse.detail)
      if (!Array.isArray(historyResponse)) throw new Error(historyResponse.detail)
      setApplication(applicationResponse)
      setForm(formFrom(applicationResponse))
      setHistory(historyResponse)
      if ('companies' in companyResponse) setCompanies(companyResponse.companies)
    } catch (failure) {
      setError(problemMessage(failure, 'Could not load this application.'))
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => { void load() }, [load])

  function field(name: keyof FormState) {
    return {
      value: form[name],
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        setForm((current) => ({ ...current, [name]: event.target.value }))
        setFieldErrors((current) => ({ ...current, [name]: '' }))
        setSuccess('')
      },
    }
  }

  function validate() {
    const errors: Record<string, string> = {}
    if (!form.companyId) errors.companyId = 'Company is required.'
    if (!form.jobTitle.trim()) errors.jobTitle = 'Job title is required.'
    if (application?.status !== 'SAVED' && !form.applicationDate) {
      errors.applicationDate = 'Application date is required after Saved.'
    }
    const minimum = form.salaryMin === '' ? undefined : Number(form.salaryMin)
    const maximum = form.salaryMax === '' ? undefined : Number(form.salaryMax)
    if (minimum !== undefined && (Number.isNaN(minimum) || minimum < 0)) errors.salaryMin = 'Enter a non-negative amount.'
    if (maximum !== undefined && (Number.isNaN(maximum) || maximum < 0)) errors.salaryMax = 'Enter a non-negative amount.'
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
      errors.salaryMax = 'Salary maximum must be at least the minimum.'
    }
    if (form.salaryCurrency && !/^[A-Za-z]{3}$/.test(form.salaryCurrency.trim())) {
      errors.salaryCurrency = 'Use a 3-letter ISO code, such as CAD or USD.'
    }
    setFieldErrors(errors)
    return { valid: Object.keys(errors).length === 0, minimum, maximum }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!application) return
    setError('')
    setSuccess('')
    setConflict(false)
    const validation = validate()
    if (!validation.valid) return
    const request: UpdateApplicationRequest = {
      companyId: form.companyId,
      jobTitle: form.jobTitle.trim().replace(/\s+/gu, ' '),
      applicationDate: optional(form.applicationDate),
      postingUrl: optional(form.postingUrl),
      location: optional(form.location),
      description: optional(form.description),
      notes: optional(form.notes),
      employmentType: form.employmentType || undefined,
      workplaceArrangement: form.workplaceArrangement || undefined,
      salaryMin: validation.minimum,
      salaryMax: validation.maximum,
      salaryCurrency: optional(form.salaryCurrency)?.toUpperCase(),
      salaryPayPeriod: form.salaryPayPeriod || undefined,
      sourceCategory: form.sourceCategory || undefined,
      sourceDetail: optional(form.sourceDetail),
      version: application.version,
    }
    setSaving(true)
    try {
      const response = await ApplicationsService.updateApplication({ applicationId, requestBody: request })
      if (!isApplication(response)) throw new Error(response.detail)
      setApplication(response)
      setForm(formFrom(response))
      setSuccess('Application details saved.')
    } catch (failure) {
      const problem = apiProblem(failure)
      if (problem?.code === 'APPLICATION_VERSION_CONFLICT' || (failure instanceof ApiError && failure.status === 409)) {
        setConflict(true)
      } else {
        if (problem?.fieldErrors) setFieldErrors(problem.fieldErrors)
        setError(problemMessage(failure, 'Could not save this application. Review the form and try again.'))
      }
    } finally {
      setSaving(false)
    }
  }

  async function moveStatus(event: FormEvent) {
    event.preventDefault()
    if (!application || !newStatus) {
      setStatusError('Choose a status.')
      return
    }
    setStatusError('')
    setStatusConflict(false)
    setTransitioning(true)
    try {
      const response = await ApplicationsService.transitionApplicationStatus({
        applicationId,
        requestBody: {
          newStatus,
          note: optional(statusNote),
          version: application.version,
        },
      })
      if (!isApplication(response)) throw new Error(response.detail)
      const historyResponse = await ApplicationsService.listApplicationStatusHistory({ applicationId })
      if (!Array.isArray(historyResponse)) throw new Error(historyResponse.detail)
      setApplication(response)
      setHistory(historyResponse)
      setNewStatus('')
      setStatusNote('')
      setSuccess(`Status moved to ${label(response.status)}.`)
    } catch (failure) {
      const problem = apiProblem(failure)
      if (problem?.code === 'APPLICATION_VERSION_CONFLICT' || (failure instanceof ApiError && failure.status === 409)) {
        setStatusConflict(true)
      } else {
        setStatusError(problemMessage(failure, 'Could not change the application status.'))
      }
    } finally {
      setTransitioning(false)
    }
  }

  if (loading) {
    return <Stack alignItems="center" spacing={2} sx={{ py: 12 }} role="status"><CircularProgress /><Typography>Loading application…</Typography></Stack>
  }

  if (!application) {
    return (
      <Container component="main" maxWidth="md" sx={{ py: 6 }}>
        <Alert severity="error">{error || 'Application not found.'}</Alert>
        <Button component={Link} to="/app" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>Back to workspace</Button>
      </Container>
    )
  }

  const companyChoices = companies.some((company) => company.id === application.company.id)
    ? companies
    : [{ id: application.company.id, name: application.company.name } as Company, ...companies]

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
      <Button component={Link} to="/app" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>Back to workspace</Button>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={1}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
            <Box>
              <Typography component="h1" variant="h4">{application.jobTitle}</Typography>
              <Typography color="text.secondary">{application.company.name}</Typography>
            </Box>
            <Chip label={label(application.status)} color="primary" variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Created {formatDateTime(application.createdAt, timeZone)} · Updated {formatDateTime(application.updatedAt, timeZone)} · Version {application.version}
          </Typography>
        </Stack>

        <Box component="section" aria-labelledby="status-heading" sx={{ mt: 4 }}>
          <Typography id="status-heading" component="h2" variant="h6">Status pipeline</Typography>
          <Box component="form" onSubmit={(event) => void moveStatus(event)} noValidate sx={{ mt: 2 }}>
            <Stack spacing={2}>
              {statusError && <Alert severity="error">{statusError}</Alert>}
              {statusConflict && (
                <Alert
                  severity="warning"
                  action={<Button color="inherit" size="small" onClick={() => void load()}>Load latest</Button>}
                >
                  This application was updated elsewhere. Load the latest version before changing its status.
                </Alert>
              )}
              {application.status === ApplicationStatus.SAVED && !application.applicationDate && (
                <Alert severity="info">Add and save an application date before moving this application out of Saved.</Alert>
              )}
              <Grid container spacing={2} alignItems="flex-start">
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    required
                    label="Move to status"
                    SelectProps={{ native: true }}
                    value={newStatus}
                    onChange={(event) => {
                      setNewStatus(event.target.value as ApplicationStatus)
                      setStatusError('')
                    }}
                  >
                    <option value="" />
                    {Object.values(ApplicationStatus).map((status) => (
                      <option key={status} value={status}>{label(status)}</option>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    label="Transition note (optional)"
                    inputProps={{ maxLength: 2000 }}
                    value={statusNote}
                    onChange={(event) => setStatusNote(event.target.value)}
                  />
                </Grid>
              </Grid>
              <Button type="submit" variant="contained" disabled={transitioning} sx={{ alignSelf: { sm: 'flex-start' } }}>
                {transitioning ? 'Changing status…' : 'Change status'}
              </Button>
            </Stack>
          </Box>

          <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700, mt: 4 }}>History</Typography>
          {history.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>No status changes yet.</Typography>
          ) : (
            <Stack component="ol" aria-label="Status history" spacing={2} sx={{ mt: 1.5, mb: 0, pl: 3 }}>
              {history.map((entry) => (
                <Box component="li" key={entry.id}>
                  <Typography>
                    {label(entry.previousStatus)} → {label(entry.newStatus)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDateTime(entry.changedAt, timeZone)}
                  </Typography>
                  {entry.note && <Typography sx={{ mt: 0.5 }}>{entry.note}</Typography>}
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Box component="form" onSubmit={(event) => void submit(event)} noValidate sx={{ mt: 4 }}>
          <Stack spacing={3}>
            {success && <Alert severity="success" aria-live="polite">{success}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            {conflict && (
              <Alert
                severity="warning"
                action={<Button color="inherit" size="small" onClick={() => void load()}>Load latest</Button>}
              >
                This application was updated elsewhere. Your edits remain in the form until you load the latest version.
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  required
                  fullWidth
                  label="Company"
                  SelectProps={{ native: true }}
                  error={Boolean(fieldErrors.companyId)}
                  helperText={fieldErrors.companyId || 'Only active companies can replace the current company.'}
                  {...field('companyId')}
                >
                  {companyChoices.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField required fullWidth label="Job title" inputProps={{ maxLength: 300 }}
                  error={Boolean(fieldErrors.jobTitle)} helperText={fieldErrors.jobTitle} {...field('jobTitle')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Application date"
                  type="date"
                  required={application.status !== 'SAVED'}
                  InputLabelProps={{ shrink: true }}
                  error={Boolean(fieldErrors.applicationDate)}
                  helperText={fieldErrors.applicationDate || `Calendar date in ${timeZone}; backdating is allowed.`}
                  {...field('applicationDate')}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Posting URL" type="url" inputProps={{ maxLength: 2048 }} {...field('postingUrl')} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Location" inputProps={{ maxLength: 200 }} {...field('location')} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select fullWidth label="Employment type" SelectProps={{ native: true }} {...field('employmentType')}>
                  <option value="" />
                  {Object.values(EmploymentType).map((value) => <option key={value} value={value}>{label(value)}</option>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField select fullWidth label="Workplace arrangement" SelectProps={{ native: true }} {...field('workplaceArrangement')}>
                  <option value="" />
                  {Object.values(WorkplaceArrangement).map((value) => <option key={value} value={value}>{label(value)}</option>)}
                </TextField>
              </Grid>
            </Grid>

            <Box>
              <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Salary</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth label="Salary minimum" type="number" inputProps={{ min: 0, step: '0.01' }}
                    error={Boolean(fieldErrors.salaryMin)} helperText={fieldErrors.salaryMin} {...field('salaryMin')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth label="Salary maximum" type="number" inputProps={{ min: 0, step: '0.01' }}
                    error={Boolean(fieldErrors.salaryMax)} helperText={fieldErrors.salaryMax} {...field('salaryMax')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField fullWidth label="Currency" inputProps={{ maxLength: 3 }}
                    error={Boolean(fieldErrors.salaryCurrency)} helperText={fieldErrors.salaryCurrency || 'ISO code'} {...field('salaryCurrency')} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField select fullWidth label="Pay period" SelectProps={{ native: true }} {...field('salaryPayPeriod')}>
                    <option value="" />
                    {Object.values(PayPeriod).map((value) => <option key={value} value={value}>{label(value)}</option>)}
                  </TextField>
                </Grid>
              </Grid>
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField select fullWidth label="Source category" SelectProps={{ native: true }} {...field('sourceCategory')}>
                  <option value="" />
                  {Object.values(SourceCategory).map((value) => <option key={value} value={value}>{label(value)}</option>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField fullWidth label="Source detail" inputProps={{ maxLength: 500 }} {...field('sourceDetail')} />
              </Grid>
            </Grid>

            <TextField label="Job description" multiline minRows={3} inputProps={{ maxLength: 20000 }} {...field('description')} />
            <TextField label="Notes" multiline minRows={3} inputProps={{ maxLength: 10000 }} {...field('notes')} />
            <Button type="submit" variant="contained" size="large" disabled={saving} sx={{ alignSelf: { sm: 'flex-start' } }}>
              {saving ? 'Saving changes…' : 'Save changes'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  )
}
