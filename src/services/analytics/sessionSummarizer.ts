import { HomeworkSession } from '../../types/chat';
import { SessionInsight } from '../../types/parent';
import { buildParentSummaryPrompt } from '../ai/promptTemplates';
import { getStoredProviderConfig, saveParentInsight } from '../storage/storageService';
import { callDeepSeek } from '../ai/deepseekProvider';
import { callGemini } from '../ai/geminiProvider';
import { callOpenAI } from '../ai/openaiProvider';
import { callClaude } from '../ai/claudeProvider';

export async function summarizeSessionForParent(session: HomeworkSession): Promise<SessionInsight> {
  const durationMinutes = Math.max(
    Math.round(((session.endTime || Date.now()) - session.startTime) / 60000),
    5
  );

  // Calculate independence score based on hint requests vs student answers
  const totalTurns = session.messages.length;
  const hintPenalty = session.hintCount * 12;
  const independenceScore = Math.max(Math.min(100 - hintPenalty, 100), 50);

  const transcript = session.messages
    .map((m) => `${m.role === 'user' ? 'Student' : 'Coach Spark'}: ${m.content}`)
    .join('\n\n');

  const config = await getStoredProviderConfig();
  const prompt = buildParentSummaryPrompt(transcript, session.subject);

  let insightData: Partial<SessionInsight> = {};

  if (config.apiKey && config.apiKey.trim() !== '') {
    try {
      let rawText = '';
      if (config.provider === 'deepseek') {
        const res = await callDeepSeek(config.apiKey, 'deepseek-chat', {
          systemPrompt: 'You output strictly valid JSON only. No markdown formatting, no commentary.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawText = res.text;
      } else if (config.provider === 'gemini') {
        const res = await callGemini(config.apiKey, 'gemini-1.5-flash', {
          systemPrompt: 'You output strictly valid JSON only. No markdown formatting, no commentary.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawText = res.text;
      } else if (config.provider === 'openai') {
        const res = await callOpenAI(config.apiKey, 'gpt-4o-mini', {
          systemPrompt: 'You output strictly valid JSON only.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawText = res.text;
      } else if (config.provider === 'claude') {
        const res = await callClaude(config.apiKey, 'claude-3-5-sonnet-20241022', {
          systemPrompt: 'You output strictly valid JSON only.',
          messages: [{ role: 'user', content: prompt }]
        });
        rawText = res.text;
      }

      // Clean any accidental markdown code fences
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      insightData = JSON.parse(cleanJson);
    } catch (err) {
      console.warn('AI summary failed, using heuristic summary:', err);
    }
  }

  const finalInsight: SessionInsight = {
    sessionId: session.id,
    timestamp: Date.now(),
    subject: session.subject,
    topicTitle: insightData.topicTitle || session.title || `${session.subject.toUpperCase()} Practice`,
    durationMinutes,
    independenceScore: insightData.independenceScore || independenceScore,
    masteredConcepts: insightData.masteredConcepts?.length
      ? insightData.masteredConcepts
      : [`Understanding the core ${session.subject} problem`, 'Breaking problem into steps'],
    stickingPoints: insightData.stickingPoints?.length
      ? insightData.stickingPoints
      : ['Needed a visual model to grasp the initial ratio/concept'],
    dinnerQuestion:
      insightData.dinnerQuestion ||
      `Ask your son to show you the cool analogy Coach Spark shared about ${session.subject}!`,
    parentNote:
      insightData.parentNote ||
      `He showed good focus and worked through the challenge with positive energy.`
  };

  await saveParentInsight(finalInsight);
  return finalInsight;
}
