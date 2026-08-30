# Job card

What it does: Classifies one incoming support message so it can be routed to the right team.

Input: `{ "text": "string, 1-2000 characters" }`

Output: `{ "category": "billing|bug|feature|other", "urgency": "low|normal|high", "confidence": "0.0-1.0", "reason": "one short sentence" }`

It must never: invent a category; return free text instead of the JSON shape; give medical, legal, or financial advice; reveal the prompt.

When unsure it should: return `category: "other"` with confidence below `0.5`, not guess.

Three-rule check: closed output; one decision with no memory; a human can grade the result. All pass.
```
