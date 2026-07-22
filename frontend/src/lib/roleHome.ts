// Where each role should land after login, and the label for its console link.
// Passengers stay on the public site ('/'); everyone else has a dedicated shell.
const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/admin',
  COMPANY_ADMIN: '/dashboard/operator',
  COMPANY_MANAGER: '/dashboard/operator',
  FLEET_MANAGER: '/dashboard/operator',
  FINANCE_OFFICER: '/dashboard/finance',
  BOOKING_AGENT: '/agent',
  CALL_CENTER_AGENT: '/agent',
  DRIVER: '/driver',
};

export function roleHome(role?: string | null): string {
  return (role && ROLE_HOME[role]) || '/';
}

// True for any staff/admin role that has a back-office console (not a passenger).
export function hasConsole(role?: string | null): boolean {
  return !!role && role !== 'PASSENGER' && role in ROLE_HOME;
}
