// lib/openai.ts
import { OpenAI } from 'openai';

// Export a function that creates a new instance each time
// This avoids stale connections in serverless environments
export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  return new OpenAI({
    apiKey,
    // Add timeout to prevent hanging connections
    timeout: 30000, // 30 seconds
  });
}