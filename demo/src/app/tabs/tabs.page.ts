import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
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
import { applyFoldStateClasses } from '../../../../src/vertical-bars';
import { Foldable, type FoldState } from '@erkamyaman/capacitor-foldable';
import { Capacitor } from '@capacitor/core';

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
      const path = params.urlAfterRedirects.split(/[?#]/, 1)[0];
      if (['/main/settings', '/main/index/toolbar', '/main/index/button-projection'].includes(path)) {
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
    const root = this.#el.nativeElement.closest('ion-app') as HTMLElement;
    applyFoldStateClasses(root, fold);
    // Visibility remains an application choice; the helper controls state classes.
    this.splitPane().nativeElement.setAttribute(
      'when',
      root.classList.contains('ios-theme-fold-expanded') ? '(min-width: 900px)' : '(min-width: 992px)',
    );
  }

  async observeHinge() {
    if (Capacitor.getPlatform() !== 'ios') return;
    this.#hingeListener = await Foldable.addListener('foldStateChange', (fold) => {
      if (!this.#destroyed) this.setFoldState(fold);
    });
    if (this.#destroyed) return this.#releaseHinge();
    const fold = await Foldable.getFoldState();
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
