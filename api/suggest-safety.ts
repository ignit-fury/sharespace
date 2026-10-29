/**
 * Vercel serverless function: drafts handling rules, safety precautions and a
 * return checklist for a new listing using the Groq API.
 * The GROQ_API_KEY stays on the server; the browser only sees the suggestions.
 * Output is a draft: the owner edits it and Campus Operations reviews it before publication.
 */
declare const process: { env: Record<string, string | undefined> };

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';
const MAX_ITEMS = 6;
const MAX_ITEM_CHARS = 180;

export interface SuggestInput {
  name: string;
  category: string;
  model?: string;
  description?: string;
}

export interface Suggestion {
  usageRules: string[];
  safetyInstructions: string[];
  returnChecklist: string[];
}

const CATEGORIES = ['Electronics', 'Photography', 'Fabrication', 'AV Equipment', 'Meeting Spaces', 'Computing'];

/** Validates untrusted input from the browser; returns an error message or the cleaned input. */
export function parseInput(body: unknown): SuggestInput | string {
  if (!body || typeof body !== 'object') return 'Send a JSON body.';
  const b = body as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = text(b.name, 80);
  const category = text(b.category, 40);
  if (!name) return 'Enter the resource name first.';
  if (!CATEGORIES.includes(category)) return 'Pick a valid category.';
  return { name, category, model: text(b.model, 80), description: text(b.description, 600) };
}

export function buildMessages(input: SuggestInput) {
  const system = [
    'You help a university office write rules for lending shared equipment and spaces to students.',
    'Reply with JSON only, in this exact shape:',
    '{"usageRules": string[], "safetyInstructions": string[], "returnChecklist": string[]}',
    `Each array has at most ${MAX_ITEMS} short, specific, imperative sentences (under 25 words each).`,
    'usageRules: how to handle and care for the item, or decorum rules for a room or hall.',
    'safetyInstructions: only real risks of injury or of damaging the item (heat, electricity, lasers, moving parts, water, drops).',
    'Use an empty array for safetyInstructions when there is no real risk, for example meeting rooms and halls.',
    'returnChecklist: what the borrower must check or do before handing it back (parts present, clean, charged, switched off).',
    'Do not invent brand-specific numbers you are not sure of. No markdown, no numbering.',
  ].join('\n');
  const user = [
    `Name: ${input.name}`,
    input.model ? `Model: ${input.model}` : '',
    `Category: ${input.category}`,
    input.description ? `Description: ${input.description}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/** Turns the model's reply into clean, bounded string lists; never trusts its shape. */
export function cleanSuggestion(raw: string): Suggestion | null {
  let data: unknown;
  try {
    // Tolerate stray text around the JSON object.
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    data = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const list = (v: unknown) =>
    Array.isArray(v)
      ? v
          .filter((x): x is string => typeof x === 'string')
          .map((x) => x.replace(/^[\s\-*•\d.)]+/, '').trim().slice(0, MAX_ITEM_CHARS))
          .filter(Boolean)
          .slice(0, MAX_ITEMS)
      : [];
  const d = data as Record<string, unknown>;
  const out = { usageRules: list(d.usageRules), safetyInstructions: list(d.safetyInstructions), returnChecklist: list(d.returnChecklist) };
  return out.usageRules.length || out.returnChecklist.length ? out : null;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// shortcut: no rate limiting; anyone with the site URL can spend Groq quota. Add a limit (e.g. Vercel KV counter) before real use.
export async function POST(request: Request): Promise<Response> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return json(503, { error: 'The AI assistant is not configured on this server (missing GROQ_API_KEY).' });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Send a JSON body.' });
  }
  const input = parseInput(body);
  if (typeof input === 'string') return json(400, { error: input });

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const callGroq = (jsonMode: boolean) =>
    fetch(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: buildMessages(input),
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        temperature: 0.3,
        // Short lists need little reasoning; keeps each call well inside free-tier token limits.
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        max_completion_tokens: 1000,
      }),
      signal: AbortSignal.timeout(20_000),
    });

  let res: Response;
  try {
    res = await callGroq(true);
    // Groq answers 400 when JSON mode rejects the model's own output (json_validate_failed); retry once without it.
    if (res.status === 400) res = await callGroq(false);
  } catch {
    return json(502, { error: 'Could not reach the AI service. Try again, or write the rules by hand.' });
  }
  if (res.status === 429) {
    return json(429, { error: 'The AI assistant is busy (usage limit reached). Wait a minute and try again, or write the rules by hand.' });
  }
  if (!res.ok) {
    // Do not forward Groq's error body; it can echo request details.
    return json(502, { error: `The AI service returned an error (${res.status}). Try again, or write the rules by hand.` });
  }
  const data = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string } }[] } | null;
  const suggestion = cleanSuggestion(data?.choices?.[0]?.message?.content ?? '');
  if (!suggestion) return json(502, { error: 'The AI reply could not be read. Try again, or write the rules by hand.' });
  return json(200, suggestion);
}
