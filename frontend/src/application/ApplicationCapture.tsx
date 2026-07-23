import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ApplicationsService,
  CompaniesService,
  EmploymentType,
  PayPeriod,
  SourceCategory,
  WorkplaceArrangement,
  type Application,
  type Company,
  type CreateApplicationRequest,
  type ProblemDetail,
} from '../generated'
import { problemMessage } from '../auth/AuthContext'

type CompanyMode = 'existing' | 'inline'
type FormState = {
  companyId: string
  companyName: string
  jobTitle: string
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
  companyName: '',
  jobTitle: '',
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

function optional(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function ApplicationCapture() {
  const [mode, setMode] = useState<CompanyMode>('existing')
  const [companies, setCompanies] = useState<Company[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [companyLoadError, setCompanyLoadError] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true)
    setCompanyLoadError('')
    try {
      const response = await CompaniesService.listCompanies({ archived: false })
      if (!('companies' in response)) throw new Error(response.detail)
      setCompanies(response.companies)
      setForm((current) => ({
        ...current,
        companyId: response.companies.some((company) => company.id === current.companyId)
          ? current.companyId
          : '',
      }))
      if (response.companies.length === 0) setMode('inline')
    } catch (failure) {
      setCompanyLoadError(problemMessage(failure, 'Could not load active companies. You can still create one inline.'))
    } finally {
      setLoadingCompanies(false)
    }
  }, [])

  useEffect(() => { void loadCompanies() }, [loadCompanies])

  function field(name: keyof FormState) {
    return {
      value: form[name],
      onChange: (event: ChangeEvent<HTMLInputElement>) => {
        setForm((current) => ({ ...current, [name]: event.target.value }))
        setFieldErrors((current) => ({ ...current, [name]: '' }))
      },
    }
  }

  function validate() {
    const errors: Record<string, string> = {}
    if (!form.jobTitle.trim()) errors.jobTitle = 'Job title is required.'
    if (mode === 'existing' && !form.companyId) errors.company = 'Select an active company.'
    if (mode === 'inline' && !form.companyName.trim()) errors.company = 'New company name is required.'
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
    setError('')
    setSuccess('')
    const validation = validate()
    if (!validation.valid) return
    const request: CreateApplicationRequest = {
      jobTitle: form.jobTitle.trim().replace(/\s+/gu, ' '),
      ...(mode === 'existing'
        ? { companyId: form.companyId }
        : { companyName: form.companyName.trim().replace(/\s+/gu, ' ') }),
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
    }
    setSaving(true)
    try {
      const response = await ApplicationsService.createApplication({ requestBody: request })
      if (!isApplication(response)) throw new Error(response.detail)
      setSuccess(`Saved ${response.jobTitle} at ${response.company.name}.`)
      setCompanies((current) => current.some((company) => company.id === response.company.id)
        ? current
        : [...current, {
          id: response.company.id,
          name: response.company.name,
          archived: false,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          version: 0,
        }].sort((left, right) => left.name.localeCompare(right.name)))
      setForm(emptyForm)
    } catch (failure) {
      setError(problemMessage(failure, 'Could not save this application. Review the form and try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box component="section" aria-labelledby="capture-heading" sx={{ pt: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <BookmarkAddOutlinedIcon color="primary" fontSize="large" />
        <Box>
          <Typography id="capture-heading" component="h2" variant="h5">Save an opportunity</Typography>
          <Typography color="text.secondary">Quick-capture a job now and add pipeline details later.</Typography>
        </Box>
      </Stack>

      <Box component="form" onSubmit={(event) => void submit(event)} noValidate sx={{ mt: 3 }}>
        <Stack spacing={3}>
          {success && <Alert severity="success" aria-live="polite">{success}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {companyLoadError && (
            <Alert severity="warning" action={<Button color="inherit" size="small" onClick={() => void loadCompanies()}>Retry</Button>}>
              {companyLoadError}
            </Alert>
          )}

          <FormControl error={Boolean(fieldErrors.company)}>
            <FormLabel id="company-mode-label">Company</FormLabel>
            <RadioGroup
              row
              aria-labelledby="company-mode-label"
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as CompanyMode)
                setFieldErrors((current) => ({ ...current, company: '' }))
              }}
            >
              <FormControlLabel value="existing" control={<Radio />} label="Choose existing" />
              <FormControlLabel value="inline" control={<Radio />} label="Create new inline" />
            </RadioGroup>
            {fieldErrors.company && <Typography variant="caption" color="error">{fieldErrors.company}</Typography>}
          </FormControl>

          {mode === 'existing' ? (
            <TextField
              select
              required
              label="Existing company"
              disabled={loadingCompanies}
              error={Boolean(fieldErrors.company)}
              helperText={loadingCompanies ? 'Loading active companies…' : 'Archived companies are not available.'}
              SelectProps={{ native: true }}
              {...field('companyId')}
            >
              <option value="" />
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </TextField>
          ) : (
            <TextField
              required
              label="New company name"
              inputProps={{ maxLength: 200 }}
              error={Boolean(fieldErrors.company)}
              helperText="The company will be created only if the application is saved."
              {...field('companyName')}
            />
          )}

          <TextField
            required
            label="Job title"
            inputProps={{ maxLength: 300 }}
            error={Boolean(fieldErrors.jobTitle)}
            helperText={fieldErrors.jobTitle}
            {...field('jobTitle')}
          />

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Posting URL" type="url" inputProps={{ maxLength: 2048 }} {...field('postingUrl')} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Location" inputProps={{ maxLength: 200 }} {...field('location')} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Employment type"
                SelectProps={{ native: true }}
                {...field('employmentType')}
              >
                <option value="" />
                {Object.values(EmploymentType).map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Workplace arrangement"
                SelectProps={{ native: true }}
                {...field('workplaceArrangement')}
              >
                <option value="" />
                {Object.values(WorkplaceArrangement).map((value) => <option key={value} value={value}>{label(value)}</option>)}
              </TextField>
            </Grid>
          </Grid>

          <Box>
            <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Salary (optional)</Typography>
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
                <TextField
                  select
                  fullWidth
                  label="Pay period"
                  SelectProps={{ native: true }}
                  {...field('salaryPayPeriod')}
                >
                  <option value="" />
                  {Object.values(PayPeriod).map((value) => <option key={value} value={value}>{label(value)}</option>)}
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Source category"
                SelectProps={{ native: true }}
                {...field('sourceCategory')}
              >
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
            {saving ? 'Saving application…' : 'Save application'}
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}
