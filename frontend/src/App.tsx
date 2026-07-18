import { useState, type FormEvent, type ReactNode } from 'react'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
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
  const { state } = useAuth()
  const location = useLocation()
  if (state.kind === 'restoring') return <CenteredProgress label="Restoring your workspace…" />
  if (state.kind === 'anonymous') return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />
  return children
}

function Workspace() {
  const { state } = useAuth()
  if (state.kind !== 'authenticated') return null
  return (
    <Container component="main" maxWidth="md" sx={{ py: 8 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={2}>
          <Typography component="h1" variant="h4">Your private workspace</Typography>
          <Typography color="text.secondary">Signed in as</Typography>
          <Typography sx={{ fontWeight: 700 }}>{state.user.email}</Typography>
          <Alert severity="info">Your identity is isolated and ready. Application tracking arrives in a later issue.</Alert>
        </Stack>
      </Paper>
    </Container>
  )
}

function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { state, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      if (registering) await register({ email, password })
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
