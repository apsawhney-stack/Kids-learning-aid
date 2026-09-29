export type Subject = 'math' | 'english' | 'science' | 'history';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface VisualSpec {
  type:
    | 'svg'
    | 'dynamic-svg'
    | 'balance-scale'
    | 'fraction-model'
    | 'tape-diagram'
    | 'number-line'
    | 'cer'
    | 'variable-scale'
    | 'timeline';
  title?: string;
  data: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  imageUrl?: string;
  visual?: VisualSpec;
  isHint?: boolean;
  hintLevel?: number;
}

export interface HomeworkSession {
  id: string;
  subject: Subject;
  title: string;
  problemImageUri?: string;
  problemDescription?: string;
  messages: ChatMessage[];
  startTime: number;
  endTime?: number;
  hintCount: number;
  isCompleted: boolean;
  xpEarned: number;
  badgesUnlocked?: string[];
}
