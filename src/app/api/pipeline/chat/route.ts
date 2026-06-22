import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an expert Instagram content planner for small businesses. You speak Spanish (neutral Latin American).

Your job is to guide the user step-by-step to plan 30 days of Instagram content.

FLOW:
1. Ask about their business (name, type, location, services)
2. Ask about their ideal customer (age, needs, pain points)
3. Ask about their brand (colors, tone, style, existing photos)
4. Suggest 5 content pillars specific to their business
5. Get approval on pillars
6. Generate the full 30-day calendar with: day number, date, content type (carousel/reel/post), pillar, hook, caption draft, CTA, hashtags
7. Suggest a campaign folder name

RULES:
- Be conversational and friendly
- Explain each step simply — the user may know nothing about marketing
- Never invent services or features the user hasn't confirmed
- Use the format: 12 carousels, 9 reels, 9 simple posts across 30 days
- Distribute pillars evenly (6 pieces each)
- Hooks must be under 12 words, punchy, no emojis
- CTAs from a rotating set (WhatsApp, save post, tag someone, link in bio)
- When the plan is ready, output a JSON block wrapped in \`\`\`json ... \`\`\` with the full calendar

FOLDER NAMING:
Suggest: {business_name}_{start_date}_al_{end_date}
Example: Hotel_MPV_2026-06-21_al_2026-07-20

When you output the final plan JSON, use this structure:
{
  "campaign": {
    "name": "string",
    "folderName": "string",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "model": "model_id_used",
    "totalPieces": 30,
    "days": [
      {
        "day": 1,
        "date": "YYYY-MM-DD",
        "type": "carousel|reel|post",
        "pillar": "P1",
        "hook": "string",
        "caption": "string",
        "cta": "string",
        "hashtags": "string",
        "status": "pending",
        "photoSuggestion": "description of what real photo to use"
      }
    ]
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const { messages, model } = await req.json();

    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'system' ? 'assistant' : m.role,
        content: m.content,
      })),
    ];

    const isGemini = model?.startsWith('gemini');
    const isOpenAI = model?.startsWith('gpt') || model?.startsWith('claude');

    let reply = '';
    let campaign = null;

    if (isGemini) {
      const geminiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return NextResponse.json(
          { error: 'GOOGLE_API_KEY not configured. Add it to .env file.' },
          { status: 400 }
        );
      }

      const geminiModel = model || 'gemini-2.5-flash';
      const geminiMessages = apiMessages.map((m) => ({
        role: m.role === 'system' ? 'user' : m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 32768,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      const data = await res.json();
      reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No se pudo generar respuesta.';
    } else {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY not configured' },
          { status: 400 }
        );
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4.1-mini',
          messages: apiMessages,
          temperature: 0.8,
          max_tokens: 8192,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: err }, { status: res.status });
      }

      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || 'No se pudo generar respuesta.';
    }

    const jsonMatch = reply.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.campaign) {
          campaign = {
            ...parsed.campaign,
            id: `campaign_${Date.now()}`,
            status: 'planning',
            published: 0,
            model: model,
            createdAt: new Date().toISOString(),
          };
        }
      } catch {
        // JSON parse failed — no campaign extracted, reply still sent
      }
    }

    return NextResponse.json({ reply, campaign });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    );
  }
}
