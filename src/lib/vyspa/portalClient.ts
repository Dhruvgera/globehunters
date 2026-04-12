import { VYSPA_PORTAL_CONFIG } from '@/config/vyspaPortal';

export function buildPortalFormData(method: string, params: unknown): URLSearchParams {
  const { credentials } = VYSPA_PORTAL_CONFIG;
  const formData = new URLSearchParams();
  formData.append('username', credentials.username);
  formData.append('password', credentials.password);
  formData.append('token', credentials.token);
  formData.append('method', method);
  formData.append('params', JSON.stringify(params));
  return formData;
}

export async function callPortalMethod(
  method: string,
  params: unknown,
  timeoutMs?: number
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { apiUrl, timeout } = VYSPA_PORTAL_CONFIG;
  const effectiveTimeout = timeoutMs ?? timeout;

  const formData = buildPortalFormData(method, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawText = await response.text();

    let data: unknown;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function getFolderDetails(folderNumber: string | number, timeoutMs?: number): Promise<unknown> {
  const result = await callPortalMethod('getFolderDetails', [{ fold_no: String(folderNumber) }], timeoutMs);
  return result.data;
}
