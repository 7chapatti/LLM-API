function logCall({ promptVersion, model, usage, durationMs, repaired }) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(), event: 'llm_call', prompt_version: promptVersion,
    model, input_tokens: usage?.prompt_tokens ?? null,
    output_tokens: usage?.completion_tokens ?? null, duration_ms: durationMs, repaired
  }));
}
module.exports = { logCall };
