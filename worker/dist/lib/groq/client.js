"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIResponse = generateAIResponse;
exports.validateGroqApiKey = validateGroqApiKey;
exports.shouldFetchCalendar = shouldFetchCalendar;
exports.estimateTokenUsage = estimateTokenUsage;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const groq = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY || ''
});
const MODEL = 'llama-3.1-70b-versatile';
async function generateAIResponse(promptTemplate, variables) {
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Groq API error: ${errorMessage}`);
    }
}
async function validateGroqApiKey(apiKey) {
    try {
        const testGroq = new groq_sdk_1.default({ apiKey });
        await testGroq.chat.completions.create({
            messages: [{ role: 'user', content: 'test' }],
            model: MODEL,
            max_tokens: 5
        });
        return true;
    }
    catch {
        return false;
    }
}
function shouldFetchCalendar(promptTemplate) {
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
function estimateTokenUsage(promptTemplate, emailContent) {
    // Rough estimate: 1 token ≈ 4 characters
    const totalChars = promptTemplate.length + emailContent.length;
    return Math.ceil(totalChars / 4) + 500; // Add buffer for response
}
