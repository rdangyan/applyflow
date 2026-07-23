import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import AddIcon from '@mui/icons-material/Add'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Link,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { ApiError, CompaniesService, type Company, type CreateCompanyRequest, type ProblemDetail } from '../generated'
import { problemMessage } from '../auth/AuthContext'

type CompanyForm = Required<CreateCompanyRequest>
const emptyForm: CompanyForm = { name: '', website: '', industry: '', location: '', notes: '' }

function isCompany(value: Company | ProblemDetail): value is Company {
  return 'id' in value
}

function problemCode(error: unknown) {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body && 'code' in error.body) {
    return String(error.body.code)
  }
  return ''
}

export default function CompanyWorkspace() {
  const [archived, setArchived] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Company | null | undefined>(undefined)
  const [busyId, setBusyId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await CompaniesService.listCompanies({ archived })
      if (!('companies' in response)) throw new Error(response.detail)
      setCompanies(response.companies)
    } catch (failure) {
      setError(problemMessage(failure, 'Could not load companies.'))
    } finally {
      setLoading(false)
    }
  }, [archived])

  useEffect(() => { void load() }, [load])

  async function changeArchived(company: Company) {
    setBusyId(company.id)
    setError('')
    try {
      const response = archived
        ? await CompaniesService.restoreCompany({ companyId: company.id, requestBody: { version: company.version } })
        : await CompaniesService.archiveCompany({ companyId: company.id, requestBody: { version: company.version } })
      if (!isCompany(response)) throw new Error(response.detail)
      setCompanies((items) => items.filter((item) => item.id !== company.id))
    } catch (failure) {
      if (problemCode(failure) === 'COMPANY_VERSION_CONFLICT') {
        setError('This company changed elsewhere. Reloaded the latest company list; review it before trying again.')
        await load()
      } else {
        setError(problemMessage(failure, archived ? 'Could not restore company.' : 'Could not archive company.'))
      }
    } finally {
      setBusyId('')
    }
  }

  return (
    <Box component="section" aria-labelledby="companies-heading" sx={{ pt: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography id="companies-heading" component="h2" variant="h5">Companies</Typography>
          <Typography color="text.secondary">Private organization details shared by your future applications.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(null)}>Add company</Button>
      </Stack>

      <Tabs value={archived ? 1 : 0} onChange={(_, value: number) => setArchived(value === 1)} sx={{ mt: 2 }} aria-label="Company views">
        <Tab label="Active" />
        <Tab label="Archived" />
      </Tabs>

      {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>Retry</Button>} sx={{ mt: 2 }}>{error}</Alert>}
      {loading ? (
        <Stack role="status" direction="row" spacing={2} alignItems="center" sx={{ py: 5 }}>
          <CircularProgress size={24} /><Typography>Loading companies…</Typography>
        </Stack>
      ) : companies.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography variant="h6">{archived ? 'No archived companies' : 'No companies yet'}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {archived ? 'Companies you archive will appear here.' : 'Add a company with just its name to get started.'}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {companies.map((company) => (
            <Grid key={company.id} size={{ xs: 12, md: 6 }}>
              <CompanyCard
                company={company}
                busy={busyId === company.id}
                onEdit={() => setEditing(company)}
                onArchive={() => void changeArchived(company)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {editing !== undefined && (
        <CompanyDialog
          company={editing}
          onClose={() => setEditing(undefined)}
          onSaved={(saved) => {
            setCompanies((items) => {
              const present = items.some((item) => item.id === saved.id)
              return (present ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved])
                .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }))
            })
            setEditing(undefined)
          }}
          onConflict={async () => { setEditing(undefined); await load(); setError('This company changed elsewhere. The latest version is shown; review it before editing again.') }}
        />
      )}
    </Box>
  )
}

function CompanyCard({ company, busy, onEdit, onArchive }: {
  company: Company
  busy: boolean
  onEdit: () => void
  onArchive: () => void
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography component="h3" variant="h6">{company.name}</Typography>
        {company.industry && <Typography color="text.secondary">{company.industry}</Typography>}
        {company.location && <Typography variant="body2" sx={{ mt: 1 }}>{company.location}</Typography>}
        {company.website && <Link href={company.website} target="_blank" rel="noreferrer" sx={{ display: 'block', mt: 1, overflowWrap: 'anywhere' }}>{company.website}</Link>}
        {company.notes && <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{company.notes}</Typography>}
      </CardContent>
      <CardActions>
        <Button startIcon={<EditOutlinedIcon />} onClick={onEdit}>Edit</Button>
        <Button
          color={company.archived ? 'primary' : 'warning'}
          startIcon={company.archived ? <RestoreOutlinedIcon /> : <ArchiveOutlinedIcon />}
          disabled={busy}
          onClick={onArchive}
        >
          {busy ? 'Working…' : company.archived ? 'Restore' : 'Archive'}
        </Button>
      </CardActions>
    </Card>
  )
}

function CompanyDialog({ company, onClose, onSaved, onConflict }: {
  company: Company | null
  onClose: () => void
  onSaved: (company: Company) => void
  onConflict: () => Promise<void>
}) {
  const [form, setForm] = useState<CompanyForm>(() => company ? {
    name: company.name,
    website: company.website ?? '',
    industry: company.industry ?? '',
    location: company.location ?? '',
    notes: company.notes ?? '',
  } : emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')

  function field(name: keyof CompanyForm) {
    return {
      value: form[name],
      onChange: (event: ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [name]: event.target.value })),
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNameError('')
    const normalizedName = form.name.trim().replace(/\s+/gu, ' ')
    if (!normalizedName) { setNameError('Company name is required.'); return }
    setSaving(true)
    const request = { ...form, name: normalizedName }
    try {
      const response = company
        ? await CompaniesService.updateCompany({ companyId: company.id, requestBody: { ...request, version: company.version } })
        : await CompaniesService.createCompany({ requestBody: request })
      if (!isCompany(response)) throw new Error(response.detail)
      onSaved(response)
    } catch (failure) {
      const code = problemCode(failure)
      if (code === 'COMPANY_VERSION_CONFLICT') await onConflict()
      else if (code === 'COMPANY_NAME_CONFLICT') setNameError('A company with this name already exists in your workspace.')
      else setError(problemMessage(failure, 'Could not save company.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" component="form" onSubmit={(event) => void save(event)}>
      <DialogTitle>{company ? 'Edit company' : 'Add company'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField autoFocus required label="Company name" inputProps={{ maxLength: 200 }} error={Boolean(nameError)} helperText={nameError} {...field('name')} />
          <TextField label="Website" type="url" inputProps={{ maxLength: 2048 }} {...field('website')} />
          <TextField label="Industry" inputProps={{ maxLength: 200 }} {...field('industry')} />
          <TextField label="Location" inputProps={{ maxLength: 200 }} {...field('location')} />
          <TextField label="Notes" multiline minRows={3} inputProps={{ maxLength: 10000 }} {...field('notes')} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={saving}>{saving ? 'Saving…' : 'Save company'}</Button>
      </DialogActions>
    </Dialog>
  )
}
