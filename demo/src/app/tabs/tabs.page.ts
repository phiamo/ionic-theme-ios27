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
      if (['/main/settings', '/main/index/toolbar', '/main/index/button-projection'].includes(params.urlAfterRedirects)) {
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
    const expanded = fold.state === 'half-opened' || (fold.state === 'flat' && !!fold.hingeBounds);
    splitPane.setAttribute('when', expanded ? '(min-width: 900px)' : '(min-width: 992px)');
    splitPane.classList.toggle('ios-theme-split-pane-half-open', fold.state === 'half-opened');
  }

  async observeHinge() {
    if (Capacitor.getPlatform() !== 'ios') return;
    let receivedEvent = false;
    this.#hingeListener = await Foldable.addListener('foldStateChange', (fold) => {
      receivedEvent = true;
      if (!this.#destroyed) this.setFoldState(fold);
    });
    if (this.#destroyed) return this.#releaseHinge();
    const fold = await Foldable.getFoldState();
    if (!this.#destroyed && !receivedEvent) this.setFoldState(fold);
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
