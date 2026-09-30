import { createCandidate } from '../shared/candidate';
import type { Candidate, Identify } from '../shared/candidate';
import { frame, text, visible } from '../shared/dom';

export const tag = 'ion-toolbar';
export const selector = 'ion-toolbar.ios-theme-tab-accessory';
export const shadowSelector = 'ion-button, ion-label, ion-progress-bar, img';
export const tracksMotion = true;

const playSelector = 'ion-button[data-tab-accessory="play"], ion-button[slot="end"]';

const parseProgress = (element: HTMLElement): number | undefined => {
  const bar = element.querySelector<HTMLElement>('ion-progress-bar, [data-tab-accessory="progress"]');
  if (bar) {
    const attr = bar.getAttribute('value') ?? (bar as HTMLElement & { value?: number }).value;
    const numeric = typeof attr === 'number' ? attr : parseFloat(String(attr ?? ''));
    if (Number.isFinite(numeric)) return numeric;
  }
  const css = parseFloat(getComputedStyle(element).getPropertyValue('--progress'));
  return Number.isFinite(css) ? css : undefined;
};

const progressColor = (element: HTMLElement): string | undefined => {
  const bar = element.querySelector<HTMLElement>('ion-progress-bar, [data-tab-accessory="progress"]');
  if (!bar) return;
  const style = getComputedStyle(bar);
  const value = style.getPropertyValue('--progress-background').trim() || style.color;
  return value || undefined;
};

export const read = (element: HTMLElement, id: Identify): Candidate | undefined => {
  if (!element.classList.contains('ios-theme-tab-accessory')) return;
  if (element.closest('ion-content, ion-modal, ion-popover, ion-menu')) return;
  const play = element.querySelector<HTMLElement>(playSelector);
  if (!play || !visible(play)) return;

  const candidate = createCandidate(element, tag, id);
  const iconName = play.querySelector('ion-icon')?.getAttribute('name') ?? '';
  const selected = /pause/i.test(iconName);
  const label = play.getAttribute('aria-label')?.trim() || text(play) || (selected ? 'Pause' : 'Play');
  const playId = id(play);
  candidate.control.items.push({
    id: playId,
    ...frame(play.getBoundingClientRect(), element.getBoundingClientRect()),
    label,
    accessibilityLabel: play.getAttribute('aria-label') ?? label,
    disabled: false,
    selected,
    fontSize: 17,
    fontWeight: 400,
    color: 'currentColor',
  });
  candidate.actions.set(playId, play);
  candidate.actions.set(candidate.control.id, element);

  const title =
    element.querySelector('[data-tab-accessory="title"]')?.textContent?.trim() ||
    element.querySelector('ion-label h2')?.textContent?.trim() ||
    text(element.querySelector('ion-label') ?? element);
  const subtitle =
    element.querySelector('[data-tab-accessory="subtitle"]')?.textContent?.trim() ||
    element.querySelector('ion-label p')?.textContent?.trim() ||
    undefined;
  const artwork =
    (element.querySelector('[data-tab-accessory="artwork"]') as HTMLImageElement | null)?.currentSrc ||
    (element.querySelector('[data-tab-accessory="artwork"]') as HTMLImageElement | null)?.src ||
    (element.querySelector('ion-thumbnail img, img') as HTMLImageElement | null)?.currentSrc ||
    (element.querySelector('ion-thumbnail img, img') as HTMLImageElement | null)?.src ||
    undefined;

  if (title) candidate.control.title = title;
  if (subtitle) candidate.control.subtitle = subtitle;
  if (artwork) candidate.control.artworkUrl = artwork;
  const progress = parseProgress(element);
  if (progress !== undefined) candidate.control.progress = progress;
  const color = progressColor(element);
  if (color) candidate.control.progressColor = color;
  return candidate;
};
