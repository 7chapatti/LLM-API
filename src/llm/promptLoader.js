const fs = require('fs');
const path = require('path');

function loadPrompt(name) {
  const filePath = path.join(__dirname, '..', '..', 'prompts', `${name}.md`);
  return fs.readFileSync(filePath, 'utf-8');
}

module.exports = { loadPrompt };
