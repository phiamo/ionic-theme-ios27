---
title: iPhone Duo support (experimental)
---

# iPhone Duo support (experimental)

Adapt your Ionic app to iPhone Duo: place navigation and actions in its vertical system rail, and adjust your split pane as the device opens and closes. Existing Ionic markup remains the source of labels, icons, routing, and click handlers.

**New here?** Start with [iPhone Duo with your existing theme](https://docs.rdlabo.dev/projects/ionic-theme-ios27/docs/iphone-duo-with-original-theme) to preview the side layout in Chrome. This page explains device events, placement, split panes, and the API.

Available in `1.2.0-0` as an **experimental** feature alongside [Native UI Shell](https://docs.rdlabo.dev/projects/ionic-theme-ios27/docs/native-ui-shell). APIs and supported behavior may change. The real system rail and hinge reporting require iOS 27.1 or later and an app built with Xcode 27.1 or newer.

This package provides two independent pieces for that hardware. Each works **without the iOS 27 theme stylesheets** and **without the full Native UI Shell**:

- `dist/css/vertical-bars.css` — opt-in classes that reserve the rail's safe area, plus a registered custom property for a posture-driven split-pane width.
- `enableVerticalControlArea()` — moves eligible tabs and toolbar controls into the reserved area. On Capacitor iOS they are rendered by a native SwiftUI `TabView` and toolbar; everywhere else the same controls appear as Web clones.

Device state belongs to [`@erkamyaman/capacitor-foldable`](https://github.com/erkamyaman/capacitor-foldable). The **application** subscribes to its events and chooses its layout. This package's **stylesheet and runtime** apply that decision by reserving space, projecting controls and adapting the split pane. The theme does not monitor hinge state or bar placement.

## Choose what to adopt

To keep your existing theme and add only the standalone support, follow [iPhone Duo with your existing theme](https://docs.rdlabo.dev/projects/ionic-theme-ios27/docs/iphone-duo-with-original-theme). This page covers the shared device-layout rules and API.

| Goal                                             | Stylesheet          | Runtime                                                            |
| ------------------------------------------------ | ------------------- | ------------------------------------------------------------------ |
| Hinge posture only (layout switches) | none | none — subscribe to `Foldable` directly |
| Posture-driven split-pane width | `vertical-bars.css` | none — subscribe to `Foldable` directly |
| Vertical rail for tabs and toolbar actions       | `vertical-bars.css` | `enableVerticalControlArea()`                                      |
| Native shell plus the rail                       | `vertical-bars.css` | `enableNativeUIShell()` — includes rail projection |

```scss
@use '@rdlabo/ionic-theme-ios27/dist/css/vertical-bars.css';
```

The stylesheet never changes ordinary Ionic UI by itself; every rule requires an opt-in class. Load it unconditionally — these values are simulation and layout inputs, independent from Ionic's normal safe-area variables.

The `/vertical-bars` entry point imports `@capacitor/core` at module load, so install it even for Web-only use (it is an optional peer dependency). Apps that want only the stylesheet and its opt-in classes need nothing else.

## Read the device layout

Install the device-state plugin in the application, then sync the native project:

```bash
npm install @erkamyaman/capacitor-foldable
npx cap sync
```

Use Capacitor 8.5 or later and build with Xcode 27.1 or newer for iPhone Duo's iOS 27.1 APIs. The dependency is needed for device-driven layout, not for the theme's CSS, browser simulation, or native control projection alone. Do not import the plugin's `ionic-tabs.css` alongside this package's rail projection; both would reposition the same tabs.

For a posture-driven split pane, subscribe directly without starting a projection runtime:

```ts
import { Foldable, type FoldState } from '@erkamyaman/capacitor-foldable';

const applyFold = (fold: FoldState) => {
  const pane = document.querySelector('ion-split-pane');
  pane?.classList.toggle('ios-theme-split-pane-half-open', fold.state === 'half-opened');
  const expanded = fold.state === 'half-opened' || (fold.state === 'flat' && !!fold.hingeBounds);
  pane?.setAttribute('when', expanded ? '(min-width: 900px)' : '(min-width: 992px)');
};
let receivedEvent = false;
let disposed = false;
const listener = await Foldable.addListener('foldStateChange', (fold) => {
  receivedEvent = true;
  if (!disposed) applyFold(fold);
});
const initialFold = await Foldable.getFoldState();
if (!disposed && !receivedEvent) applyFold(initialFold);

// When the consumer goes away:
// disposed = true;
// await listener.remove();
```

`getFoldState()` and `foldStateChange` report `state` (`'flat'`, `'half-opened'`, or `'closed'`), `posture`, and optional hinge geometry. Without fold information, the plugin returns a flat state without `hingeBounds`; restore the ordinary split-pane breakpoint in that case. The Web implementation also returns a flat state. A half-opened state uses the 900px breakpoint even without hinge geometry; a flat state with hinge geometry also uses 900px. A closed state restores the ordinary 992px breakpoint. Events received during initialization take precedence over the initial read.

`getBarPlacement()` and `barPlacementChange` report `{ verticalBarEdge: 'leading' | 'trailing' | null }`. The edge is **logical**: leading is the physical left in LTR and the physical right in RTL. Pass `{ edge: verticalBarEdge, nativeEdge: verticalBarEdge }` to `setPlacement()`. No start/stop monitoring calls are needed; remove each listener when its owner is disposed.

The theme never reads UIKit bar-placement traits. The application supplies `nativeEdge` on the initial read and each event, even when choosing a fixed `edge`. Omit `nativeEdge` to keep the last supplied value; pass `null` when the plugin reports no edge. An explicit `nativeEdge: null` or an initial unregistered edge prevents native vertical projection: `enableVerticalControlArea()` keeps the requested Web rail, while the full Native UI Shell temporarily restores its ordinary horizontal layout. The requested rail is retained so a later reported edge can restore vertical layout. Native vertical projection starts only after a matching non-null edge is supplied. Omitting `nativeEdge` after supplying it preserves that value, including `null`. Passing `{ edge: null, nativeEdge }` updates the reported edge while keeping the rail disabled.

The plugin does not report a safe-area inset with bar placement. The theme uses CSS safe-area values with its 80px rail fallback; an application can still pass `{ edge, inset }` to `setPlacement()` when it supplies an explicit width. WebView corner radius remains a rendering concern: `configureNativeTransition()` uses the shell's `getWebViewMetrics()` API, independently of `Foldable`.

**Migration:** the theme's former `DeviceLayout`, `HingeStatus`, `getDeviceLayout()`, `deviceLayoutChange`, and start/stop device-layout monitoring APIs have been removed. Replace device subscriptions with the `Foldable` APIs above; use `getWebViewMetrics()` for one-shot radius reads. Foldable can infer Duo bar placement from safe-area insets when the app is built without the iOS 27.1 SDK. Hinge data still requires the newer SDK. Apps can also request a fixed rail placement independently of the reported edge.

## Reserve the vertical rail

Add `.ios-theme-vertical-bars` to `ion-app` to reserve the rail region on the physical right, or add `.ios-theme-vertical-bars-left` as well to use the physical left:

```html
<ion-app class="ios-theme-vertical-bars">...</ion-app>
```

The classes are physical — `-left` always means the physical left edge — because CSS and the native renderer work in physical coordinates. `setPlacement` (below) is the usual way to apply them: it accepts the logical `verticalBarEdge` reported by `Foldable` and resolves it through the document's direction, so an RTL app does not need its own conversion.

For Chrome development, no native plugin is needed — the class alone reserves `80px` to simulate iPhone Duo. When `setPlacement` receives an explicit `{ edge, inset }`, that inset replaces the fallback width, even when it is less than `80px`. Override `--ios-theme-vertical-bars-safe-area-left` or `--ios-theme-vertical-bars-safe-area-right` when simulating a different layout.

This keeps routers and component backgrounds full-viewport. `ion-content` moves its scroll foreground, `ion-toolbar` moves its container foreground, and `ion-fab` adjusts only when placed beside the system UI. The corresponding Ionic safe-area variable is reset inside those foreground components so descendants do not add the inset again.

`ion-modal` applies the same foreground correction when its visible dialog spans the viewport width. With the Vertical Control Area runtime enabled, the topmost full-width modal also projects eligible toolbar buttons into its own rail; centered dialogs keep their toolbar buttons and receive no page-rail inset. This includes full-width sheet modals: their rail follows the visible sheet bounds as the breakpoint changes. Eligibility follows the visible dialog width, not the hinge posture or modal type. `ion-menu` and `ion-popover` are handled as separate surfaces: their internal foreground components do not receive the main-page conversion and retain Ionic's standard safe-area handling. A menu presented beside the system UI keeps Ionic's full-viewport animation host and offsets only its visible container by the corresponding inset; a menu from the opposite side is unchanged. Left and right remain physical coordinates in RTL, while Ionic's `side="start"` and `side="end"` values remain logical.

The mode is component-mode independent: an app can keep Ionic `mode: 'md'` on iOS and still enable Vertical Bars. No component needs `mode="ios"`.

## Project controls into the rail

Start the standalone runtime once at application startup:

```ts
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { enableVerticalControlArea } from '@rdlabo/ionic-theme-ios27/vertical-bars';
import { Foldable } from '@erkamyaman/capacitor-foldable';

// Start on Chrome too; the Web projection stays idle until the class is present.
const rail = await enableVerticalControlArea();
let layoutListener: PluginListenerHandle | undefined;

if (Capacitor.getPlatform() === 'ios') {
  layoutListener = await Foldable.addListener('barPlacementChange', ({ verticalBarEdge }) =>
    rail.setPlacement({ edge: verticalBarEdge, nativeEdge: verticalBarEdge }),
  );
  const { verticalBarEdge } = await Foldable.getBarPlacement();
  rail.setPlacement({ edge: verticalBarEdge, nativeEdge: verticalBarEdge });
}

// Call when the application owner is disposed.
const stopVerticalArea = async () => {
  await layoutListener?.remove();
  await rail.destroy();
};
```

`setPlacement` on the handle and the exported `setVerticalControlAreaPlacement` are the same function; either applies the application's chosen placement to the CSS layout and both projections. It requires a mounted `ion-app` — call it after the app root exists.

- Pass `{ edge, nativeEdge }`: `edge` is the application's chosen logical edge; `nativeEdge` is `verticalBarEdge` from `Foldable.getBarPlacement()`/`barPlacementChange`. They resolve through the nearest `dir` attribute, or the explicit `rtl` argument.
- Pass `null` to restore the ordinary layout.
- The device-layout listener reports what iOS chose; the application decides whether to apply it. The theme compares the application's chosen edge with its supplied `nativeEdge`; a mismatch uses the Web rail until the edges match again. For a fixed right-in-LTR rail, pass `{ edge: 'trailing', nativeEdge: verticalBarEdge }` on each `Foldable` update.

Start either `enableVerticalControlArea()` or the full `enableNativeUIShell()` — not both. Repeating the same configuration returns the shared runtime; starting a different configuration while it is active throws an error. The application should have one owner responsible for destroying that runtime. If the app already uses `enableNativeUIShell()`, keep that single runtime and call `setVerticalControlAreaPlacement({ edge: verticalBarEdge, nativeEdge: verticalBarEdge })` from its listener.

On supported iOS versions the runtime hands eligible tabs, back navigation, menu buttons, and fixed-toolbar actions to a native SwiftUI `TabView` and toolbar; on Web, Android, or when native projection is unavailable, Web clones remain the fallback. Back navigation can come from outside a fixed toolbar; menu buttons and other toolbar actions still require one.

### Toolbar actions

An `ion-button` moves into the rail when it contains an `ion-icon` or SVG with `slot="icon-only"`. The button must be in a fixed `ion-toolbar` directly inside `ion-header` or `ion-footer`, outside scrolling `ion-content`.

| Icon markup | Placement |
| --- | --- |
| `slot="icon-only"` | Vertical rail |
| `slot="start"`, `slot="end"`, or no slot | Original horizontal toolbar |
| No icon | Original horizontal toolbar |

This rule applies to `fill="default"`, `clear`, `solid`, and `outline`, including buttons with an Ionic `color`. Solid actions retain their background color through a prominent native button; outline actions retain their border color and width. The runtime preserves the original click or form-submit behavior. `type="submit"` and `.button-submit` do not select a different placement.

```html
<ion-header>
  <ion-toolbar>
    <ion-buttons slot="end">
      <ion-button type="button" fill="outline" color="primary" aria-label="Done">
        <ion-icon name="checkmark-outline" slot="icon-only"></ion-icon>
      </ion-button>
    </ion-buttons>
  </ion-toolbar>
</ion-header>
```

Give icon-only actions an accessible name, such as `aria-label="Done"`. Keep the original Ionic event handler or form association on the source button.

The same rule applies to individual buttons and buttons inside `ion-buttons`, on ordinary pages and in the topmost full-width modal. Centered modals, menus, and popovers keep their own toolbar layout. Add `.ios-theme-horizontal-only` to a group or individual button to keep it horizontal. Placement is chosen when a routed page enters; changing an existing button's content or icon slot does not move it between the toolbar and rail until the page leaves and re-enters.

### Tab bar

When the app contains `ion-tabs`, its tab bar moves into the reserved region and uses the native Duo edge spacing; the Ionic `slot` value does not select a different position. Without native projection, the stable Web rail is icon-only, matching the native resting presentation. While the user presses and drags across that rail, every icon-and-label tab reveals its label so the pending destination stays identifiable. The Web tab bar receives pointer input in the simulated system region. Native tabs and a restored Web tab bar fade in over 180ms; disappearance remains immediate. Reduced motion disables this fade. Use `ion-menu` when navigation should become a sidebar; this mode does not convert tabs into a menu. Web clones also work when no `ion-tabs` exists. Disabling the mode or leaving the page removes the native ownership or Web clones and restores their sources. Override `--ios-theme-vertical-bars-toolbar-top` when the simulated system controls use a different vertical layout.

## Adapt the split pane

For a side-by-side menu on iPhone Duo, opt the `ion-split-pane` into the separately measured Settings layout. The sidebar is 320pt when fully unfolded and reaches the display midpoint when half-opened (50vw). The application supplies the posture; both states have the same viewport width, so a width media query cannot distinguish them:

```html
<ion-split-pane
  [class.ios-theme-split-pane-half-open]="halfOpened"
  contentId="main-content"
  when="(min-width: 900px)"
>
  <ion-menu contentId="main-content">...</ion-menu>
  <div id="main-content">...</div>
</ion-split-pane>
```

Set the ordinary split-pane width to 320pt in the application's stylesheet, and let the half-open class change only the width value:

```css
ion-split-pane {
  --ios-theme-menu-width: var(--ios-theme-split-pane-width);
  --side-width: var(--ios-theme-menu-width);
  --side-max-width: var(--ios-theme-menu-width);
  transition: --ios-theme-split-pane-width 300ms ease;
}
```

The registered `--ios-theme-split-pane-width` defaults to `320px`; `.ios-theme-split-pane-half-open` sets it to `50vw`. Set `halfOpened` when `foldStateChange` reports `state === 'half-opened'` (and read the initial value with `getFoldState()`). Ionic's `when` decides whether the menu is a persistent side pane; use the 900px breakpoint for a half-opened state or a flat state with hinge geometry, and the ordinary 992px breakpoint when closed or flat without geometry. Missing `hingeBounds` alone does not mean the device is flat. The application chooses where to apply this width rule; an ordinary split pane elsewhere is unchanged. This layout does not enable Vertical Bars or move an overlay menu.

## Vertical Control Area API

The generated reference below documents the handle returned by `enableVerticalControlArea()`.

<docgen-index>

* [`setPlacement(...)`](#setplacement)
* [`getStatus()`](#getstatus)
* [`suspend()`](#suspend)
* [`destroy()`](#destroy)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### setPlacement(...)

```typescript
setPlacement(placement: VerticalBarEdge | VerticalBarPlacement, rtl?: boolean | undefined) => void
```

Applies the application's chosen placement to both Web and native controls.

| Param           | Type                                                                                                                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **`placement`** | <code><a href="#verticalbaredge">VerticalBarEdge</a> \| <a href="#verticalbarplacement">VerticalBarPlacement</a></code> |
| **`rtl`**       | <code>boolean</code>                                                                                                    |

--------------------


### getStatus()

```typescript
getStatus() => NativeUIShellStatus
```

Returns the current Web/native projection state.

**Returns:** <code><a href="#nativeuishellstatus">NativeUIShellStatus</a></code>

--------------------


### suspend()

```typescript
suspend() => Promise<NativeUIShellSuspension>
```

Restores projected controls to the Web until the returned lease is resumed.

**Returns:** <code>Promise&lt;<a href="#nativeuishellsuspension">NativeUIShellSuspension</a>&gt;</code>

--------------------


### destroy()

```typescript
destroy() => Promise<void>
```

Stops synchronization, restores Web controls and releases native resources.

--------------------


### Interfaces


#### VerticalBarPlacement

| Prop             | Type                                                        | Description                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`edge`**       | <code><a href="#verticalbaredge">VerticalBarEdge</a></code> |                                                                                                                                                                                                                                   |
| **`inset`**      | <code>number</code>                                         | Explicit rail width in CSS pixels; omitted to use the stylesheet's safe-area rules.                                                                                                                                               |
| **`nativeEdge`** | <code><a href="#verticalbaredge">VerticalBarEdge</a></code> | Native logical edge reported by the application's device plugin. Null or an unregistered edge uses a Web rail in verticalBarsOnly mode, or the ordinary Native UI Shell layout otherwise. Omission keeps the last supplied value. |


#### NativeUIShellStatus

| Prop            | Type                                        |
| --------------- | ------------------------------------------- |
| **`state`**     | <code>'native' \| 'stopped' \| 'web'</code> |
| **`projected`** | <code>number</code>                         |
| **`updates`**   | <code>number</code>                         |
| **`reason`**    | <code>string</code>                         |


#### NativeUIShellSuspension

| Method     | Signature                    | Description                                                                                    |
| ---------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| **resume** | () =&gt; Promise&lt;void&gt; | Releases this suspension. Native projection resumes after all active suspensions are released. |


### Type Aliases


#### VerticalBarEdge

Logical edge in the reading direction, matching UIVerticalBarEdge and capacitor-foldable.

<code>'leading' | 'trailing' | null</code>

</docgen-api>
