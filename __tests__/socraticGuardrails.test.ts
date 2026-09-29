import { describe, test, expect } from '@jest/globals';
import { validateSocraticResponse } from '../src/utils/socraticValidator';

describe('Socratic Guardrails & Output Validator', () => {
  test('allows safe guiding responses with questions', () => {
    const safeOutput =
      'What is happening to x in this equation? If we have +5, what is the inverse operation to isolate x?';
    const result = validateSocraticResponse(safeOutput);

    expect(result.isSafe).toBe(true);
    expect(result.sanitizedText).toBe(safeOutput);
  });

  test('intercepts "the answer is..." direct leakages', () => {
    const leakyOutput =
      'Great job trying! The answer is 4. Now write that on your paper.';
    const result = validateSocraticResponse(leakyOutput);

    expect(result.isSafe).toBe(false);
    expect(result.violationReason).toBeDefined();
    expect(result.sanitizedText).not.toContain('The answer is 4');
    expect(result.sanitizedText).toContain('Before we lock in any final answer');
  });

  test('intercepts algebraic variable assignment leaks like "therefore, x = 10"', () => {
    const leakyAlgebra = 'We subtract 15 from both sides, therefore, x = 10.';
    const result = validateSocraticResponse(leakyAlgebra);

    expect(result.isSafe).toBe(false);
    expect(result.sanitizedText).not.toContain('x = 10');
  });

  test('intercepts "the correct choice is option B"', () => {
    const leakyChoice = 'Think about Roman emperors. The correct choice is option B.';
    const result = validateSocraticResponse(leakyChoice);

    expect(result.isSafe).toBe(false);
    expect(result.sanitizedText).not.toContain('option B');
  });
});
