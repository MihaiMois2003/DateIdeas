import { randomUUID } from 'node:crypto';

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/**
 * Salvează în Storage pozele importate pentru idei, în același folder
 * ca upload-urile din telefon, și întoarce un URL de descărcare cu token
 * (același tip de URL pe care îl dă getDownloadURL în aplicație).
 */
export class IdeaImageStore {
  #bucket;

  constructor(bucket) {
    this.#bucket = bucket;
  }

  async save(coupleId, { buffer, contentType }, name) {
    const type = contentType.split(';')[0].trim().toLowerCase();
    const path = `coupleUploads/${coupleId}/ideas/${Date.now()}-${name}.${EXTENSIONS[type] || 'jpg'}`;
    const token = randomUUID();
    await this.#bucket.file(path).save(buffer, {
      resumable: false,
      contentType: type,
      metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
    });
    return { url: this.#downloadUrl(path, token), path };
  }

  #downloadUrl(path, token) {
    const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
    const origin = emulator ? `http://${emulator.replace(/^https?:\/\//, '')}` : 'https://firebasestorage.googleapis.com';
    return `${origin}/v0/b/${this.#bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  }
}
