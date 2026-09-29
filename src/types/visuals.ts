export interface TapeDiagramPart {
  label: string;
  count: number;
  valuePerUnit?: number | string;
  color?: string;
}

export interface TapeDiagramData {
  title?: string;
  parts: TapeDiagramPart[];
  totalLabel?: string;
}

export interface NumberLinePoint {
  value: number;
  label?: string;
  color?: string;
}

export interface NumberLineJump {
  from: number;
  to: number;
  label: string;
  color?: string;
}

export interface NumberLineData {
  min: number;
  max: number;
  step?: number;
  points?: NumberLinePoint[];
  jumps?: NumberLineJump[];
}

export interface CERData {
  claim: string;
  evidence: string[];
  reasoning: string;
}

export interface VariableScaleData {
  independentVar: string; // What I change
  dependentVar: string;   // What is measured
  constants?: string[];   // What stays the same
}

export interface TimelineEvent {
  yearOrEra: string;
  title: string;
  description?: string;
}

export interface TimelineData {
  events: TimelineEvent[];
}

export interface BalanceScaleItem {
  id?: string;
  label?: string; // e.g. "x", "y"
  count?: number; // e.g. 2 for 2x
  value?: number; // numeric constant e.g. 4
  color?: string;
}

export interface BalanceScaleData {
  title?: string;
  leftItems: BalanceScaleItem[];
  rightItems: BalanceScaleItem[];
  equation?: string;
  targetVariable?: string; // e.g. "x"
}

export interface FractionModelData {
  title?: string;
  shape?: 'bar' | 'circle';
  totalParts: number;
  shadedParts: number;
  label?: string;
  subdivisionLabel?: string; // e.g. "Each slice is 1/6"
  compareWith?: {
    totalParts: number;
    shadedParts: number;
    label?: string;
  };
}

export interface DynamicSvgData {
  title?: string;
  svg: string;
  caption?: string;
}

