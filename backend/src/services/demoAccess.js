const retiredDemoEmail = 'demo@vetcare.com';
const normalizeEmail = value => String(value || '').trim().toLowerCase();

// Block the former shared account and every user linked to its seeded clinic.
// The records stay intact; a published credential must no longer grant access.
export function isRetiredDemoAccount({ email, clinica_email } = {}) {
  return normalizeEmail(email) === retiredDemoEmail || normalizeEmail(clinica_email) === retiredDemoEmail;
}
