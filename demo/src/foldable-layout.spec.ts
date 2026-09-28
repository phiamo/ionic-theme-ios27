import { afterEach, expect, test } from 'vitest';
import type { BarPlacement, FoldState } from '@erkamyaman/capacitor-foldable';
import { applyFoldablePlacement, applyFoldableState } from '../../src/vertical-bars';

afterEach(() => document.body.replaceChildren());

test('fold events replace posture classes and distinguish a flat fold from an ordinary flat display', () => {
  const root = document.createElement('ion-app');
  root.classList.add('app-theme');
  const halfOpen: FoldState = { state: 'half-opened', isSeparating: true, posture: 'book' };
  applyFoldableState(root, halfOpen);
  expect(root.classList.contains('ios-theme-fold-half-opened')).toBe(true);
  expect(root.classList.contains('ios-theme-fold-expanded')).toBe(true);
  applyFoldableState(root, { state: 'flat', hingeBounds: { x: 450, y: 0, width: 0, height: 800 } });
  expect(root.classList.contains('ios-theme-fold-half-opened')).toBe(false);
  expect(root.classList.contains('ios-theme-fold-expanded')).toBe(true);
  applyFoldableState(root, { state: 'flat' });
  expect(root.className).toBe('app-theme ios-theme-fold-flat');
});

test('placement targets the supplied root, respects RTL and clears the rail when disabled', () => {
  document.body.innerHTML = '<ion-app></ion-app><ion-app dir="rtl"></ion-app>';
  const root = document.querySelectorAll('ion-app')[1];
  const placement: BarPlacement = { verticalBarEdge: 'trailing', inset: 84 };
  applyFoldablePlacement(root, placement);
  expect(root.classList.contains('ios-theme-vertical-bars-left')).toBe(true);
  expect(root.style.getPropertyValue('--ios-theme-vertical-bars-native-inset')).toBe('84px');
  expect(document.querySelector('ion-app')!.className).toBe('');
  applyFoldablePlacement(root, { verticalBarEdge: null, inset: 0 });
  expect(root.className).toBe('');
  expect(root.style.getPropertyValue('--ios-theme-vertical-bars-native-inset')).toBe('');
});
