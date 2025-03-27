import OpenAI from 'openai';

// Create an OpenAI client with your API key
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Optional - create a function to check if OpenAI integration is enabled
export function isOpenAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}