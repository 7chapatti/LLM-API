const fs = require('fs');
const path = require('path');
function loadPrompt(version) {
  return fs.readFileSync(path.join(__dirname, '..', '..', 'prompts', `${version}.md`), 'utf8');
}
module.exports = { loadPrompt };
