require('dotenv').config();
const { createClient } = require('./client');

async function main() {
  const client = createClient();
  const res = await client.chat.completions.create({
    model: process.env.LLM_MODEL,
    messages: [{ role: 'user', content: 'Reply with exactly the word: ready' }]
  });
  console.log(res.choices[0].message.content);
}

main().catch((err) => {
  console.error('hello.js failed:', err.message);
  process.exit(1);
});
