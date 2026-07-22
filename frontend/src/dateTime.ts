export function validTimeZone(value: string | undefined): value is string {
  if (!value) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format()
    return true
  } catch {
    return false
  }
}

export function browserTimeZone(): string | undefined {
  const suggestion = Intl.DateTimeFormat().resolvedOptions().timeZone
  return validTimeZone(suggestion) ? suggestion : undefined
}

export function formatDateTime(instant: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(instant))
}
