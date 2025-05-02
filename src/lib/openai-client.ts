import OpenAI from 'openai';

// Create OpenAI client with better error handling
export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set in environment variables');
    throw new Error('OpenAI API key is missing');
  }
  
  return new OpenAI({
    apiKey,
    timeout: 60000, // 60 second timeout
    maxRetries: 3,  // More retries for reliability
  });
}

// Test that the client can be created
export async function testOpenAIConnection() {
  try {
    const openai = createOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Test connection' }],
      max_tokens: 5
    });
    
    return {
      success: true,
      model: response.model,
      content: response.choices[0]?.message?.content
    };
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}