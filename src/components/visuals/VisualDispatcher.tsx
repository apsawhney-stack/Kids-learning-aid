import React from 'react';
import { VisualSpec } from '../../types/chat';
import { TapeDiagramView } from './TapeDiagramView';
import { NumberLineView } from './NumberLineView';
import { CEROrganizerView } from './CEROrganizerView';
import { VariableScaleView } from './VariableScaleView';
import { DynamicSvgView } from './DynamicSvgView';
import { BalanceScaleView } from './BalanceScaleView';
import { FractionModelView } from './FractionModelView';

interface VisualDispatcherProps {
  visual?: VisualSpec;
}

export const VisualDispatcher: React.FC<VisualDispatcherProps> = ({ visual }) => {
  if (!visual || !visual.type) return null;

  switch (visual.type) {
    case 'svg':
    case 'dynamic-svg':
      return <DynamicSvgView data={visual.data as any} />;
    case 'balance-scale':
      return <BalanceScaleView data={visual.data as any} />;
    case 'fraction-model':
      return <FractionModelView data={visual.data as any} />;
    case 'tape-diagram':
      return <TapeDiagramView data={visual.data as any} />;
    case 'number-line':
      return <NumberLineView data={visual.data as any} />;
    case 'cer':
      return <CEROrganizerView data={visual.data as any} />;
    case 'variable-scale':
      return <VariableScaleView data={visual.data as any} />;
    default:
      return null;
  }
};
