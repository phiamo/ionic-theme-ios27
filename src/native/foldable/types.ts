import type { VerticalBarEdge } from '../definitions';

export interface FoldState {
  state: 'flat' | 'half-opened' | 'closed';
  hingeBounds?: { x: number; y: number; width: number; height: number };
}

export interface BarPlacement {
  verticalBarEdge: VerticalBarEdge;
  inset: number;
}
