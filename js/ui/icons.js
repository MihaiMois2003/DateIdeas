const NS = 'http://www.w3.org/2000/svg';

const PATHS = {
  heart: ['M12 20.2s-7.6-4.6-7.6-10.4A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.6 2.4c0 5.8-7.6 10.4-7.6 10.4z'],
  plus: ['M12 5v14', 'M5 12h14'],
  chat: ['M4.5 6.5c0-1.1.9-2 2-2h11c1.1 0 2 .9 2 2v7.5c0 1.1-.9 2-2 2h-6.2L7 19.5V16h-.5c-1.1 0-2-.9-2-2z'],
  close: ['M6.5 6.5l11 11', 'M17.5 6.5l-11 11'],
  camera: ['M4 8.5h3.2l1.6-2.2h6.4l1.6 2.2H20V18H4z', 'M12 15.6a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z'],
  check: ['M5 12.6l4.4 4.4L19 7.4'],
  ticket: ['M4 6.5h16v3.2a2.3 2.3 0 0 0 0 4.6v3.2H4v-3.2a2.3 2.3 0 0 0 0-4.6z', 'M14.5 7v2', 'M14.5 11v2', 'M14.5 15v2'],
  album: ['M6 3.8h11.5c.8 0 1.5.7 1.5 1.5v13.4c0 .8-.7 1.5-1.5 1.5H6z', 'M6 3.8v16.4', 'M9.5 9.2h6', 'M9.5 12.4h4'],
  us: ['M8.6 11a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z', 'M15.6 11a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8z', 'M3.4 19.4c.7-2.9 2.8-4.5 5.2-4.5s4.5 1.6 5.2 4.5', 'M12.4 15.6c.8-.5 1.9-.7 3.2-.7 2.4 0 4.5 1.6 5.2 4.5'],
  sparkle: ['M12 3.5l1.7 5.1 5.1 1.7-5.1 1.7L12 17.1l-1.7-5.1-5.1-1.7 5.1-1.7z', 'M18.5 16.5l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6z'],
  back: ['M14.5 5.5L8 12l6.5 6.5'],
  trash: ['M5 7h14', 'M10 7V4.8h4V7', 'M7 7l.9 12.2h8.2L17 7'],
  send: ['M4.5 11.8L19.5 5l-4.8 14.5-3-5.6z', 'M11.7 13.9l7.8-8.9'],
  logout: ['M14 4.5h3.5c.8 0 1.5.7 1.5 1.5v12c0 .8-.7 1.5-1.5 1.5H14', 'M9.5 16L5.5 12l4-4', 'M5.5 12H15'],
  calendar: ['M4.5 6.5h15v13h-15z', 'M4.5 10.5h15', 'M8.5 4v4', 'M15.5 4v4'],
  search: ['M11 17.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z', 'M20 20l-4.3-4.3'],
  undo: ['M9 7.5L5 11.5l4 4', 'M5 11.5h9.5a4.5 4.5 0 0 1 0 9H12'],
  image: ['M4.5 5.5h15v13h-15z', 'M4.5 15.5l4.2-4.2 3.3 3.3 2.2-2.2 5.3 5.1', 'M15.3 9.7a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z'],
  pen: ['M5 19l1-4.2L15.8 5a1.8 1.8 0 0 1 2.5 0l.7.7a1.8 1.8 0 0 1 0 2.5L9.2 18z', 'M13.8 7l3.2 3.2'],
};

export function icon(name, { size = 22, filled = false, label = null } = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', filled ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.6');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'icon');
  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  for (const d of PATHS[name] || []) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** Logo-ul Google, cu culorile oficiale. */
export function googleMark(size = 20) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('aria-hidden', 'true');
  const parts = [
    ['#FFC107', 'M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z'],
    ['#FF3D00', 'M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z'],
    ['#4CAF50', 'M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z'],
    ['#1976D2', 'M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z'],
  ];
  for (const [fill, d] of parts) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', fill);
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
