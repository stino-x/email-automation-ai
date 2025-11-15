import Groq from 'groq-sdk';
import type { PromptVariables } from '@/types';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || ''
});

const MODEL = 'llama-3.1-70b-versatile';

export async function generateAIResponse(
  promptTemplate: string,
  variables: PromptVariables
): Promise<{ response: string; tokensUsed: number }> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  // Replace variables in prompt template
  let prompt = promptTemplate;
  Object.entries(variables).forEach(([key, value]) => {
    prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), value);
  });

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful email assistant. Generate professional, concise email responses based on the provided context.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: MODEL,
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      response,
      tokensUsed
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Groq API error: ${errorMessage}`);
  }
}

export async function validateGroqApiKey(apiKey: string): Promise<boolean> {
  try {
    const testGroq = new Groq({ apiKey });
    await testGroq.chat.completions.create({
      messages: [{ role: 'user', content: 'test' }],
      model: MODEL,
      max_tokens: 5
    });
    return true;
  } catch {
    return false;
  }
}

export function shouldFetchCalendar(promptTemplate: string): boolean {
  const calendarKeywords = [
    'calendar',
    'availability',
    'schedule',
    'free',
    'busy',
    'available',
    'meeting',
    'appointment'
  ];

  const lowerPrompt = promptTemplate.toLowerCase();
  return calendarKeywords.some(keyword => lowerPrompt.includes(keyword));
}

export function estimateTokenUsage(promptTemplate: string, emailContent: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  const totalChars = promptTemplate.length + emailContent.length;
  return Math.ceil(totalChars / 4) + 500; // Add buffer for response
}
