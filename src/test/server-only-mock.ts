// Mock for `server-only` package in test environment.
// The real package throws when imported outside a Server Component.
// Tests need to import server modules without this restriction.
export {}
