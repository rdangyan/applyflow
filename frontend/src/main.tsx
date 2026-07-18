import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'
import { OpenAPI } from './generated'
import { AuthProvider } from './auth/AuthContext'
import App from './App'

OpenAPI.BASE = import.meta.env.VITE_API_BASE_URL ?? ''
OpenAPI.WITH_CREDENTIALS = true

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1d4ed8', dark: '#172554' },
    background: { default: '#f8fafc' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 750, letterSpacing: '-0.035em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
