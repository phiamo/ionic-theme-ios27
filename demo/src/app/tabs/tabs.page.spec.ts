import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { type FoldState } from '@erkamyaman/capacitor-foldable';

// Use global vi: Angular can rename an imported vi while bundling, preventing mock hoisting.
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
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: testConfig.providers,
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TabsPage);
    component = fixture.componentInstance;
    root = document.createElement('ion-app');
    document.body.append(root);
    root.append(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    root.remove();
    vi.restoreAllMocks();
  });

  const flat: FoldState = { state: 'flat', posture: 'flat', isSeparating: false };
  const halfOpened: FoldState = { state: 'half-opened', posture: 'book', isSeparating: true };
  const hingeBounds = { x: 475, y: 0, width: 0, height: 900 };

  it('uses the fold state without requiring hinge geometry and restores the ordinary layout', () => {
    const pane = component.splitPane().nativeElement;
    expect(pane.classList.contains('split-pane-fold-layout')).toBe(true);
    component.setFoldState(halfOpened);
    expect(pane.getAttribute('when')).toBe('(min-width: 900px)');
    expect(root.classList.contains('ios-theme-fold-half-opened')).toBe(true);

    component.setFoldState({ ...flat, hingeBounds });
    expect(pane.getAttribute('when')).toBe('(min-width: 900px)');
    expect(root.classList.contains('ios-theme-fold-half-opened')).toBe(false);

    for (const fold of [flat, { ...flat, state: 'closed' as const, hingeBounds }]) {
      component.setFoldState(fold);
      expect(pane.getAttribute('when')).toBe('(min-width: 992px)');
      expect(root.classList.contains('ios-theme-fold-half-opened')).toBe(false);
    }
  });

  it('applies the initial state when no event has arrived', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    foldable.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
    foldable.getFoldState.mockResolvedValue(halfOpened);
    await component.observeHinge();
    expect(component.splitPane().nativeElement.getAttribute('when')).toBe('(min-width: 900px)');
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
