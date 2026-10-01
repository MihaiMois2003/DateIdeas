import { h } from '../dom.js';
import { icon } from '../icons.js';
import { avatar } from './bits.js';
import { formatShort } from '../format.js';

/** Nuanța cotorului biletului, stabilă pentru fiecare categorie. */
export function categoryHue(category = '') {
  let hash = 0;
  for (const char of category) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ['rose', 'gold', 'plum', 'sage', 'peach'][hash % 5];
}

/**
 * Poza unei idei sau fundalul cu model. Pentru locurile din Google (imageSource 'places')
 * URL-ul se cere la afișare; până vine, rămâne modelul.
 */
export function ideaImage(idea, images, { lazy = true } = {}) {
  const pattern = () => h('span', { class: 'ticket__pattern', 'aria-hidden': 'true' });
  const image = (src) => h('img', { src, alt: '', loading: lazy ? 'lazy' : null, referrerpolicy: 'no-referrer' });

  if (idea.imageUrl) return image(idea.imageUrl);
  if (idea.imageSource !== 'places' || !idea.imagePlaceId || !images) return pattern();

  const cached = images.cachedPlacePhoto(idea.imagePlaceId);
  if (cached) return image(cached);

  const placeholder = pattern();
  images.placePhoto(idea.imagePlaceId).then((url) => {
    if (!url) return;
    const img = h('img', { src: url, alt: '', referrerpolicy: 'no-referrer' });
    img.addEventListener('load', () => placeholder.replaceWith(img), { once: true });
  });
  return placeholder;
}

/**
 * Biletul unei idei de date: imagine, titlu, cine a propus-o,
 * iar pe cotor categoria și inimile.
 */
export function ticketCard(idea, { session, images, onOpen, onLike }) {
  const liked = (idea.likes || []).includes(session.uid);
  const likers = (idea.likes || []).map((uid) => session.personOf(uid)).filter(Boolean);
  const done = idea.status === 'done';

  return h(
    'article',
    { class: `ticket ticket--${categoryHue(idea.category)} ${done ? 'is-done' : ''}` },
    h(
      'button',
      { class: 'ticket__main', type: 'button', onclick: onOpen, 'aria-label': `Deschide ${idea.title}` },
      h(
        'div',
        { class: 'ticket__image' },
        ideaImage(idea, images),
        done && h('span', { class: 'stamp' }, 'Făcut', h('small', {}, formatShort(idea.doneDate))),
      ),
      h(
        'div',
        { class: 'ticket__body' },
        h('h3', { class: 'ticket__title' }, idea.title),
        h('p', { class: 'ticket__by' }, avatar(session.personOf(idea.authorId), { size: 'xs' }), `propusă de ${session.nameOf(idea.authorId)}`),
      ),
    ),
    h(
      'footer',
      { class: 'ticket__stub' },
      h('span', { class: 'ticket__category' }, idea.category),
      h(
        'button',
        {
          class: `like ${liked ? 'is-liked' : ''}`,
          type: 'button',
          'aria-pressed': String(liked),
          'aria-label': liked ? 'Nu mai îmi place' : 'Îmi place',
          onclick: onLike,
        },
        likers.length > 0 && h('span', { class: 'like__faces' }, likers.map((p) => avatar(p, { size: 'xs' }))),
        likers.length > 0 && h('span', { class: 'like__count' }, String(likers.length)),
        icon('heart', { size: 20, filled: liked }),
      ),
    ),
  );
}

const TILTS = [-2.4, 1.6, -1.1, 2.2, -0.6, 1.2];

/** O poză în stil polaroid, cu bandă adezivă. */
export function polaroid(photo, index, { caption = '', onOpen } = {}) {
  const interactive = typeof onOpen === 'function';
  return h(
    interactive ? 'button' : 'span',
    {
      class: 'polaroid',
      type: interactive ? 'button' : null,
      style: { '--tilt': `${TILTS[index % TILTS.length]}deg` },
      onclick: interactive ? onOpen : null,
      'aria-label': interactive ? 'Mărește poza' : null,
    },
    h('span', { class: 'polaroid__tape', 'aria-hidden': 'true' }),
    h('img', { src: photo.url, alt: caption || '', loading: 'lazy' }),
    caption && h('span', { class: 'polaroid__caption' }, caption),
  );
}

export function heartCount(count) {
  return h('span', { class: 'heart-count' }, icon('heart', { size: 14, filled: true }), String(count));
}
