const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

function logCall({ promptVersion, model, inputTokens, outputTokens, durationMs, repaired }) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    event: 'llm_call',
    prompt_version: promptVersion,
    model,
    input_tokens: inputTokens ?? null,
    output_tokens: outputTokens ?? null,
    duration_ms: durationMs,
    repaired: !!repaired
  }));
}

function quarantine({ input, promptVersion, rawOutput, error }) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    input,
    prompt_version: promptVersion,
    raw_output: rawOutput,
    error
  });
  fs.appendFileSync(path.join(LOG_DIR, 'quarantine.jsonl'), line + '\n');
}

module.exports = { logCall, quarantine };
