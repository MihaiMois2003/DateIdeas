/**
 * Cereri HTTP spre API-uri externe, mereu cu timeout.
 * Erorile poartă sursa și statusul, ca să apară clar în loguri.
 */
export class ExternalError extends Error {
  constructor(source, message, status = null) {
    super(`[${source}] ${message}`);
    this.name = 'ExternalError';
    this.source = source;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 5000;

export async function fetchJson(source, url, { method = 'GET', headers = {}, body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const response = await request(source, url, {
    method,
    headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    timeoutMs,
  });
  try {
    return await response.json();
  } catch {
    throw new ExternalError(source, 'răspuns JSON invalid', response.status);
  }
}

/** Descarcă un fișier binar, cu limită de mărime (verificată și după descărcare). */
export async function fetchBuffer(source, url, { timeoutMs = 15000, maxBytes = 10 * 1024 * 1024 } = {}) {
  const response = await request(source, url, { timeoutMs });
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new ExternalError(source, `fișier prea mare (${declared} B)`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > maxBytes) throw new ExternalError(source, `fișier prea mare (${buffer.length} B)`);
  return { buffer, contentType: response.headers.get('content-type') || '' };
}

async function request(source, url, { timeoutMs, ...init }) {
  let response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? `timeout după ${timeoutMs} ms` : error?.message || 'rețea indisponibilă';
    throw new ExternalError(source, reason);
  }
  if (!response.ok) {
    // Textul erorii poate conține URL-ul cererii; nu-l logăm, ca să nu scape cheia.
    throw new ExternalError(source, `HTTP ${response.status}`, response.status);
  }
  return response;
}
