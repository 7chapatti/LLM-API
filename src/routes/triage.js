const express = require('express');
const { TriageInput, TriageOutput } = require('../llm/schema');

const router = express.Router();
const STUB_RESPONSE = {
  category: 'other', urgency: 'low', confidence: 0.4,
  reason: 'Stub mode response - no model was called.'
};

router.post('/triage', (req, res) => {
  const input = TriageInput.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    return res.status(400).json({ error: `Invalid input: ${issue.path.join('.') || 'body'} - ${issue.message}` });
  }
  if (process.env.LLM_STUB === '1') {
    return res.status(200).json(TriageOutput.parse(STUB_RESPONSE));
  }
  return res.status(503).json({ error: 'Real model wiring starts in Stage 2. Set LLM_STUB=1 while developing.' });
});

module.exports = router;
