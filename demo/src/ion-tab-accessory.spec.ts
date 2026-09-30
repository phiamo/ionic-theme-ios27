import { afterEach, expect, test } from 'vitest';
import { readCandidate } from '../../src/native/components';

const size = () => ({ x: 16, y: 700, width: 358, height: 56, top: 700, left: 16, right: 374, bottom: 756 }) as DOMRect;

const mount = (playing = true) => {
  document.body.innerHTML = `
    <ion-toolbar class="ios ios-theme-tab-accessory">
      <img data-tab-accessory="artwork" src="https://example.test/cover.jpg" alt="" />
      <ion-label>
        <h2 data-tab-accessory="title">Mahamudra</h2>
        <p data-tab-accessory="subtitle">Lama Ole</p>
      </ion-label>
      <ion-button slot="end" data-tab-accessory="play">
        <ion-icon name="${playing ? 'pause' : 'play'}"></ion-icon>
      </ion-button>
      <ion-progress-bar value="0.4"></ion-progress-bar>
    </ion-toolbar>`;
  const toolbar = document.querySelector<HTMLElement>('ion-toolbar')!;
  const play = document.querySelector<HTMLElement>('ion-button')!;
  const icon = document.querySelector<HTMLElement>('ion-icon')!;
  const shadow = icon.attachShadow({ mode: 'open' });
  shadow.innerHTML = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
  for (const element of [toolbar, play, icon, ...Array.from(document.querySelectorAll<HTMLElement>('img, ion-label, ion-progress-bar'))]) {
    element.style.cssText = 'display: block; visibility: visible; opacity: 1';
    element.getBoundingClientRect = size;
  }
  return toolbar;
};

afterEach(() => document.body.replaceChildren());

test('projects marked toolbar title, progress and play state', () => {
  const candidate = readCandidate(mount(true), () => 'accessory');
  expect(candidate?.control.kind).toBe('ion-toolbar');
  expect(candidate?.control.title).toBe('Mahamudra');
  expect(candidate?.control.subtitle).toBe('Lama Ole');
  expect(candidate?.control.artworkUrl).toContain('cover.jpg');
  expect(candidate?.control.progress).toBe(0.4);
  expect(candidate?.control.items[0].selected).toBe(true);
  expect(candidate?.actions.get('accessory')).toBe(document.querySelector('ion-toolbar'));
});

test('projects play without a hydrated ion-icon svg', () => {
  const toolbar = mount(true);
  document.querySelector('ion-icon')?.shadowRoot?.replaceChildren();
  const candidate = readCandidate(toolbar, () => 'accessory');
  expect(candidate?.control.items).toHaveLength(1);
  expect(candidate?.control.items[0].selected).toBe(true);
});

test('projects progress of 0', () => {
  const toolbar = mount(false);
  const bar = document.querySelector('ion-progress-bar')!;
  bar.setAttribute('value', '0');
  (bar as HTMLElement & { value?: number }).value = 0;
  const candidate = readCandidate(toolbar, () => 'accessory');
  expect(candidate?.control.progress).toBe(0);
});

test('maps play icon to unselected and skips unmarked toolbars', () => {
  const candidate = readCandidate(mount(false), () => 'accessory');
  expect(candidate?.control.items[0].selected).toBe(false);
  document.body.innerHTML = '<ion-toolbar class="ios"><ion-button slot="end"><svg></svg></ion-button></ion-toolbar>';
  const plain = document.querySelector<HTMLElement>('ion-toolbar')!;
  plain.style.cssText = 'display: block; visibility: visible; opacity: 1';
  plain.getBoundingClientRect = size;
  expect(readCandidate(plain, () => 'plain')).toBeUndefined();
});
