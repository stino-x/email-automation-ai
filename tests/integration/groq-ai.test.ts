import { test, expect } from '@playwright/test';
import Groq from 'groq-sdk';

test.describe('Groq AI API Integration', () => {
  let groqClient: Groq;

  test.beforeAll(() => {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  });

  test('should connect to Groq API successfully', async () => {
    const response = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 10,
    });

    expect(response).toBeTruthy();
    expect(response.choices).toBeTruthy();
    expect(response.choices.length).toBeGreaterThan(0);
  });

  test('should generate email response', async () => {
    const emailContent = 'Can we schedule a meeting next week?';
    const senderName = 'John Doe';
    
    const prompt = `You are a professional email assistant. Reply to this email:
    
    From: ${senderName}
    Message: ${emailContent}
    
    Write a brief, professional response.`;

    const response = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 500,
      temperature: 0.7,
    });

    expect(response.choices[0].message.content).toBeTruthy();
    expect(response.choices[0].message.content!.length).toBeGreaterThan(10);
  });

  test('should include calendar events in prompt', async () => {
    const calendarEvents = [
      'Monday 10am-11am: Team Meeting',
      'Tuesday 2pm-3pm: Client Call',
      'Wednesday: All day unavailable'
    ];

    const prompt = `You are scheduling a meeting. Here are available times:
    
    Calendar:
    ${calendarEvents.join('\n')}
    
    Email: "Can we meet this week?"
    
    Suggest meeting times based on the calendar.`;

    const response = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 500,
    });

    const reply = response.choices[0].message.content!.toLowerCase();
    
    // Should mention at least one day from calendar
    const mentionsDays = ['monday', 'tuesday', 'wednesday'].some(day => 
      reply.includes(day)
    );
    expect(mentionsDays).toBe(true);
  });

  test('should handle template variables in prompt', async () => {
    const template = `You are an AI assistant. Reply to this email from {SENDER_NAME}:

Email Subject: {EMAIL_SUBJECT}
Email Content: {EMAIL_CONTENT}

Be professional and helpful.`;

    const filledPrompt = template
      .replace('{SENDER_NAME}', 'Jane Smith')
      .replace('{EMAIL_SUBJECT}', 'Question about product')
      .replace('{EMAIL_CONTENT}', 'What are your pricing options?');

    const response = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: filledPrompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 500,
    });

    expect(response.choices[0].message.content).toBeTruthy();
    expect(response.choices[0].message.content!.length).toBeGreaterThan(20);
  });

  test('should respect max_tokens limit', async () => {
    const response = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: 'Write a very long email' }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 50,
    });

    // Response should be truncated
    expect(response.choices[0].message.content!.split(' ').length).toBeLessThan(100);
  });

  test('should use different temperature settings', async () => {
    const prompt = 'Say hello';

    // Low temperature (more deterministic)
    const response1 = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 20,
      temperature: 0.1,
    });

    // High temperature (more creative)
    const response2 = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'mixtral-8x7b-32768',
      max_tokens: 20,
      temperature: 1.5,
    });

    expect(response1.choices[0].message.content).toBeTruthy();
    expect(response2.choices[0].message.content).toBeTruthy();
    
    // Responses should be different due to temperature
    expect(response1.choices[0].message.content).not.toBe(
      response2.choices[0].message.content
    );
  });

  test('should handle API rate limiting gracefully', async () => {
    const requests = [];
    
    // Make multiple rapid requests
    for (let i = 0; i < 5; i++) {
      requests.push(
        groqClient.chat.completions.create({
          messages: [{ role: 'user', content: `Test ${i}` }],
          model: 'mixtral-8x7b-32768',
          max_tokens: 10,
        })
      );
    }

    const results = await Promise.allSettled(requests);
    
    // At least some should succeed
    const succeeded = results.filter(r => r.status === 'fulfilled');
    expect(succeeded.length).toBeGreaterThan(0);
  });

  test('should generate contextual responses', async () => {
    const conversation = [
      { role: 'user' as const, content: 'Hello, I need help with my account.' },
      { role: 'assistant' as const, content: 'Hello! I\'d be happy to help. What seems to be the issue?' },
      { role: 'user' as const, content: 'I forgot my password.' },
    ];

    const response = await groqClient.chat.completions.create({
      messages: conversation,
      model: 'mixtral-8x7b-32768',
      max_tokens: 500,
    });

    const reply = response.choices[0].message.content!.toLowerCase();
    
    // Should mention password reset
    expect(reply.includes('password') || reply.includes('reset')).toBe(true);
  });
});
