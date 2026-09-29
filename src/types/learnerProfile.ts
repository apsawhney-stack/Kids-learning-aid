import { Subject } from './chat';

export type PacingPreference = 'bite-sized' | 'standard' | 'challenge';
export type VisualPreference = 'diagrams-first' | 'step-by-step' | 'conceptual-first';
export type HintSensitivity = 'needs-quick-scaffolding' | 'prefers-self-discovery' | 'balanced';

export interface LearnerCognitiveProfile {
  studentName: string;
  grade: string;

  // Layer 2: Evolving Cognitive Habits
  pacingPreference: PacingPreference;
  visualPreference: VisualPreference;
  hintSensitivity: HintSensitivity;
  topAnalogies: string[];
  frustrationTriggers: string[];
  
  // Subject-specific knowledge map
  masteredConcepts: Record<Subject, string[]>;
  growthAreas: Record<Subject, string[]>;

  // Layer 4: Parent custom instructions
  parentTips: string[];

  // Telemetry metadata
  totalSessionsAnalyzed: number;
  lastUpdated: number;
}

export interface SessionHabitSignals {
  sessionId: string;
  subject: Subject;
  turnCount: number;
  hintLevelReached: number;
  averageResponseTimeSec?: number;
  visualsRenderedCount: number;
  frustrationCount: number;
  breakthroughDetected: boolean;
  analogiesUsed: string[];
}
