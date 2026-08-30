const express = require('express');
const router = express.Router();

const { TriageInput, TriageOutput } = require('../llm/schema');
const { loadPrompt } = require('../llm/promptLoader');
const { extractJson } = require('../llm/parseJson');
const { withRetry } = require('../llm/retry');
const { logCall, quarantine } = require('../llm/costLog');
const { createClient } = require('../llm/client');

const PROMPT_VERSION = 'triage-v1';

const STUB_RESPONSE = {
  category: 'other',
  urgency: 'low',
  confidence: 0.4,
  reason: 'Stub mode response — no model was called.'
};

async function callModel(client, systemPrompt, userText) {
  const start = Date.now();
  const res = await withRetry(() =>
    client.chat.completions.create({
      model: process.env.LLM_MODEL,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify({ text: userText }) }
      ]
    })
  );
  return {
    content: res.choices[0].message.content,
    durationMs: Date.now() - start,
    usage: res.usage || {}
  };
}

router.post('/triage', async (req, res) => {
  // Stage 1: validate input before spending anything
  const parsedInput = TriageInput.safeParse(req.body);
  if (!parsedInput.success) {
    const issue = parsedInput.error.issues[0];
    return res.status(400).json({ error: `Invalid input: ${issue.path.join('.') || 'body'} — ${issue.message}` });
  }
  const { text } = parsedInput.data;

  // Kill switch: skip the model, return a safe deterministic fallback
  if (process.env.LLM_ENABLED === 'false') {
    return res.status(503).json({ error: 'AI triage is temporarily disabled', fallback: STUB_RESPONSE });
  }

  // Stub mode: build/test without spending a call
  if (process.env.LLM_STUB === '1') {
    return res.status(200).json(STUB_RESPONSE);
  }

  const systemPrompt = loadPrompt(PROMPT_VERSION);
  const client = createClient();

  let output = null;
  let repaired = false;
  let rawOutput = null;
  let lastError = null;
  let usage = {};
  let totalDuration = 0;

  try {
    const first = await callModel(client, systemPrompt, text);
    totalDuration += first.durationMs;
    usage = first.usage;
    rawOutput = first.content;

    const firstJson = extractJson(first.content);
    const firstValidated = firstJson
      ? TriageOutput.safeParse(firstJson)
      : { success: false, error: { issues: [{ message: 'no JSON object found in model output' }] } };

    if (firstValidated.success) {
      output = firstValidated.data;
    } else {
      lastError = firstValidated.error.issues.map((i) => i.message).join('; ');
      repaired = true;

      // Repair retry — exactly once. Hand the model its own broken output and the error.
      const repairPrompt =
        `${systemPrompt}\n\n---\nYour previous answer was rejected for this reason: ${lastError}\n` +
        `Previous answer: ${first.content}\nReturn only corrected JSON matching the schema above.`;

      const second = await callModel(client, repairPrompt, text);
      totalDuration += second.durationMs;
      usage = second.usage;
      rawOutput = second.content;

      const secondJson = extractJson(second.content);
      const secondValidated = secondJson
        ? TriageOutput.safeParse(secondJson)
        : { success: false, error: { issues: [{ message: 'no JSON object found in repaired output' }] } };

      if (secondValidated.success) {
        output = secondValidated.data;
      } else {
        lastError = secondValidated.error.issues.map((i) => i.message).join('; ');
      }
    }
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    if (status === 401 || status === 403) {
      return res.status(502).json({ error: 'Upstream auth error — check LLM_API_KEY' });
    }
    if (err?.name === 'APIConnectionTimeoutError' || err?.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'Model call timed out' });
    }
    return res.status(502).json({ error: 'Upstream model call failed' });
  }

  logCall({
    promptVersion: PROMPT_VERSION,
    model: process.env.LLM_MODEL,
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    durationMs: totalDuration,
    repaired
  });

  // Never return raw model text — schema or nothing
  if (!output) {
    quarantine({ input: text, promptVersion: PROMPT_VERSION, rawOutput, error: lastError });
    return res.status(422).json({ error: 'Model could not produce a valid response after one repair attempt' });
  }

  return res.status(200).json(output);
});

module.exports = router;
