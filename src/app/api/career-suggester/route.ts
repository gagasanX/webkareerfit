import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { OpenAI } from 'openai';
import axios from 'axios';
import { Redis } from '@upstash/redis';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const BREVO_API_KEY   = process.env.BREVO_API_KEY;
const BREVO_LIST_ID   = process.env.BREVO_LIST_ID_SUGGESTER;

// ------------------------------------------------------------------
//  ZOD schemas
// ------------------------------------------------------------------
const baseSchema = z.object({
  email:        z.string().email('Invalid email format'),
  superpower:   z.enum(['A', 'B', 'C', 'D', 'E']),
  userType:     z.enum(['professional', 'graduate']),
  turnstileToken: z.string().min(1, 'Turnstile token required'),
  optInMarketing: z.boolean().optional(),
});

const professionalSchema = baseSchema.extend({
  userType:        z.literal('professional'),
  currentPosition: z.string().min(2, 'Current position required'),
});

const graduateSchema = baseSchema.extend({
  userType:     z.literal('graduate'),
  fieldOfStudy: z.string().min(2, 'Field of study required'),
});

const requestSchema = z.discriminatedUnion('userType', [
  professionalSchema,
  graduateSchema,
]);

// ------------------------------------------------------------------
//  Helper: extract client IP
// ------------------------------------------------------------------
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// ------------------------------------------------------------------
//  Main handler
// ------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);

    /* ---------- IP rate-limit (10 req / 10 min) ---------- */
    const ipKey = `rate_limit_ip:${clientIp}`;
    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) await redis.expire(ipKey, 600);
    if (ipCount > 10) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    /* ---------- request body validation ---------- */
    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    /* ---------- Turnstile verification ---------- */
    const { turnstileToken, ...payload } = validation.data;
    const formData = new FormData();
    formData.append('secret', process.env.TURNSTILE_SECRET_KEY!);
    formData.append('response', turnstileToken);
    formData.append('remoteip', clientIp);

    const tfResp = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    );
    const tfResult = await tfResp.json();
    if (!tfResult.success) {
      return NextResponse.json({ error: 'Bot verification failed' }, { status: 403 });
    }

    /* ---------- destructure payload ---------- */
    const { email, superpower, userType, optInMarketing } = payload;
    const userInput =
      userType === 'professional'
        ? payload.currentPosition
        : payload.fieldOfStudy;
    const level = userType === 'professional' ? 'mid' : 'entry';

    /* ---------- email rate-limit (2 / 30 days) ---------- */
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const emailCount = await prisma.freeSuggestionSubmission.count({
      where: { email, createdat: { gte: thirtyDaysAgo } },
    });
    if (emailCount >= 2) {
      return NextResponse.json(
        { error: 'You have reached the free limit of 2 suggestions per month.' },
        { status: 429 }
      );
    }

    /* ---------- fetch career suggestions ---------- */
    const suggestions = await prisma.careerSuggestion.findMany({
      where: { superpowercode: superpower, level },
      take: 6,
    });
    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: 'No suggestions found for your criteria.' },
        { status: 404 }
      );
    }

    /* ---------- build AI prompt ---------- */
    const jobTitles = suggestions
      .map((j) => j.jobtitle ?? '')
      .join(', ');
    const prompt =
      userType === 'professional'
        ? `As a career advisor, write a short, encouraging paragraph (3-4 sentences) for someone whose current job is "${userInput}". Their self-identified professional strength is "${superpower}". Briefly introduce these potential career advancements: ${jobTitles}. Keep the tone positive and actionable.`
        : `As a career advisor for fresh graduates, write a short, encouraging paragraph (3-4 sentences) for someone graduating in "${userInput}". Their natural strength is "${superpower}". Briefly introduce these potential first jobs to explore: ${jobTitles}. Keep the tone optimistic and focused on starting a successful career.`;

    const aiResp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.7,
    });
    const summary = aiResp.choices[0].message.content;

    /* ---------- optional Brevo opt-in ---------- */
    if (optInMarketing && BREVO_API_KEY && BREVO_LIST_ID) {
      try {
        await axios.post(
          'https://api.brevo.com/v3/contacts',
          {
            email,
            listIds: [Number(BREVO_LIST_ID)],
            attributes: {
              USER_TYPE: userType,
              SUPERPOWER: superpower,
              SOURCE: 'career_suggester',
            },
          },
          {
            headers: {
              'api-key': BREVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (err) {
        console.error('Brevo API error:', err);
      }
    }

    /* ---------- log submission ---------- */
    await prisma.freeSuggestionSubmission.create({
      data: {
        email,
        userip: clientIp,
        usertype: userType,
        userinput: userInput,
        superpowercode: superpower,
      },
    });

    /* ---------- respond to client ---------- */
    return NextResponse.json({ summary, suggestions });
  } catch (err) {
    console.error('Career Suggester Error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}