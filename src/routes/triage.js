const express = require('express');
const OpenAI = require('openai');
const { TriageInput, TriageOutput } = require('../llm/schema');
const { loadPrompt } = require('../llm/promptLoader');
const { extractJson } = require('../llm/parseJson');
const { quarantine } = require('../llm/quarantine');
const { createClient } = require('../llm/client');
const { withRetry } = require('../llm/retry');
const { logCall } = require('../llm/costLog');

async function ask(client, systemPrompt, text, repaired) {
  const startedAt = Date.now();
  const response = await withRetry(() => client.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify({ text }) }
    ]
  }));
  logCall({ promptVersion: PROMPT_VERSION, model: process.env.LLM_MODEL, usage: response.usage, durationMs: Date.now() - startedAt, repaired });
  return response.choices[0].message.content || '';
}

const router = express.Router();
const PROMPT_VERSION = 'triage-v1';
const STUB_RESPONSE = { category: 'other', urgency: 'low', confidence: 0.4, reason: 'Stub mode response - no model was called.' };
const systemPrompt = loadPrompt(PROMPT_VERSION);
const client = new OpenAI({ baseURL: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY });
let rawOutput = await ask(client, systemPrompt, input.data.text);
let checked = TriageOutput.safeParse(extractJson(rawOutput));
let repaired = false;

if (!checked.success) {
  repaired = true;
  const error = checked.error ? checked.error.issues.map((issue) => issue.message).join('; ') : 'No JSON object found';
  rawOutput = await ask(
    client,
    `${systemPrompt}\n\nYour previous answer was rejected for this reason: ${error}\nPrevious answer: ${rawOutput}\nReturn only corrected JSON matching the schema above.`,
    input.data.text
  );
  checked = TriageOutput.safeParse(extractJson(rawOutput));
}

if (!checked.success) {
  const error = checked.error ? checked.error.issues.map((issue) => issue.message).join('; ') : 'No JSON object found';
  quarantine({ input: input.data.text, promptVersion: PROMPT_VERSION, rawOutput, error });
  return res.status(422).json({ error: 'Model could not produce a valid response after one repair attempt' });
}
return res.status(200).json(checked.data);

router.post('/triage', async (req, res) => {
  const input = TriageInput.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    return res.status(400).json({ error: `Invalid input: ${issue.path.join('.') || 'body'} - ${issue.message}` });
  }
  if (process.env.LLM_ENABLED === 'false') {
  return res.status(503).json({
    error: 'AI triage is temporarily disabled',
    fallback: { category: 'other', urgency: 'low', confidence: 0, reason: 'AI triage is temporarily unavailable.' }
  });
  }
  if (process.env.LLM_STUB === '1') return res.json(TriageOutput.parse(STUB_RESPONSE));

  const client = new OpenAI({ baseURL: process.env.LLM_BASE_URL, apiKey: process.env.LLM_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.LLM_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: loadPrompt(PROMPT_VERSION) },
      { role: 'user', content: JSON.stringify({ text: input.data.text }) }
    ]
  });
  return res.status(200).json({ stage_2_raw_model_text: response.choices[0].message.content });
});

module.exports = router;
