import { afterEach, expect, test } from 'vitest';
import { readCandidate } from '../../src/native/components';
import { setVerticalBarsPlacement } from '../../src/native/shared/dom';
import { enableVerticalControlArea } from '../../src/vertical-bars';

const mount = (fills: (string | undefined)[], grouped = false) => {
  document.body.innerHTML = `<ion-app class="ios-theme-vertical-bars"><main class="ion-page"><ion-header><ion-toolbar>${grouped ? '<ion-buttons>' : ''}${fills.map(() => '<ion-button><svg slot="icon-only" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg></ion-button>').join('')}${grouped ? '</ion-buttons>' : ''}</ion-toolbar></ion-header></main></ion-app>`;
  document.querySelectorAll<HTMLElement>('*').forEach((element) => {
    element.style.opacity = '1';
    element.style.visibility = 'visible';
  });
  const buttons = Array.from(document.querySelectorAll('ion-button')) as HTMLIonButtonElement[];
  buttons.forEach((button, i) => {
    button.fill = fills[i] as HTMLIonButtonElement['fill'];
    // Other suites may already have registered Ionic custom elements.
    const shadow = button.shadowRoot ?? button.attachShadow({ mode: 'open' });
    const native = document.createElement('span');
    shadow.replaceChildren(native);
    native.setAttribute('part', 'native');
    native.style.cssText = 'color: white; background-color: rgba(0,0,0,0.24); border: 2px solid red';
  });
  document.querySelectorAll<HTMLElement>('ion-button, ion-buttons, svg').forEach((element) => {
    element.style.cssText = 'display: block; visibility: visible; opacity: 1';
    element.getBoundingClientRect = () => ({ x: 0, y: 0, width: 44, height: 44, top: 0, left: 0, right: 44, bottom: 44 }) as DOMRect;
    setVerticalBarsPlacement(element, true);
  });
  return grouped ? document.querySelector<HTMLElement>('ion-buttons')! : buttons[0];
};
afterEach(() => document.body.replaceChildren());

test.each([undefined, null])('default %s preserves the existing glass projection', (buttonDefaultFill) => {
  const item = readCandidate(mount([undefined]), () => 'button', { buttonDefaultFill })!.control.items[0];
  expect(item.color).toBe('rgb(255, 255, 255)');
  expect(item.backgroundColor).toBeUndefined();
  expect(item.borderColor).toBeUndefined();
});

test.each([undefined, 'default'])('solid default retains computed colors for fill %s without changing the source', (fill) => {
  const element = mount([fill]);
  const item = readCandidate(element, () => 'button', { buttonDefaultFill: 'solid' })!.control.items[0];
  expect(item.color).toBe('rgb(255, 255, 255)');
  expect(item.backgroundColor).toBe('rgba(0, 0, 0, 0.24)');
  expect((element as HTMLIonButtonElement).fill).toBe(fill);
});

test('grouped buttons use the default but explicit clear/outline override it', () => {
  const element = mount([undefined, 'clear', 'outline', 'solid'], true);
  const items = readCandidate(element, (e) => e.localName, { buttonDefaultFill: 'solid' })!.control.items;
  expect(items.map((item) => item.backgroundColor)).toEqual(['rgba(0, 0, 0, 0.24)', undefined, undefined, 'rgba(0, 0, 0, 0.24)']);
  expect(items[2].borderColor).toBe('rgb(255, 0, 0)');
  expect(items[2].borderWidth).toBe(2);
});

test('explicit solid wins over a null default', () => {
  const item = readCandidate(mount(['solid']), () => 'button', { buttonDefaultFill: null })!.control.items[0];
  expect(item.backgroundColor).toBe('rgba(0, 0, 0, 0.24)');
});

test('startup rejects a different default until the previous owner is destroyed', async () => {
  const first = await enableVerticalControlArea();
  try {
    await expect(enableVerticalControlArea({ buttonDefaultFill: null })).resolves.toBeDefined();
    await expect(enableVerticalControlArea({ buttonDefaultFill: 'solid' })).rejects.toThrow('different controls');
  } finally {
    await first.destroy();
  }
  const next = await enableVerticalControlArea({ buttonDefaultFill: 'solid' });
  await next.destroy();
});
