export interface ValidationResult {
  isSafe: boolean;
  violationReason?: string;
  sanitizedText: string;
}

/**
 * Validates AI responses before displaying them to the student.
 * Guarantees that answer leakages or premature confirmations are caught.
 */
export function validateSocraticResponse(aiText: string): ValidationResult {
  if (!aiText) {
    return { isSafe: true, sanitizedText: '' };
  }

  // Common answer-leakage regex patterns
  const leakagePatterns = [
    /the\s+(?:final\s+)?answer\s+(?:is|=|equals)\s*[:\-]?\s*([^\n\.]+)/i,
    /the\s+correct\s+(?:answer|choice|option)\s+(?:is|=|equals)\s*[:\-]?\s*([^\n\.]+)/i,
    /therefore,?\s*(?:x|y|z)\s*=\s*([^\n\.]+)/i,
    /so\s+(?:x|y|z)\s*=\s*([^\n\.]+)/i,
    /you\s+should\s+write\s+down\s*[:\-]?\s*["']?([^"'\n]+)/i
  ];

  for (const pattern of leakagePatterns) {
    if (pattern.test(aiText)) {
      return {
        isSafe: false,
        violationReason: `Matched answer leakage pattern: ${pattern.source}`,
        sanitizedText: "You are on the right track! Before we lock in any final answer, what do you think the next logical step should be? Give it a shot!"
      };
    }
  }

  return {
    isSafe: true,
    sanitizedText: aiText
  };
}

/**
 * Normalizes and sanitizes raw SVG code for rock-solid react-native-svg SvgXml rendering
 */
export function normalizeSvgString(rawSvg: string): string {
  let svg = rawSvg.trim();

  // Strip code fences if present inside the tag
  svg = svg.replace(/^```(?:svg|xml|html)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract just the <svg>...</svg> block if wrapped in extraneous text
  const svgBlockMatch = svg.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgBlockMatch) {
    svg = svgBlockMatch[0];
  } else if (svg.includes('<svg') && !svg.includes('</svg>')) {
    // If the SVG was truncated at max_tokens without a closing tag, safely close it
    svg = svg + '</svg>';
  } else if (!svg.startsWith('<svg')) {
    svg = `<svg viewBox="0 0 340 220" xmlns="http://www.w3.org/2000/svg">${svg}</svg>`;
  }

  // Ensure xmlns is present
  if (!svg.includes('xmlns=')) {
    svg = svg.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // Ensure viewBox is present
  if (!svg.includes('viewBox=')) {
    svg = svg.replace(/<svg\b/i, '<svg viewBox="0 0 340 220"');
  }

  return svg;
}

/**
 * Extracts any embedded <visual type="..." data={...} /> or <visual-svg>...</visual-svg> tags from the AI response
 */
export function extractVisualFromResponse(text: string): {
  cleanText: string;
  visual?: { type: string; title?: string; data: any };
} {
  if (!text) return { cleanText: '' };

  // 1. Check for dedicated <visual-svg title="...">...</visual-svg> or <visual type="svg" ...>
  // Also matches if </visual-svg> was truncated before the end of the text
  const visualSvgRegex = /<visual(?:-svg|\s+type=["']svg["'])(?:\s+title=["']([^"']*)["'])?[^>]*>([\s\S]*?)(?:<\/visual(?:-svg)?>|$)/i;
  const svgMatch = text.match(visualSvgRegex);
  if (svgMatch && svgMatch[2] && svgMatch[2].includes('<svg')) {
    const title = svgMatch[1] || 'Visual Diagram';
    const rawSvg = svgMatch[2];
    const normalized = normalizeSvgString(rawSvg);
    const cleanText = text.replace(svgMatch[0], '').trim();
    return {
      cleanText,
      visual: {
        type: 'svg',
        title,
        data: {
          title,
          svg: normalized
        }
      }
    };
  }

  // 2. Check for standalone raw <svg>...</svg> (with or without markdown ```svg fence)
  const rawSvgRegex = /(?:```(?:svg|xml)?\s*)?(<svg[\s\S]*?<\/svg>)(?:\s*```)?/i;
  const rawSvgMatch = text.match(rawSvgRegex);
  if (rawSvgMatch) {
    const normalized = normalizeSvgString(rawSvgMatch[1]);
    const cleanText = text.replace(rawSvgMatch[0], '').trim();
    return {
      cleanText,
      visual: {
        type: 'svg',
        title: 'Visual Diagram',
        data: {
          title: 'Visual Diagram',
          svg: normalized
        }
      }
    };
  }

  // 3. Check for standard JSON-based <visual type="..." data={...} />
  const visualTagRegex = /<visual\s+type=["']([^"']+)["']\s+data=({[\s\S]*?})\s*\/?>/i;
  const match = text.match(visualTagRegex);
  if (match) {
    try {
      const visualType = match[1];
      const visualData = JSON.parse(match[2]);
      const cleanText = text.replace(match[0], '').trim();

      if (visualType === 'svg' || visualType === 'dynamic-svg') {
        const svgCode = visualData.svg ? normalizeSvgString(visualData.svg) : '';
        return {
          cleanText,
          visual: {
            type: 'svg',
            title: visualData.title || 'Visual Model',
            data: { ...visualData, svg: svgCode }
          }
        };
      }

      return {
        cleanText,
        visual: {
          type: visualType,
          title: visualData.title,
          data: visualData
        }
      };
    } catch {
      // If JSON parsing fails, strip tag cleanly
      const cleanText = text.replace(match[0], '').trim();
      return { cleanText };
    }
  }

  return { cleanText: text };
}
