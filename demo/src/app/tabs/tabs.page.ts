import { AfterViewInit, Component, ElementRef, inject, InjectionToken, OnDestroy, OnInit, viewChild } from '@angular/core';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonMenu,
  IonSplitPane,
  IonTabBar,
  IonTabButton,
  IonTabs,
  ViewDidEnter,
  ViewDidLeave,
} from '@demo/ionic';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

// import { registerTabBarEffect } from '@rdlabo/ionic-theme-ios27';
import { registeredEffect, registerTabBarEffect } from '../../../../src';
import { Foldable, type FoldablePlugin, type FoldState } from '@erkamyaman/capacitor-foldable';
import { Capacitor } from '@capacitor/core';

// Inject the plugin so Angular tests can replace the bridge without module mocking.
export const FOLDABLE = new InjectionToken<FoldablePlugin>('Foldable', { providedIn: 'root', factory: () => Foldable });

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonList,
    IonItem,
    IonItemGroup,
    RouterLink,
  ],
})
export class TabsPage implements OnInit, AfterViewInit, OnDestroy, ViewDidEnter, ViewDidLeave {
  readonly #router = inject(Router);
  readonly #foldable = inject(FOLDABLE);
  readonly #el = inject(ElementRef);
  readonly splitPane = viewChild.required<IonSplitPane, ElementRef<HTMLIonSplitPaneElement>>('splitPane', { read: ElementRef });
  #hingeListener?: { remove(): Promise<void> };
  #destroyed = false;
  readonly registeredGestures: registeredEffect[] = [];
  ngOnInit() {
    this.#router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((params) => {
      const tabBar = this.#el.nativeElement.querySelector('ion-tab-bar');
      if (!tabBar) {
        return;
      }
      if (['/main/settings', '/main/index/toolbar'].includes(params.urlAfterRedirects)) {
        tabBar.classList.add('tab-bar-hidden');
      } else if (tabBar) {
        tabBar.classList.remove('tab-bar-hidden');
      }
    });
  }

  ngAfterViewInit() {
    void this.observeHinge().catch((error) => console.error(error));
  }

  setFoldState(fold: FoldState) {
    const splitPane = this.splitPane().nativeElement;
    // The width rules key off the `when` attribute, so go through setAttribute.
    splitPane.setAttribute('when', !fold.hingeBounds ? '(min-width: 992px)' : '(min-width: 900px)');
    splitPane.classList.toggle('ios-theme-split-pane-half-open', fold.state === 'half-opened');
  }

  async observeHinge() {
    if (Capacitor.getPlatform() !== 'ios') return;
    this.#hingeListener = await this.#foldable.addListener('foldStateChange', (fold) => {
      if (!this.#destroyed) this.setFoldState(fold);
    });
    if (this.#destroyed) return this.#releaseHinge();
    const fold = await this.#foldable.getFoldState();
    if (!this.#destroyed) this.setFoldState(fold);
  }

  #releaseHinge() {
    void this.#hingeListener?.remove();
    this.#hingeListener = undefined;
  }

  ngOnDestroy() {
    this.#destroyed = true;
    this.#releaseHinge();
  }

  ionViewDidEnter() {
    const registerGesture = registerTabBarEffect(document.querySelector<HTMLElement>('ion-tab-bar')!);
    if (registerGesture) {
      this.registeredGestures.push(registerGesture);
    }
  }

  ionViewDidLeave() {
    this.registeredGestures.forEach((gesture) => gesture.destroy());
  }
}
