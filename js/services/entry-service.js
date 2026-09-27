import { DomainError } from '../core/errors.js';

export const MAX_PHOTOS_PER_ENTRY = 8;

export class EntryService {
  #entries;
  #media;

  constructor({ entryRepository, mediaService }) {
    this.#entries = entryRepository;
    this.#media = mediaService;
  }

  watch(ideaId, callback) {
    return this.#entries.watchForIdea(ideaId, callback);
  }

  list(ideaId) {
    return this.#entries.list(ideaId);
  }

  async add(ideaId, { note, files = [] }, context, onProgress = () => {}) {
    const cleanNote = String(note || '').trim().slice(0, 2000);
    if (!cleanNote && !files.length) throw new DomainError('Scrie câteva rânduri sau adaugă cel puțin o poză.');
    if (files.length > MAX_PHOTOS_PER_ENTRY) throw new DomainError(`Poți adăuga cel mult ${MAX_PHOTOS_PER_ENTRY} poze odată.`);

    const photos = [];
    for (const [index, file] of files.entries()) {
      onProgress(index + 1, files.length);
      photos.push(await this.#media.upload(file, `coupleUploads/${context.coupleId}/memories/${ideaId}`));
    }
    return this.#entries.create(ideaId, { authorId: context.uid, note: cleanNote, photos });
  }

  async remove(ideaId, entry) {
    await Promise.all((entry.photos || []).map((p) => this.#media.remove(p.path)));
    await this.#entries.remove(ideaId, entry.id);
  }
}
