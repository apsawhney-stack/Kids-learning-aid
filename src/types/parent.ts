import { Subject } from './chat';

export interface SessionInsight {
  sessionId: string;
  timestamp: number;
  subject: Subject;
  topicTitle: string;
  durationMinutes: number;
  independenceScore: number; // 0-100%
  masteredConcepts: string[];
  stickingPoints: string[];
  dinnerQuestion: string;
  parentNote?: string;
}

export interface ParentDashboardData {
  totalSessions: number;
  totalTimeMinutes: number;
  averageIndependence: number;
  recentInsights: SessionInsight[];
}
