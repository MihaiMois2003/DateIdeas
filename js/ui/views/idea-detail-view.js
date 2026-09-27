import { View } from './view.js';
import { h, replace, withBusy } from '../dom.js';
import { icon } from '../icons.js';
import { avatar, emptyState, spinner, PhotoPicker } from '../components/bits.js';
import { polaroid, categoryHue } from '../components/cards.js';
import { Sheet, openLightbox, confirmAction } from '../components/sheet.js';
import { toUserMessage } from '../../core/errors.js';
import { formatLong, formatShort, toInputDate, fromInputDate } from '../format.js';
import { MAX_PHOTOS_PER_ENTRY } from '../../services/entry-service.js';

export class IdeaDetailView extends View {
  #id;
  #surprise;
  #entries = null;
  #header = h('div', { class: 'detail__header' });
  #memories = h('div', { class: 'memories' });

  constructor(ctx, { id, query }) {
    super(ctx);
    this.#id = id;
    this.#surprise = query?.has('surpriza');
  }

  render() {
    this.listen('ideas:changed', () => this.#paintHeader());
    this.track(
      this.ctx.entryService.watch(this.#id, (entries) => {
        this.#entries = entries;
        this.#paintMemories();
      }),
    );
    this.#paintHeader();
    this.#paintMemories();

    return h(
      'section',
      { class: 'page detail' },
      h('a', { class: 'back-link', href: '#/ideas' }, icon('back', { size: 20 }), 'Toate ideile'),
      this.#header,
      h('h2', { class: 'section-title section-title--script' }, 'Amintirile noastre'),
      this.#memories,
    );
  }

  get #idea() {
    return this.ctx.hub.idea(this.#id);
  }

  #paintHeader() {
    const { hub, session, ideaService, toaster } = this.ctx;
    const idea = this.#idea;

    if (!idea) {
      replace(
        this.#header,
        hub.loaded.ideas
          ? emptyState({ title: 'Biletul ăsta nu mai există', text: 'Poate a fost șters. Întoarce-te la listă.', action: h('a', { class: 'button button--primary', href: '#/ideas' }, 'Înapoi la idei') })
          : spinner(),
      );
      return;
    }

    const done = idea.status === 'done';
    const liked = (idea.likes || []).includes(session.uid);
    const likers = (idea.likes || []).map((uid) => session.nameOf(uid));

    const likeButton = h(
      'button',
      { class: `button button--ghost like-wide ${liked ? 'is-liked' : ''}`, type: 'button', 'aria-pressed': String(liked), onclick: () => ideaService.toggleLike(idea, session.uid).catch((e) => toaster.error(toUserMessage(e))) },
      icon('heart', { size: 20, filled: liked }),
      likers.length === 2 ? 'Vă place amândurora' : likers.length === 1 ? `Îi place lui ${likers[0]}` : 'Îmi place',
    );

    const doneButton = done
      ? h('button', { class: 'button button--ghost', type: 'button', onclick: (e) => withBusy(e.currentTarget, () => ideaService.reopen(idea).catch((err) => toaster.error(toUserMessage(err)))) }, icon('undo', { size: 20 }), 'Mută înapoi în idei')
      : h('button', { class: 'button button--primary', type: 'button', onclick: () => this.#openDoneSheet(idea) }, icon('check', { size: 20 }), 'Am făcut-o');

    const deleteButton = h('button', { class: 'icon-button icon-button--soft', type: 'button', 'aria-label': 'Șterge ideea', onclick: () => this.#delete(idea) }, icon('trash', { size: 20 }));

    replace(
      this.#header,
      this.#surprise && !done && h('p', { class: 'surprise-note' }, icon('sparkle', { size: 18 }), 'Biletul ales pentru voi. Când ieșiți?'),
      h(
        'div',
        { class: `detail__ticket ticket--${categoryHue(idea.category)}` },
        h(
          'div',
          { class: 'detail__image' },
          idea.imageUrl
            ? h('button', { class: 'detail__image-button', type: 'button', 'aria-label': 'Mărește poza', onclick: () => openLightbox(idea.imageUrl, idea.title) }, h('img', { src: idea.imageUrl, alt: '' }))
            : h('span', { class: 'ticket__pattern', 'aria-hidden': 'true' }),
          done && h('span', { class: 'stamp stamp--large' }, 'Făcut', h('small', {}, formatShort(idea.doneDate))),
        ),
        h(
          'div',
          { class: 'detail__text' },
          h('span', { class: 'ticket__category' }, idea.category),
          h('h1', { class: 'display display--detail' }, idea.title),
          h('p', { class: 'ticket__by' }, avatar(session.personOf(idea.authorId), { size: 'xs' }), `Propusă de ${session.nameOf(idea.authorId)}`),
          idea.description && h('p', { class: 'detail__description' }, idea.description),
          done && h('p', { class: 'detail__date' }, icon('calendar', { size: 18 }), `Ați ieșit pe ${formatLong(idea.doneDate)}`),
        ),
      ),
      h('div', { class: 'detail__actions' }, doneButton, likeButton, deleteButton),
    );
  }

  #paintMemories() {
    const { session } = this.ctx;
    if (this.#entries === null) {
      replace(this.#memories, spinner());
      return;
    }
    const people = [session.me, session.partner].filter(Boolean);
    replace(
      this.#memories,
      people.map((person) => this.#column(person, this.#entries.filter((e) => e.authorId === person.uid))),
    );
  }

  #column(person, entries) {
    const { session } = this.ctx;
    const mine = person.uid === session.uid;
    const name = session.nameOf(person.uid);

    return h(
      'div',
      { class: `memory-column ${mine ? 'is-mine' : ''}` },
      h('header', { class: 'memory-column__header' }, avatar(person, { size: 'sm' }), h('h3', {}, name)),
      entries.length
        ? entries.map((entry) => this.#entry(entry, mine))
        : h('p', { class: 'memory-column__empty' }, mine ? 'Cum a fost pentru tine? Pune o poză sau câteva rânduri.' : `${name} n-a adăugat încă nimic aici.`),
      mine && h('button', { class: 'button button--soft button--wide', type: 'button', onclick: () => this.#openEntrySheet() }, icon('camera', { size: 20 }), 'Adaugă amintirea ta'),
    );
  }

  #entry(entry, mine) {
    const photos = entry.photos || [];
    return h(
      'article',
      { class: 'memory' },
      photos.length > 0 && h('div', { class: `memory__photos memory__photos--${Math.min(photos.length, 3)}` }, photos.map((photo, i) => polaroid(photo, i, { onOpen: () => openLightbox(photo.url, entry.note) }))),
      entry.note && h('p', { class: 'memory__note' }, entry.note),
      h(
        'footer',
        { class: 'memory__meta' },
        h('time', {}, formatLong(entry.createdAt)),
        mine && h('button', { class: 'link-button link-button--small', type: 'button', onclick: () => this.#deleteEntry(entry) }, icon('trash', { size: 16 }), 'Șterge'),
      ),
    );
  }

  #openDoneSheet(idea) {
    const { ideaService, toaster } = this.ctx;
    const dateInput = h('input', { class: 'field__input', type: 'date', value: toInputDate(), max: toInputDate() });
    const save = h('button', { class: 'button button--primary button--wide', type: 'submit' }, 'Mută în jurnal');
    const form = h(
      'form',
      {
        class: 'stack',
        onsubmit: (event) => {
          event.preventDefault();
          withBusy(save, async () => {
            try {
              await ideaService.markDone(idea, fromInputDate(dateInput.value));
              sheet.close();
              toaster.show('Biletul e în jurnal. Acum puneți pozele.', { tone: 'rose' });
            } catch (error) {
              toaster.error(toUserMessage(error));
            }
          });
        },
      },
      h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Când ați ieșit?'), dateInput),
      save,
    );
    const sheet = Sheet.open({ title: idea.title, content: form, variant: 'sheet--compact' });
  }

  #openEntrySheet() {
    const { entryService, session, toaster } = this.ctx;
    const note = h('textarea', { class: 'field__input field__input--area field__input--script', rows: 5, maxlength: 2000, placeholder: 'Ce ți-a rămas în minte din seara asta…' });
    const picker = new PhotoPicker({ multiple: true, max: MAX_PHOTOS_PER_ENTRY, label: 'Adaugă poze' });
    const save = h('button', { class: 'button button--primary button--wide', type: 'submit' }, 'Salvează amintirea');

    const form = h(
      'form',
      {
        class: 'stack',
        onsubmit: (event) => {
          event.preventDefault();
          withBusy(save, async () => {
            const label = save.textContent;
            try {
              await entryService.add(this.#id, { note: note.value, files: picker.files }, session.coupleContext, (current, total) => {
                save.textContent = `Se încarcă poza ${current} din ${total}`;
              });
              sheet.close();
            } catch (error) {
              toaster.error(toUserMessage(error));
            } finally {
              save.textContent = label;
            }
          });
        },
      },
      h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Poze'), picker.el),
      h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Notița ta'), note),
      save,
    );
    const sheet = Sheet.open({ title: 'Amintirea ta', content: form, onClose: () => picker.dispose() });
  }

  async #deleteEntry(entry) {
    const ok = await confirmAction({ title: 'Ștergi amintirea?', message: 'Pozele și notița dispar pentru amândoi.', confirmLabel: 'Șterge' });
    if (!ok) return;
    this.ctx.entryService.remove(this.#id, entry).catch((error) => this.ctx.toaster.error(toUserMessage(error)));
  }

  async #delete(idea) {
    const ok = await confirmAction({
      title: 'Ștergi biletul?',
      message: `„${idea.title}” dispare împreună cu toate pozele și notițele voastre de aici.`,
      confirmLabel: 'Șterge definitiv',
    });
    if (!ok) return;
    try {
      this.ctx.router.navigate('/ideas');
      await this.ctx.ideaService.remove(idea);
      this.ctx.toaster.show('Biletul a fost șters.');
    } catch (error) {
      this.ctx.toaster.error(toUserMessage(error));
    }
  }
}
