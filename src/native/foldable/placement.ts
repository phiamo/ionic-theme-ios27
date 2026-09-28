import { applyVerticalControlAreaPlacement } from '../index';
import type { BarPlacement } from './types';

/** Apply the plugin's placement to CSS and native projection together. */
export function applyVerticalBarPlacement(root: HTMLElement, { verticalBarEdge, inset }: BarPlacement): void {
  applyVerticalControlAreaPlacement(root, { edge: verticalBarEdge, nativeEdge: verticalBarEdge, inset });
}
