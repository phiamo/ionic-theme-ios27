import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Capacitor } from '@capacitor/core';
import { Foldable, type FoldState } from '@erkamyaman/capacitor-foldable';
import { vi } from 'vitest';

vi.mock('@erkamyaman/capacitor-foldable', () => ({
  Foldable: { addListener: vi.fn(), getFoldState: vi.fn() },
}));

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

  it('applies the initial fold, updates the pane, and removes its listener on destroy', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    const remove = vi.fn().mockResolvedValue(undefined);
    let emit!: (fold: FoldState) => void;
    vi.mocked(Foldable.addListener).mockImplementation(async (_event, listener) => {
      emit = listener as unknown as (fold: FoldState) => void;
      return { remove };
    });
    vi.mocked(Foldable.getFoldState).mockResolvedValue({
      state: 'half-opened',
      posture: 'book',
      isSeparating: true,
      hingeBounds: { x: 450, y: 0, width: 0, height: 900 },
    });
    await component.observeHinge();
    const pane = fixture.nativeElement.querySelector('ion-split-pane');
    expect(pane.classList.contains('ios-theme-split-pane-half-open')).toBe(true);
    expect(pane.getAttribute('when')).toBe('(min-width: 900px)');
    emit({ state: 'flat', posture: 'flat', isSeparating: false });
    expect(pane.classList.contains('ios-theme-split-pane-half-open')).toBe(false);
    expect(pane.getAttribute('when')).toBe('(min-width: 992px)');
    fixture.destroy();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('removes a listener whose registration completes after destruction', async () => {
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue('ios');
    const remove = vi.fn().mockResolvedValue(undefined);
    let registered!: (handle: { remove: typeof remove }) => void;
    vi.mocked(Foldable.addListener).mockReturnValue(
      new Promise((resolve) => {
        registered = resolve;
      }),
    );
    const observing = component.observeHinge();
    fixture.destroy();
    registered({ remove });
    await observing;
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
