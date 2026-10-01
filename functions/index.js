/**
 * Cloud Functions pentru DateIdeas: sugestii de poze pentru idei.
 * Toate sunt callable, cer cont și apartenența la un cuplu; cheile API stau doar aici, ca secrete.
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions, logger } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

import { PlacesClient } from './src/places-client.js';
import { PixabayClient } from './src/pixabay-client.js';
import { IdeaImageStore } from './src/idea-image-store.js';
import { TtlCache } from './src/ttl-cache.js';
import { requireUid, requireAnyCouple, requireCoupleMember, queryParam, locationParams, idParam } from './src/guards.js';

initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5, memory: '256MiB', timeoutSeconds: 30 });

const PLACES_API_KEY = defineSecret('PLACES_API_KEY');
const PIXABAY_API_KEY = defineSecret('PIXABAY_API_KEY');

const MAX_SUGGESTIONS = 9;
const searchCache = new TtlCache({ ttlMs: 5 * 60 * 1000 });
const placePhotoCache = new TtlCache({ ttlMs: 10 * 60 * 1000 });

const PIXABAY_ID = /^\d{1,12}$/;
const COUPLE_ID = /^[A-Za-z0-9_-]{1,200}$/;
const PLACE_ID = /^[A-Za-z0-9_-]{8,400}$/;

/** searchImages({ query, lat?, lng? }) → { suggestions: [...] }, întâi Places, apoi Pixabay. */
export const searchImages = onCall({ secrets: [PLACES_API_KEY, PIXABAY_API_KEY] }, async (request) => {
  const uid = requireUid(request);
  const query = queryParam(request.data?.query);
  const location = locationParams(request.data?.lat, request.data?.lng);
  await requireAnyCouple(getFirestore(), uid);

  const key = JSON.stringify([query.toLowerCase(), location.lat ?? null, location.lng ?? null]);
  const cached = searchCache.get(key);
  if (cached) return { suggestions: cached };

  const [places, pixabay] = await Promise.allSettled([
    new PlacesClient(PLACES_API_KEY.value()).search(query, location),
    new PixabayClient(PIXABAY_API_KEY.value()).search(query),
  ]);

  const failed = [places, pixabay].filter((r) => r.status === 'rejected');
  failed.forEach((r) => logger.warn('searchImages: sursă indisponibilă', { error: r.reason?.message }));
  if (failed.length === 2) throw new HttpsError('unavailable', 'Nu am putut căuta poze acum.');

  const suggestions = [places, pixabay]
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .slice(0, MAX_SUGGESTIONS);

  // Un rezultat parțial nu intră în cache, ca sursa căzută să fie reîncercată data viitoare.
  if (!failed.length) searchCache.set(key, suggestions);
  return { suggestions };
});

/** importPixabayImage({ imageId, coupleId }) → { url, path, credit }, imaginea salvată în Storage. */
export const importPixabayImage = onCall({ secrets: [PIXABAY_API_KEY], timeoutSeconds: 60 }, async (request) => {
  const uid = requireUid(request);
  const imageId = idParam(request.data?.imageId, PIXABAY_ID, 'Id-ul pozei');
  const coupleId = idParam(request.data?.coupleId, COUPLE_ID, 'Cuplul');
  await requireCoupleMember(getFirestore(), uid, coupleId);

  let image;
  try {
    image = await new PixabayClient(PIXABAY_API_KEY.value()).download(imageId);
  } catch (error) {
    logger.warn('importPixabayImage: descărcare eșuată', { imageId, error: error.message });
    throw new HttpsError('unavailable', 'Nu am putut aduce poza de pe Pixabay. Încearcă din nou.');
  }
  if (!image) throw new HttpsError('not-found', 'Poza nu mai există pe Pixabay. Alege alta.');

  const stored = await new IdeaImageStore(getStorage().bucket()).save(coupleId, image, `pixabay-${imageId}`);
  return { ...stored, credit: image.credit };
});

/** resolvePlacePhoto({ placeId }) → { url, credit } proaspăt; pozele Places nu se stochează. */
export const resolvePlacePhoto = onCall({ secrets: [PLACES_API_KEY] }, async (request) => {
  const uid = requireUid(request);
  const placeId = idParam(request.data?.placeId, PLACE_ID, 'Locul');
  await requireAnyCouple(getFirestore(), uid);

  const cached = placePhotoCache.get(placeId);
  if (cached) return cached;

  let photo;
  try {
    photo = await new PlacesClient(PLACES_API_KEY.value()).firstPhoto(placeId);
  } catch (error) {
    logger.warn('resolvePlacePhoto: eșuat', { placeId, error: error.message });
    throw new HttpsError(error.status === 404 ? 'not-found' : 'unavailable', 'Nu am putut încărca poza locului.');
  }
  if (!photo) throw new HttpsError('not-found', 'Locul nu mai are poze.');
  return placePhotoCache.set(placeId, photo);
});
