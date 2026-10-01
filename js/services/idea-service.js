import { DomainError } from '../core/errors.js';

export const PRESET_CATEGORIES = Object.freeze([
  'Romantic', 'Aventură', 'Acasă', 'Mâncare', 'În natură', 'Cultură', 'Buget mic', 'Ceva nou',
]);

/** Câmpurile pozei unei idei; ideile vechi au doar imageUrl și imagePath. */
const NO_IMAGE = Object.freeze({ imageUrl: null, imagePath: null, imageSource: null, imagePlaceId: null, imageCredit: null });

export class IdeaService {
  #ideas;
  #entries;
  #media;
  #images;

  constructor({ ideaRepository, entryRepository, mediaService, imageSuggestionService }) {
    this.#ideas = ideaRepository;
    this.#entries = entryRepository;
    this.#media = mediaService;
    this.#images = imageSuggestionService;
  }

  /** Categoriile predefinite plus cele create de voi (derivate din ideile existente). */
  categoriesFrom(ideas) {
    const all = new Set(PRESET_CATEGORIES);
    ideas.forEach((idea) => idea.category && all.add(idea.category));
    return [...all];
  }

  /**
   * `image` e alegerea din formular: { file } din telefon, { suggestion } aleasă de voi,
   * { suggestion, auto: true } pusă automat, sau null.
   */
  async create({ title, description, category, image }, context) {
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) throw new DomainError('Dă-i ideii un titlu.');
    if (cleanTitle.length > 80) throw new DomainError('Titlul poate avea cel mult 80 de caractere.');
    const cleanCategory = String(category || '').trim().slice(0, 24) || 'Ceva nou';

    const imageFields = await this.#imageFields(image, context.coupleId);
    try {
      return await this.#ideas.create({
        coupleId: context.coupleId,
        members: context.members,
        authorId: context.uid,
        title: cleanTitle,
        description: String(description || '').trim().slice(0, 1000),
        category: cleanCategory,
        ...imageFields,
      });
    } catch (error) {
      await this.#media.remove(imageFields.imagePath);
      throw error;
    }
  }

  /** Înlocuiește poza unei idei; poza veche din Storage se șterge doar după ce salvarea a reușit. */
  async changeImage(idea, image, context) {
    if (!image) throw new DomainError('Alege o poză din telefon sau din sugestii.');
    const imageFields = await this.#imageFields(image, context.coupleId);
    try {
      await this.#ideas.setImage(idea.id, imageFields);
    } catch (error) {
      await this.#media.remove(imageFields.imagePath);
      throw error;
    }
    if (idea.imagePath && idea.imagePath !== imageFields.imagePath) await this.#media.remove(idea.imagePath);
  }

  async #imageFields(image, coupleId) {
    if (image?.file) {
      const uploaded = await this.#media.upload(image.file, `coupleUploads/${coupleId}/ideas`);
      return { ...NO_IMAGE, imageUrl: uploaded.url, imagePath: uploaded.path, imageSource: 'upload' };
    }

    const suggestion = image?.suggestion;
    if (suggestion?.source === 'places') {
      // Termenii Google nu permit stocarea pozei: păstrăm doar locul și creditul.
      return { ...NO_IMAGE, imageSource: 'places', imagePlaceId: suggestion.id, imageCredit: IdeaService.#credit(suggestion.credit) };
    }
    if (suggestion?.source === 'pixabay') {
      try {
        const imported = await this.#images.importPixabay(suggestion.id, coupleId);
        return { ...NO_IMAGE, imageUrl: imported.url, imagePath: imported.path, imageSource: 'pixabay', imageCredit: IdeaService.#credit(imported.credit) };
      } catch (error) {
        // O poză pusă automat nu merită să blocheze ideea: rămâne fundalul cu model.
        if (image.auto) {
          console.warn('[ideas] import automat eșuat', error);
          return NO_IMAGE;
        }
        throw error;
      }
    }
    return NO_IMAGE;
  }

  static #credit(credit) {
    if (!credit?.name) return null;
    return { name: String(credit.name).slice(0, 120), url: /^https:\/\//i.test(credit.url || '') ? credit.url : null };
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
