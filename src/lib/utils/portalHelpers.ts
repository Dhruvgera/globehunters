export function isPortalSuccess(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const parsed = payload as { success?: unknown; status?: unknown; errors?: unknown; error?: unknown };

  if (typeof parsed.success !== 'undefined') {
    if (parsed.success === true || parsed.success === 1 || parsed.success === '1') return true;
    if (parsed.success === false || parsed.success === 0 || parsed.success === '0') return false;
  }

  if (typeof parsed.status === 'string' && parsed.status.toLowerCase() === 'error') return false;
  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) return false;
  if (Array.isArray(parsed.error) && parsed.error.length > 0) return false;

  return true;
}
