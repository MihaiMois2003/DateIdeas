/** Eroare cu mesaj scris pentru utilizator (validări, reguli de business). */
export class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Transformă orice eroare într-un mesaj potrivit pentru interfață. */
export function toUserMessage(error, fallback = 'Ceva n-a mers. Verifică conexiunea și încearcă din nou.') {
  if (error instanceof DomainError) return error.message;
  const code = error?.code || '';
  if (code.includes('permission-denied')) return 'Nu ai acces la asta. Reîncarcă pagina și încearcă din nou.';
  if (code.includes('unavailable') || code.includes('network')) return 'Nu există conexiune la internet momentan.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Autentificarea a fost închisă înainte de final.';
  console.error(error);
  return fallback;
}
