import Groq from 'groq-sdk';
import type { AIProvider, RecommendationRequest, RecommendationResult } from './AIProvider.js';
import { RuleBasedProvider } from './RuleBasedProvider.js';
import { env } from '../../env.js';

const fallback = new RuleBasedProvider();

export class GroqProvider implements AIProvider {
  name = 'Groq (openai/gpt-oss-20b)';
  private client: Groq;

  constructor() {
    this.client = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  async recommend(req: RecommendationRequest): Promise<RecommendationResult> {
    const ruleBased = await fallback.recommend(req); // ground truth for "which option wins"

    const prompt = `You are the recommendation layer of a Chennai smart transportation app.
Origin: ${req.from}
Destination: ${req.to}
User priority: ${req.priority}
Candidate transport options (computed, do not change the numbers):
${req.candidates.map((c) => `- ${c.label} [${c.category}]: ${c.durationMin.toFixed(0)} min, ${c.distanceKm.toFixed(1)} km, traffic=${c.trafficCondition ?? 'n/a'}, emissions=${c.co2Label}, safety=${c.safetyScore}/100, fare=${c.fareRupees ?? 'n/a'}, overallScore=${c.overallScore}/100`).join('\n')}

The recommended option (already decided by the scoring engine) is: "${ruleBased.bestLabel}".
Write ONE short, factual sentence (under 20 words) explaining WHY this option is recommended,
referencing at most one concrete number above. Do not invent numbers not listed above. Do not
mention that you are an AI model. Output only the sentence, no preamble.`;

    try {
      const completion = await this.client.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 300,
        reasoning_effort: 'low',
      } as any);
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) throw new Error('empty completion');
      return { bestLabel: ruleBased.bestLabel, explanation: text, isAiGenerated: true };
    } catch (err) {
      // Live LLM call failed (rate limit, outage, etc.) -- degrade gracefully, don't fabricate.
      console.error('Groq call failed:', err);
      return { ...ruleBased, explanation: `${ruleBased.explanation} (AI narrative unavailable, showing rule-based explanation.)` };
    }
  }
}
