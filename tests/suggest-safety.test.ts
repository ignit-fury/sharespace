// Run: node tests/suggest-safety.test.ts   (Node 22.18+ strips the types)
// Groq is mocked, so no API key or network is needed.
import assert from 'node:assert/strict';
import { POST, cleanSuggestion, parseInput } from '../api/suggest-safety.ts';

// Input validation at the trust boundary.
assert.equal(parseInput(null), 'Send a JSON body.');
assert.equal(parseInput({ name: '', category: 'Electronics' }), 'Enter the resource name first.');
assert.equal(parseInput({ name: 'Iron', category: 'Weapons' }), 'Pick a valid category.');
const ok = parseInput({ name: '  Soldering Iron ', category: 'Electronics', description: 'x'.repeat(5000) });
assert.ok(typeof ok === 'object' && ok.name === 'Soldering Iron' && ok.description!.length === 600);

// Reply cleaning: strips numbering, drops non-strings, caps length and count, tolerates stray text.
const cleaned = cleanSuggestion(
  'Sure! {"usageRules":["1. Rest the iron in its holder", 5, "- Tin the tip"],"safetyInstructions":["Tip is very hot"],' +
    `"returnChecklist":${JSON.stringify(Array.from({ length: 10 }, (_, i) => `Check ${i}`))}} thanks`,
);
assert.deepEqual(cleaned?.usageRules, ['Rest the iron in its holder', 'Tin the tip']);
assert.equal(cleaned?.returnChecklist.length, 6);
assert.equal(cleanSuggestion('not json'), null);
assert.equal(cleanSuggestion('{"usageRules":[],"returnChecklist":[]}'), null);

// Full handler with Groq mocked.
const g = globalThis as unknown as { process: { env: Record<string, string | undefined> }; fetch: typeof fetch };
const req = (body: unknown) => new Request('http://x/api/suggest-safety', { method: 'POST', body: JSON.stringify(body) });

delete g.process.env.GROQ_API_KEY;
assert.equal((await POST(req({ name: 'Iron', category: 'Electronics' }))).status, 503);

g.process.env.GROQ_API_KEY = 'test-key';
let sent: { auth?: string; body?: { model: string; messages: { content: string }[] } } = {};
g.fetch = (async (_url: string, init: RequestInit) => {
  sent = { auth: (init.headers as Record<string, string>).authorization, body: JSON.parse(String(init.body)) };
  const content = JSON.stringify({ usageRules: ['Use the holder'], safetyInstructions: ['Hot tip'], returnChecklist: ['Switch off'] });
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}) as typeof fetch;
const res = await POST(req({ name: 'Soldering Iron', category: 'Electronics' }));
assert.equal(res.status, 200);
assert.deepEqual(await res.json(), { usageRules: ['Use the holder'], safetyInstructions: ['Hot tip'], returnChecklist: ['Switch off'] });
assert.equal(sent.auth, 'Bearer test-key');
assert.ok(sent.body!.messages[1].content.includes('Soldering Iron'));

// JSON-mode 400 is retried once without JSON mode.
let calls: boolean[] = [];
g.fetch = (async (_url: string, init: RequestInit) => {
  const jsonMode = 'response_format' in JSON.parse(String(init.body));
  calls.push(jsonMode);
  if (jsonMode) return new Response('{"error":{"code":"json_validate_failed"}}', { status: 400 });
  const content = 'Here you go: {"usageRules":["Use the holder"],"safetyInstructions":[],"returnChecklist":["Switch off"]}';
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}) as typeof fetch;
const retried = await POST(req({ name: 'Iron', category: 'Electronics' }));
assert.equal(retried.status, 200);
assert.deepEqual(calls, [true, false]);

g.fetch = (async () => new Response('{"error":{"message":"secret detail"}}', { status: 401 })) as typeof fetch;
const failed = await POST(req({ name: 'Iron', category: 'Electronics' }));
assert.equal(failed.status, 502);
assert.ok(!(await failed.text()).includes('secret detail'));

console.log('suggest-safety: all checks passed');
