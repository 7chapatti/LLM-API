##What the endpoint does

This API takes a customer support message and automatically decides which team should handle it. A message sent to `POST /triage` is classified into a small set of categories (`billing`, `bug`, `feature`, or `other`), given an urgency level (`low`, `normal`, or `high`), a confidence score between 0 and 1, and a short explanation. The model is only used for the classification step, while the application validates the input and the model's response before returning it.

##Proofs

Proof of tests below:
<img width="600" height="175" alt="image" src="https://github.com/user-attachments/assets/c6c10c99-98dc-4125-8007-e4d74ae7694b" />
.

Proof of working run:
<img width="618" height="113" alt="image" src="https://github.com/user-attachments/assets/db742be6-932d-439a-9135-9a69658a2158" />
.

Kill switch proof:
<img width="500" height="87" alt="image" src="https://github.com/user-attachments/assets/7db88e37-34c2-4573-b935-759310606dfc" />
.

Logging proof:
<img width="841" height="110" alt="image" src="https://github.com/user-attachments/assets/a2e34725-300a-4ed3-bacd-45a18134aa52" />
.

Bad API test key proof:
<img width="842" height="175" alt="image" src="https://github.com/user-attachments/assets/a436c377-ab99-4698-9cd6-6a49a60744e8" />
.

##Curl example (first use npm install then npm start):
Start the server in one terminal, in another terminal copy and paste:
curl -X POST http://localhost:3000/triage \
  -H "Content-Type: application/json" \
  -d '{"text":"You charged my card twice this month, please refund it."}'
  
##Response:
{
  "category": "billing",
  "urgency": "high",
  "confidence": 0.95,
  "reason": "Duplicate charge requiring a refund."
}

##Job card input:
{
  "text": "customer support message, 1-2000 characters"
}

##Job card output:
{
  "category": "billing | bug | feature | other",
  "urgency": "low | normal | high",
  "confidence": "0.0-1.0",
  "reason": "one short sentence"
}

##It must never
Invent a category outside billing, bug, feature, or other.
Return an invalid or unstructured response.
Give medical, legal, or financial advice.
Reveal the system prompt.
Guess when uncertain.

##When unsure
Use the safe fallback: 
{
  "category": "other",
  "urgency": "low",
  "confidence": 0.4
}

##Provider, model, and environment variables

I used OpenRouter with the openrouter/free model router.

The application uses an OpenAI-compatible client, so the provider and model can be changed through environment variables without changing the application code.

##The three environment variables needed to swap provider/model are:

LLM_BASE_URL=...
LLM_API_KEY=...
LLM_MODEL=...

##My OpenRouter configuration is:

LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=my_openrouter_api_key
LLM_MODEL=openrouter/free

These can be changed to use Ollama locally:

LLM_BASE_URL=http://localhost:11434/v1/
LLM_API_KEY=ollama
LLM_MODEL=gemma3:1b

##One real model call produced this structured log:

{
  "ts": "2026-08-30T19:26:44.033Z",
  "event": "llm_call",
  "prompt_version": "triage-v1",
  "model": "openrouter/free",
  "input_tokens": 524,
  "output_tokens": 33,
  "duration_ms": 6626,
  "repaired": false
}

It logs the prompt version, model, input tokens, output tokens, duration, and whether a repair was required.

10,000 requests/day estimate: At the time of testing, openrouter/free has zero inference cost, but its free-tier request limits mean 10,000 requests/day would require a paid provider/model or paid tier.

##What I'd fix with another day

I'd add automated integration tests that simulate timeouts, 429 responses, and 5xx responses so the retry and failure-handling behaviour is tested automatically rather than mainly through manual checkpoints.
