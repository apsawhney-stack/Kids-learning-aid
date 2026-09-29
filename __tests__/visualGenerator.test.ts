import { describe, test, expect } from '@jest/globals';
import { extractVisualFromResponse } from '../src/utils/socraticValidator';

describe('Visual Model Tag Parser', () => {
  test('parses tape-diagram visual tag correctly', () => {
    const rawAiOutput = `Check out this visual to see the ratio chunks:
<visual type="tape-diagram" data={"title":"Boys to Girls","parts":[{"label":"Boys","count":3},{"label":"Girls","count":4}]} />
How many chunks of boys do you count?`;

    const { cleanText, visual } = extractVisualFromResponse(rawAiOutput);

    expect(cleanText).not.toContain('<visual');
    expect(cleanText).toContain('Check out this visual to see the ratio chunks:');
    expect(cleanText).toContain('How many chunks of boys do you count?');
    expect(visual).toBeDefined();
    expect(visual?.type).toBe('tape-diagram');
    expect(visual?.data.title).toBe('Boys to Girls');
    expect(visual?.data.parts.length).toBe(2);
  });

  test('parses number-line visual tag correctly', () => {
    const rawAiOutput = `Here is our number line:
<visual type="number-line" data={"min":-5,"max":5,"jumps":[{"from":-2,"to":3,"label":"+5"}]} />
Where did we land?`;

    const { cleanText, visual } = extractVisualFromResponse(rawAiOutput);

    expect(visual?.type).toBe('number-line');
    expect(visual?.data.jumps[0].from).toBe(-2);
    expect(visual?.data.jumps[0].to).toBe(3);
    expect(cleanText).toContain('Where did we land?');
  });

  test('parses dynamic <visual-svg> tag for science lessons correctly', () => {
    const rawAiOutput = `Let's examine how energy flows in this ecosystem:
<visual-svg title="Desert Food Web">
<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
  <rect width="320" height="200" fill="#FEF3C7" />
  <circle cx="60" cy="100" r="25" fill="#10B981" />
  <text x="60" y="105">Cactus</text>
  <circle cx="160" cy="100" r="25" fill="#F59E0B" />
  <text x="160" y="105">Lizard</text>
  <line x1="85" y1="100" x2="135" y2="100" stroke="#1E293B" stroke-width="2" />
</svg>
</visual-svg>
Who is the primary producer in this desert web?`;

    const { cleanText, visual } = extractVisualFromResponse(rawAiOutput);

    expect(cleanText).not.toContain('<visual-svg');
    expect(cleanText).not.toContain('</visual-svg>');
    expect(cleanText).toContain('Who is the primary producer in this desert web?');
    expect(visual).toBeDefined();
    expect(visual?.type).toBe('svg');
    expect(visual?.title).toBe('Desert Food Web');
    expect(visual?.data.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(visual?.data.svg).toContain('viewBox="0 0 320 200"');
    expect(visual?.data.svg).toContain('Cactus');
  });

  test('parses <visual type="balance-scale"> for algebra equations', () => {
    const rawAiOutput = `Check out the equation balance scale:
<visual type="balance-scale" data={"title":"Balance the Equation","equation":"2x + 4 = 10","leftItems":[{"label":"x","count":2},{"value":4}],"rightItems":[{"value":10}]} />
What happens if we take 4 off both sides?`;

    const { cleanText, visual } = extractVisualFromResponse(rawAiOutput);

    expect(cleanText).not.toContain('<visual');
    expect(visual?.type).toBe('balance-scale');
    expect(visual?.data.equation).toBe('2x + 4 = 10');
    expect(visual?.data.leftItems.length).toBe(2);
    expect(visual?.data.rightItems[0].value).toBe(10);
  });

  test('parses <visual type="fraction-model"> for fraction bars and circles', () => {
    const rawAiOutput = `Here is our fraction model:
<visual type="fraction-model" data={"title":"Visualizing 3/4","shape":"bar","totalParts":4,"shadedParts":3,"label":"3/4"} />
How many parts are shaded?`;

    const { cleanText, visual } = extractVisualFromResponse(rawAiOutput);

    expect(visual?.type).toBe('fraction-model');
    expect(visual?.data.shape).toBe('bar');
    expect(visual?.data.totalParts).toBe(4);
    expect(visual?.data.shadedParts).toBe(3);
  });

  test('handles output without visual tag gracefully', () => {
    const normalText = 'Awesome start! What is the first step you want to try?';
    const { cleanText, visual } = extractVisualFromResponse(normalText);

    expect(cleanText).toBe(normalText);
    expect(visual).toBeUndefined();
  });
});
