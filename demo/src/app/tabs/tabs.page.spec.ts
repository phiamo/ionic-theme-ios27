import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { type FoldState } from '@erkamyaman/capacitor-foldable';
import { vi } from 'vitest';

const foldable = vi.hoisted(() => ({
  addListener: vi.fn<(event: 'foldStateChange', callback: (fold: FoldState) => void) => Promise<{ remove(): Promise<void> }>>(),
  getFoldState: vi.fn<() => Promise<FoldState>>(),
}));
vi.mock('@erkamyaman/capacitor-foldable', () => ({ Foldable: foldable }));

import { TabsPage } from './tabs.page';
import { testConfig } from '../../../util/test.config';

describe('TabsPage', () => {
  let component: TabsPage;
  let fixture: ComponentFixture<TabsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: testConfig.providers,
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const flat: FoldState = { state: 'flat', posture: 'flat', isSeparating: false };
  const halfOpened: FoldState = { state: 'half-opened', posture: 'book', isSeparating: true };
  const hingeBounds = { x: 475, y: 0, width: 0, height: 900 };

  it('uses the fold state without requiring hinge geometry and restores the ordinary layout', () => {
    const pane = component.splitPane().nativeElement;
    component.setFoldState(halfOpened);
    expect(pane.getAttribute('when')).toBe('(min-width: 900px)');
    expect(pane.classList.contains('ios-theme-split-pane-half-open')).toBe(true);

    component.setFoldState({ ...flat, hingeBounds });
    expect(pane.getAttribute('when')).toBe('(min-width: 900px)');
    expect(pane.classList.contains('ios-theme-split-pane-half-open')).toBe(false);

    for (const fold of [flat, { ...flat, state: 'closed' as const, hingeBounds }]) {
      component.setFoldState(fold);
      expect(pane.getAttribute('when')).toBe('(min-width: 992px)');
      expect(pane.classList.contains('ios-theme-split-pane-half-open')).toBe(false);
    }
  });

  it('applies the initial state when no event has arrived', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    foldable.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
    foldable.getFoldState.mockResolvedValue(halfOpened);
    await component.observeHinge();
    expect(component.splitPane().nativeElement.getAttribute('when')).toBe('(min-width: 900px)');
  });

  it('keeps the latest event when an older initial read resolves later', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    let emit!: (fold: FoldState) => void;
    foldable.addListener.mockImplementation(async (_event, callback) => {
      emit = callback;
      return { remove: vi.fn().mockResolvedValue(undefined) };
    });
    let resolveInitial!: (fold: FoldState) => void;
    foldable.getFoldState.mockImplementation(() => new Promise((resolve) => (resolveInitial = resolve)));
    const observing = component.observeHinge();
    await vi.waitFor(() => expect(resolveInitial).toBeTypeOf('function'));
    emit(flat);
    emit(halfOpened);
    resolveInitial(flat);
    await observing;
    const pane = component.splitPane().nativeElement;
    expect(pane.getAttribute('when')).toBe('(min-width: 900px)');
    expect(pane.classList.contains('ios-theme-split-pane-half-open')).toBe(true);
  });

  it('ignores a pending initial read after destruction and removes its listener', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    const remove = vi.fn().mockResolvedValue(undefined);
    foldable.addListener.mockResolvedValue({ remove });
    let resolveInitial!: (fold: FoldState) => void;
    foldable.getFoldState.mockImplementation(() => new Promise((resolve) => (resolveInitial = resolve)));
    const apply = vi.spyOn(component, 'setFoldState');
    const observing = component.observeHinge();
    await vi.waitFor(() => expect(resolveInitial).toBeTypeOf('function'));
    component.ngOnDestroy();
    resolveInitial(halfOpened);
    await observing;
    expect(apply).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledOnce();
  });
});
