import { DomainError } from '../core/errors.js';

export const PRESET_CATEGORIES = Object.freeze([
  'Romantic', 'Aventură', 'Acasă', 'Mâncare', 'În natură', 'Cultură', 'Buget mic', 'Ceva nou',
]);

export class IdeaService {
  #ideas;
  #entries;
  #media;

  constructor({ ideaRepository, entryRepository, mediaService }) {
    this.#ideas = ideaRepository;
    this.#entries = entryRepository;
    this.#media = mediaService;
  }

  /** Categoriile predefinite plus cele create de voi (derivate din ideile existente). */
  categoriesFrom(ideas) {
    const all = new Set(PRESET_CATEGORIES);
    ideas.forEach((idea) => idea.category && all.add(idea.category));
    return [...all];
  }

  async create({ title, description, category, file }, context) {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) throw new DomainError('Dă-i ideii un titlu.');
    if (cleanTitle.length > 80) throw new DomainError('Titlul poate avea cel mult 80 de caractere.');
    const cleanCategory = String(category || '').trim().slice(0, 24) || 'Ceva nou';

    const image = file ? await this.#media.upload(file, `coupleUploads/${context.coupleId}/ideas`) : null;

    return this.#ideas.create({
      coupleId: context.coupleId,
      members: context.members,
      authorId: context.uid,
      title: cleanTitle,
      description: String(description || '').trim().slice(0, 1000),
      category: cleanCategory,
      imageUrl: image?.url ?? null,
      imagePath: image?.path ?? null,
    });
  }

  toggleLike(idea, uid) {
    return this.#ideas.setLiked(idea.id, uid, !(idea.likes || []).includes(uid));
  }

  markDone(idea, date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new DomainError('Alege data la care ați ieșit.');
    return this.#ideas.markDone(idea.id, date);
  }

  reopen(idea) {
    return this.#ideas.reopen(idea.id);
  }

  async remove(idea) {
    const entries = await this.#entries.list(idea.id);
    await Promise.all(entries.flatMap((entry) => (entry.photos || []).map((p) => this.#media.remove(p.path))));
    await Promise.all(entries.map((entry) => this.#entries.remove(idea.id, entry.id)));
    await this.#media.remove(idea.imagePath);
    await this.#ideas.remove(idea.id);
  }

  pickSurprise(ideas) {
    const pool = ideas.filter((idea) => idea.status !== 'done');
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
}
