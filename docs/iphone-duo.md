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

After `ion-app` is mounted, pass device state to `applyFoldStateClasses`. The application owns subscriptions and cleanup. No projection runtime is needed for posture-driven layout.

```ts
import { Foldable } from '@erkamyaman/capacitor-foldable';
import { applyFoldStateClasses } from '@rdlabo/ionic-theme-ios27/vertical-bars';

const root = document.querySelector('ion-app')!;
const listener = await Foldable.addListener('foldStateChange', (fold) => applyFoldStateClasses(root, fold));
applyFoldStateClasses(root, await Foldable.getFoldState());

```

When the application owner is disposed:

```ts
await listener.remove();
```

Subscribe to changes, then read the current state. The same helper handles initial values and events.

`applyFoldStateClasses` keeps one of `ios-theme-fold-flat`, `ios-theme-fold-half-opened`, and `ios-theme-fold-closed` on the supplied root, preserving unrelated classes. It also sets `ios-theme-fold-expanded` for a half-opened state or a flat state with hinge geometry. A flat state without geometry (including the Web fallback) and a closed state clear that class. The helpers do not subscribe to the plugin or change Ionic's split-pane `when` property.

For rail placement, use `setVerticalControlAreaPlacement` as shown below. Pass the reported logical edge as both `edge` and `nativeEdge`, together with the measured `inset`. Leading is the physical left in LTR and the physical right in RTL. A null edge restores the ordinary layout; an inset of zero clears the explicit width. No start/stop monitoring calls are needed.

WebView corner radius remains a rendering concern: `configureNativeTransition()` uses the shell's `getWebViewMetrics()` API, independently of `Foldable`.

**Migration:** the theme's former `DeviceLayout`, `HingeStatus`, `getDeviceLayout()`, `deviceLayoutChange`, and start/stop device-layout monitoring APIs have been removed. Replace device subscriptions with the `Foldable` APIs above; use `getWebViewMetrics()` for one-shot radius reads. Foldable can infer Duo bar placement from safe-area insets when the app is built without the iOS 27.1 SDK. Hinge data still requires the newer SDK. Apps can also request a fixed rail placement independently of the reported edge.

## Reserve the vertical rail

Add `.ios-theme-vertical-bars` to `ion-app` to reserve the rail region on the physical right, or add `.ios-theme-vertical-bars-left` as well to use the physical left:

```html
<ion-app class="ios-theme-vertical-bars">...</ion-app>
```

The classes are physical — `-left` always means the physical left edge — because CSS and the native renderer work in physical coordinates. `setVerticalControlAreaPlacement` (below) applies the logical `verticalBarEdge` reported by `Foldable` and resolves it through the document's direction, so an RTL app does not need its own conversion.

For Chrome development, no native plugin is needed — the class alone reserves `80px` to simulate iPhone Duo. When `setVerticalControlAreaPlacement` receives `{ edge, nativeEdge, inset }`, the inset replaces the fallback width, even when it is less than `80px`. Override `--ios-theme-vertical-bars-safe-area-left` or `--ios-theme-vertical-bars-safe-area-right` when simulating a different layout.

This keeps routers and component backgrounds full-viewport. `ion-content` moves its scroll foreground, `ion-toolbar` moves its container foreground, and `ion-fab` adjusts only when placed beside the system UI. The corresponding Ionic safe-area variable is reset inside those foreground components so descendants do not add the inset again.

`ion-modal` applies the same foreground correction when its visible dialog spans the viewport width. With the Vertical Control Area runtime enabled, the topmost full-width modal also projects eligible toolbar buttons into its own rail; centered dialogs keep their toolbar buttons and receive no page-rail inset. This includes full-width sheet modals: their rail follows the visible sheet bounds as the breakpoint changes. Eligibility follows the visible dialog width, not the hinge posture or modal type. `ion-menu` and `ion-popover` are handled as separate surfaces: their internal foreground components do not receive the main-page conversion and retain Ionic's standard safe-area handling. A menu presented beside the system UI keeps Ionic's full-viewport animation host and offsets only its visible container by the corresponding inset; a menu from the opposite side is unchanged. Left and right remain physical coordinates in RTL, while Ionic's `side="start"` and `side="end"` values remain logical.

The mode is component-mode independent: an app can keep Ionic `mode: 'md'` on iOS and still enable Vertical Bars. No component needs `mode="ios"`.

## Project controls into the rail

Start the standalone runtime once after `ion-app` is mounted, and apply the plugin's placement with `setVerticalControlAreaPlacement`:

```ts
import { Foldable } from '@erkamyaman/capacitor-foldable';
import { setVerticalControlAreaPlacement, enableVerticalControlArea } from '@rdlabo/ionic-theme-ios27/vertical-bars';

const rail = await enableVerticalControlArea();
const listener = await Foldable.addListener('barPlacementChange', ({ verticalBarEdge, inset }) =>
  setVerticalControlAreaPlacement({ edge: verticalBarEdge, nativeEdge: verticalBarEdge, inset }),
);
const { verticalBarEdge, inset } = await Foldable.getBarPlacement();
setVerticalControlAreaPlacement({ edge: verticalBarEdge, nativeEdge: verticalBarEdge, inset });

```

When the application owner is disposed:

```ts
await listener.remove();
await rail.destroy();
```

Supply `nativeEdge` on both the initial read and each event so the renderer knows which rail the system actually provides. The measured `inset` is passed through instead of assuming a fixed width. Devices without a reported rail, including Web and Android, return a null edge and retain the ordinary layout. For browser simulation, use the class-based preview above without connecting device placement.

Start either `enableVerticalControlArea()` or the full `enableNativeUIShell()` — not both. If the app already uses Native UI Shell, keep that runtime and use the same `setVerticalControlAreaPlacement` callback. The application owner removes its listeners and destroys its runtime on teardown.

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

For existing themes that style a button background through CSS while leaving `fill` omitted or `default`, use `enableVerticalControlArea({ buttonDefaultFill: 'solid' })`. The option accepts `'solid'` (Ionic's default design) or `null` (the iOS theme's glass design); omission is equivalent to `null`. Explicit button fills take precedence. It affects native vertical projection only and never changes source buttons or Web clones. Omit it to retain the existing behavior. The full `enableNativeUIShell()` also accepts this option for its vertical buttons. Restart the runtime before changing the option.

Give icon-only actions an accessible name, such as `aria-label="Done"`. Keep the original Ionic event handler or form association on the source button.

The same rule applies to individual buttons and buttons inside `ion-buttons`, on ordinary pages and in the topmost full-width modal. Centered modals, menus, and popovers keep their own toolbar layout. Add `.ios-theme-horizontal-only` to a group or individual button to keep it horizontal. Placement is chosen when a routed page enters; changing an existing button's content or icon slot does not move it between the toolbar and rail until the page leaves and re-enters.

### Tab bar

When the app contains `ion-tabs`, its tab bar moves into the reserved region and uses the native Duo edge spacing; the Ionic `slot` value does not select a different position. Without native projection, the stable Web rail is icon-only, matching the native resting presentation. While the user presses and drags across that rail, every icon-and-label tab reveals its label so the pending destination stays identifiable. The Web tab bar receives pointer input in the simulated system region. Native tabs and a restored Web tab bar fade in over 180ms; disappearance remains immediate. Reduced motion disables this fade. Use `ion-menu` when navigation should become a sidebar; this mode does not convert tabs into a menu. Web clones also work when no `ion-tabs` exists. Disabling the mode or leaving the page removes the native ownership or Web clones and restores their sources. Override `--ios-theme-vertical-bars-toolbar-top` when the simulated system controls use a different vertical layout.

## Adapt the split pane

For a side-by-side menu on iPhone Duo, opt the `ion-split-pane` into the separately measured Settings layout. The sidebar is 320pt when fully unfolded and reaches the display midpoint when half-opened (50vw). The application supplies the posture; both states have the same viewport width, so a width media query cannot distinguish them:

```html
<ion-split-pane
  class="ios-theme-fold-layout"
  contentId="main-content"
  when="(min-width: 900px)"
>
  <ion-menu contentId="main-content">...</ion-menu>
  <div id="main-content">...</div>
</ion-split-pane>
```

Set the ordinary split-pane width to 320pt in the application's stylesheet, and let the half-open class change only the width value:

```css
ion-split-pane.ios-theme-fold-layout {
  --ios-theme-menu-width: var(--ios-theme-split-pane-width);
  --side-width: var(--ios-theme-menu-width);
  --side-max-width: var(--ios-theme-menu-width);
  transition: --ios-theme-split-pane-width 300ms ease;
}
```

The registered `--ios-theme-split-pane-width` defaults to `320px`. `applyFoldStateClasses` sets `ios-theme-fold-half-opened` on `ion-app`; the stylesheet then sets only descendant split panes with `ios-theme-fold-layout` to `50vw`. Add this opt-in class once; no state-dependent class binding is needed. Other split panes retain their existing width.

Ionic's `when` still controls whether the menu is persistent. The example chooses a fixed 900px breakpoint. If your app needs different breakpoints for folded and ordinary displays, use the `ios-theme-fold-expanded` class applied by the helper to select that policy in your application's layout code. The helper only updates state classes, not `when`. This layout does not enable Vertical Bars or move an overlay menu.

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
