import { describe, test, expect } from '@jest/globals';
import {
  buildSocraticSystemPrompt,
  buildActionPrompt,
  buildParentSummaryPrompt
} from '../src/services/ai/promptTemplates';
import { StudentProfile } from '../src/types/provider';

describe('Socratic Prompt Engine', () => {
  const mockProfile: StudentProfile = {
    name: 'Alex',
    grade: '6th grade',
    interests: ['Basketball & Sports', 'Minecraft & Roblox', 'Marvel Superheroes']
  };

  test('injects strict zero-answer guardrail and student name', () => {
    const prompt = buildSocraticSystemPrompt('math', mockProfile, 1);

    expect(prompt).toContain('NEVER REVEAL THE FINAL ANSWER');
    expect(prompt).toContain('Alex');
    expect(prompt).toContain('6th grader');
    expect(prompt).toContain('MATH');
    expect(prompt).toContain('Minecraft');
    expect(prompt).toContain('Basketball');
  });

  test('builds analogy prompt on request', () => {
    const analogyPrompt = buildActionPrompt('analogy');
    expect(analogyPrompt).toContain('analogy');
  });

  test('builds visual model request prompt', () => {
    const visualPrompt = buildActionPrompt('visual');
    expect(visualPrompt).toContain('visual model');
  });

  test('constructs parent summary prompt with JSON schema', () => {
    const transcript = 'Student: How do I do ratios?\nCoach: What is a ratio comparing?';
    const parentPrompt = buildParentSummaryPrompt(transcript, 'math');

    expect(parentPrompt).toContain('strictly valid JSON object');
    expect(parentPrompt).toContain('"topicTitle"');
    expect(parentPrompt).toContain('"independenceScore"');
    expect(parentPrompt).toContain('"dinnerQuestion"');
  });
});
