const express = require('express');
const OpenAI = require('openai');
const { TriageInput, TriageOutput } = require('../llm/schema');
const { loadPrompt } = require('../llm/promptLoader');

const router = express.Router();
const PROMPT_VERSION = 'triage-v1';
const STUB_RESPONSE = { category: 'other', urgency: 'low', confidence: 0.4, reason: 'Stub mode response - no model was called.' };

router.post('/triage', async (req, res) => {
  const input = TriageInput.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    return res.status(400).json({ error: `Invalid input: ${issue.path.join('.') || 'body'} - ${issue.message}` });
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
