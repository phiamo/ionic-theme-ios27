import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemGroup,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@demo/ionic';

@Component({
  selector: 'app-button-projection',
  templateUrl: './button-projection.page.html',
  styleUrl: './button-projection.page.scss',
  imports: [
    IonBackButton,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonItemGroup,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonProjectionPage {
  readonly placements = ['Grouped', 'Separate', 'Standalone'] as const;
  readonly placement = signal<(typeof this.placements)[number]>('Separate');
  readonly styled = signal(false);
  readonly disabled = signal(false);
  readonly lastAction = signal('None');
  readonly actions = [
    { label: 'Omitted', fill: undefined, icon: 'search-outline' },
    { label: 'Clear', fill: 'clear', icon: 'heart-outline' },
    { label: 'Solid', fill: 'solid', icon: 'add-outline' },
    { label: 'Outline', fill: 'outline', icon: 'bookmark-outline' },
  ] as const;
}
