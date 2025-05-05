// src/lib/openai.ts
import { OpenAI } from 'openai';

// Create and export OpenAI instance
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: 15000,
  maxRetries: 2,
});

// Helper functions
export function getOpenAIInstance() {
  return openai;
}

export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && 
         process.env.OPENAI_API_KEY.startsWith('sk-');
}