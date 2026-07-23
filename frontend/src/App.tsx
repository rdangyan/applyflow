import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Chip,
  Container,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { problemMessage, useAuth } from './auth/AuthContext'
import type { DeviceSession } from './generated'
import { browserTimeZone, formatDateTime, validTimeZone } from './dateTime'
import CompanyWorkspace from './company/CompanyWorkspace'

export default function App() {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'primary.dark' }}>
        <Toolbar>
          <Typography component={Link} to="/" variant="h6" color="inherit" sx={{ flexGrow: 1, fontWeight: 750, textDecoration: 'none' }}>
            ApplyFlow
          </Typography>
          <AuthActions />
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/app" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}

function AuthActions() {
  const { state, logout } = useAuth()
  const navigate = useNavigate()
  if (state.kind === 'authenticated') {
    return <Button color="inherit" onClick={() => void logout().then(() => navigate('/sign-in'))}>Sign out</Button>
  }
  if (state.kind === 'restoring') return <CircularProgress size={22} color="inherit" aria-label="Restoring session" />
  return <Button color="inherit" component={Link} to="/sign-in">Sign in</Button>
}

function Landing() {
  return (
    <Container component="main" maxWidth="md" sx={{ py: { xs: 7, md: 12 } }}>
      <Stack spacing={3} alignItems="flex-start">
        <Typography component="h1" variant="h2">Keep your job search moving.</Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680, lineHeight: 1.6, fontWeight: 400 }}>
          ApplyFlow gives each job seeker a private workspace for applications, interviews, and follow-ups.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="contained" size="large" component={Link} to="/register">Create private workspace</Button>
          <Button variant="outlined" size="large" component={Link} to="/sign-in">Sign in</Button>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Portfolio demonstration · Avoid entering sensitive information · <MuiLink href="/swagger-ui.html">API documentation</MuiLink>
        </Typography>
      </Stack>
    </Container>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { state, validateSession } = useAuth()
  const location = useLocation()
  const [validating, setValidating] = useState(true)

  useEffect(() => {
    if (state.kind !== 'authenticated') {
      return
    }
    let active = true
    setValidating(true)
    void validateSession().finally(() => { if (active) setValidating(false) })
    return () => { active = false }
  }, [state.kind, validateSession])

  if (state.kind === 'restoring') return <CenteredProgress label="Restoring your workspace…" />
  if (state.kind === 'anonymous') return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />
  if (validating) return <CenteredProgress label="Verifying your session…" />
  return children
}

function Workspace() {
  const { state } = useAuth()
  if (state.kind !== 'authenticated') return null
  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={2}>
          <Typography component="h1" variant="h4">Your private workspace</Typography>
          <Typography color="text.secondary">Signed in as</Typography>
          <Typography sx={{ fontWeight: 700 }}>{state.user.email}</Typography>
          <CompanyWorkspace />
          <ProfileEditor />
          <SessionManager />
        </Stack>
      </Paper>
    </Container>
  )
}

function SessionManager() {
  const { state, listSessions, revokeSession, logoutEverywhere } = useAuth()
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')

  useEffect(() => {
    let active = true
    listSessions()
      .then((items) => { if (active) setSessions(items) })
      .catch((failure) => { if (active) setError(problemMessage(failure, 'Could not load your sessions.')) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [listSessions])

  async function revoke(session: DeviceSession) {
    setBusyId(session.id)
    setError('')
    try {
      await revokeSession(session)
      setSessions((items) => items.filter((item) => item.id !== session.id))
    } catch (failure) {
      setError(problemMessage(failure, 'Could not revoke that session.'))
    } finally {
      setBusyId('')
    }
  }

  async function revokeAll() {
    setBusyId('all')
    setError('')
    try {
      await logoutEverywhere()
    } catch (failure) {
      setError(problemMessage(failure, 'Could not sign out everywhere.'))
      setBusyId('')
    }
  }

  return (
    <Box sx={{ pt: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
        <Box>
          <Typography component="h2" variant="h6">Device sessions</Typography>
          <Typography variant="body2" color="text.secondary">Each browser stays signed in independently for up to 30 inactive days.</Typography>
        </Box>
        <Button color="error" variant="outlined" disabled={loading || busyId !== ''} onClick={() => void revokeAll()}>
          Sign out everywhere
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress size={24} aria-label="Loading sessions" sx={{ mt: 3 }} /> : (
        <Stack spacing={1.5} sx={{ mt: 3 }}>
          {sessions.map((session) => (
            <Paper key={session.id} variant="outlined" sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontWeight: 700 }}>{session.current ? 'This device' : 'Signed-in device'}</Typography>
                    {session.current && <Chip size="small" color="primary" label="Current" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Last used {state.kind === 'authenticated' ? formatDateTime(session.lastUsedAt, state.user.timeZone) : ''}
                    {' · '}expires {state.kind === 'authenticated' ? formatDateTime(session.expiresAt, state.user.timeZone) : ''}
                  </Typography>
                </Box>
                <Button color="error" disabled={busyId !== ''} onClick={() => void revoke(session)}>
                  {busyId === session.id ? 'Revoking…' : 'Revoke'}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function ProfileEditor() {
  const { state, updateProfile } = useAuth()
  const user = state.kind === 'authenticated' ? state.user : null
  const [timeZone, setTimeZone] = useState(user?.timeZone ?? 'UTC')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) setTimeZone(user.timeZone)
  }, [user])

  if (!user) return null

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setMessage('')
    setError('')
    if (!validTimeZone(timeZone)) {
      setError('Enter a supported IANA time zone, such as America/Vancouver.')
      return
    }
    setSaving(true)
    try {
      await updateProfile({ timeZone, version: user.version })
      setMessage('Time zone saved.')
    } catch (failure) {
      setError(problemMessage(failure, 'Could not save your time zone. Reload and try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box component="form" onSubmit={(event) => void save(event)} sx={{ pt: 2 }}>
      <Typography component="h2" variant="h6">Profile</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Times are displayed in this IANA time zone on every device.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
        <TextField
          label="Time zone"
          value={timeZone}
          onChange={(event) => setTimeZone(event.target.value)}
          error={Boolean(error)}
          helperText={error || `Browser suggestion: ${browserTimeZone() ?? 'unavailable'}`}
          fullWidth
          inputProps={{ autoComplete: 'off' }}
        />
        <Button type="submit" variant="contained" disabled={saving} sx={{ minWidth: 120, mt: { sm: 1 } }}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Stack>
      {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
    </Box>
  )
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { state, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [timeZone, setTimeZone] = useState(() => browserTimeZone() ?? 'UTC')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const registering = mode === 'register'

  if (state.kind === 'restoring') return <CenteredProgress label="Checking your session…" />
  if (state.kind === 'authenticated') return <Navigate to="/app" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (registering) await register({ email, password, timeZone })
      else await login({ email, password })
      const destination = (location.state as { from?: string } | null)?.from ?? '/app'
      navigate(destination, { replace: true })
    } catch (failure) {
      setError(problemMessage(failure, registering ? 'Could not create your account.' : 'Email or password is incorrect.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container component="main" maxWidth="sm" sx={{ py: { xs: 6, md: 9 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 } }}>
        <Stack component="form" spacing={3} onSubmit={submit}>
          <Box>
            <LockOutlinedIcon color="primary" />
            <Typography component="h1" variant="h4">{registering ? 'Create your workspace' : 'Welcome back'}</Typography>
            <Typography color="text.secondary">{registering ? 'Use at least 12 characters for your password.' : 'Sign in to your private ApplyFlow workspace.'}</Typography>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <TextField label="Password" type="password" autoComplete={registering ? 'new-password' : 'current-password'} required inputProps={registering ? { minLength: 12, maxLength: 128 } : { maxLength: 128 }} value={password} onChange={(event) => setPassword(event.target.value)} />
          {registering && (
            <TextField
              label="Time zone"
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              required
              helperText="Suggested from this browser; you can change it now or from your profile."
            />
          )}
          <Button type="submit" variant="contained" size="large" disabled={submitting}>
            {submitting ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
          </Button>
          <Typography variant="body2">
            {registering ? 'Already registered? ' : 'Need an account? '}
            <MuiLink component={Link} to={registering ? '/sign-in' : '/register'}>{registering ? 'Sign in' : 'Create one'}</MuiLink>
          </Typography>
        </Stack>
      </Paper>
    </Container>
  )
}

function CenteredProgress({ label }: { label: string }) {
  return <Stack alignItems="center" spacing={2} sx={{ py: 12 }} role="status"><CircularProgress /><Typography>{label}</Typography></Stack>
}
