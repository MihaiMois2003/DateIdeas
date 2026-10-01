import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Verificări comune pentru callables: utilizator autentificat, membru al unui cuplu,
 * și input validat. Mesajele sunt în română, pentru că pot ajunge în interfață.
 */
export function requireUid(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Intră în cont ca să continui.');
  return uid;
}

/** Utilizatorul trebuie să fie în câmpul members al cel puțin unui cuplu. */
export async function requireAnyCouple(db, uid) {
  const snapshot = await db.collection('couples').where('members', 'array-contains', uid).limit(1).get();
  if (snapshot.empty) throw new HttpsError('permission-denied', 'Funcția e disponibilă doar pentru cupluri.');
}

/** Utilizatorul trebuie să fie membru exact al cuplului cerut. */
export async function requireCoupleMember(db, uid, coupleId) {
  const couple = await db.collection('couples').doc(coupleId).get();
  if (!couple.exists || !(couple.get('members') || []).includes(uid)) {
    throw new HttpsError('permission-denied', 'Nu faci parte din cuplul ăsta.');
  }
}

export function queryParam(value) {
  const query = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (query.length < 2 || query.length > 80) throw new HttpsError('invalid-argument', 'Căutarea trebuie să aibă între 2 și 80 de caractere.');
  return query;
}

/** Coordonatele sunt opționale; dacă lipsesc sau sunt invalide, căutăm fără ele. */
export function locationParams(lat, lng) {
  const valid = typeof lat === 'number' && typeof lng === 'number'
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return valid ? { lat: round(lat), lng: round(lng) } : {};
}

export function idParam(value, pattern, label) {
  const id = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
  if (!pattern.test(id)) throw new HttpsError('invalid-argument', `${label} nu e valid.`);
  return id;
}

/** Două zecimale (~1 km): suficient pentru „în apropiere” și cache-ul are mai multe potriviri. */
function round(value) {
  return Math.round(value * 100) / 100;
}
