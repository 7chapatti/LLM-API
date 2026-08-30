const fs = require('fs');
const path = require('path');

function quarantine({ input, promptVersion, rawOutput, error }) {
  const directory = path.join(__dirname, '..', '..', 'logs');
  fs.mkdirSync(directory, { recursive: true });
  fs.appendFileSync(path.join(directory, 'quarantine.jsonl'), JSON.stringify({
    ts: new Date().toISOString(), input, prompt_version: promptVersion, raw_output: rawOutput, error
  }) + '\n');
}
module.exports = { quarantine };
