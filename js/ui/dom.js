const PROPERTIES = new Set(['value', 'checked', 'disabled', 'selected', 'multiple', 'hidden']);

/**
 * Creează elemente DOM. Textul e mereu inserat ca text (nu HTML),
 * deci ce scrieți voi în aplicație nu poate injecta cod.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, val] of Object.entries(value)) el.style.setProperty(prop.startsWith('--') ? prop : kebab(prop), val);
    }
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (PROPERTIES.has(key)) el[key] = value;
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const child of [children].flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function replace(el, ...children) {
  el.replaceChildren();
  return append(el, children);
}

/** Rulează o acțiune asincronă pe un buton, cu stare de încărcare. */
export async function withBusy(button, task) {
  if (button.disabled) return undefined;
  button.disabled = true;
  button.classList.add('is-busy');
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.classList.remove('is-busy');
  }
}

function kebab(prop) {
  return prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}
