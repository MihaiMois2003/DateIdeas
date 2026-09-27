import { h, replace, withBusy } from '../dom.js';
import { icon } from '../icons.js';
import { Sheet } from '../components/sheet.js';
import { PhotoPicker } from '../components/bits.js';
import { toUserMessage } from '../../core/errors.js';

/** Deschide formularul „Idee nouă”. */
export function openIdeaForm(ctx) {
  const { ideaService, hub, session, toaster } = ctx;
  let category = 'Romantic';

  const title = h('input', { class: 'field__input', name: 'title', maxlength: 80, placeholder: 'ex. Cafea și vinil în Cluj', required: true });
  const description = h('textarea', { class: 'field__input field__input--area', name: 'description', rows: 3, maxlength: 1000, placeholder: 'Unde, când, ce ne trebuie…' });
  const picker = new PhotoPicker({ label: 'Poză de inspirație' });
  const chips = h('div', { class: 'chips chips--wrap', role: 'radiogroup', 'aria-label': 'Categorie' });
  const custom = h('input', { class: 'field__input field__input--small', maxlength: 24, placeholder: 'Categorie nouă', 'aria-label': 'Categorie nouă' });

  const renderChips = () => {
    const categories = ideaService.categoriesFrom(hub.ideas);
    if (!categories.includes(category)) categories.push(category);
    replace(
      chips,
      categories.map((name) =>
        h('button', {
          class: `chip ${name === category ? 'is-active' : ''}`,
          type: 'button',
          role: 'radio',
          'aria-checked': String(name === category),
          onclick: () => {
            category = name;
            renderChips();
          },
        }, name),
      ),
    );
  };
  renderChips();

  const addCustom = () => {
    const value = custom.value.trim();
    if (!value) return;
    category = value.charAt(0).toUpperCase() + value.slice(1);
    custom.value = '';
    renderChips();
  };
  custom.addEventListener('keydown', (event) => event.key === 'Enter' && (event.preventDefault(), addCustom()));

  const save = h('button', { class: 'button button--primary button--wide', type: 'submit' }, 'Adaugă ideea');

  const form = h(
    'form',
    {
      class: 'stack',
      onsubmit: (event) => {
        event.preventDefault();
        if (custom.value.trim()) addCustom();
        withBusy(save, async () => {
          try {
            await ideaService.create(
              { title: title.value, description: description.value, category, file: picker.files[0] },
              session.coupleContext,
            );
            toaster.show('Ideea e pe listă.', { tone: 'rose' });
            sheet.close();
          } catch (error) {
            toaster.error(toUserMessage(error));
          }
        });
      },
    },
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Ce facem?'), title),
    h('label', { class: 'field' }, h('span', { class: 'field__label' }, 'Detalii'), description),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Categorie'), chips, h('div', { class: 'inline-add' }, custom, h('button', { class: 'icon-button icon-button--soft', type: 'button', 'aria-label': 'Adaugă categoria', onclick: addCustom }, icon('plus')))),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, 'Inspirație'), picker.el),
    save,
  );

  const sheet = Sheet.open({ title: 'Idee nouă', content: form, onClose: () => picker.dispose() });
  return sheet;
}
